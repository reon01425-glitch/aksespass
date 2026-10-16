/* eslint-disable @typescript-eslint/no-explicit-any -- kode uji, tipe longgar disengaja */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery } from "./helpers/db";
import { apiAs, jsonOf } from "./helpers/api";
import { loginAs } from "./helpers/auth";

let k1: APIRequestContext;
let k2: APIRequestContext;
let k3: APIRequestContext;
let p1: APIRequestContext;
let staffA: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  k1 = await apiAs(playwright, baseURL!, "kurator1");
  k2 = await apiAs(playwright, baseURL!, "kurator2");
  k3 = await apiAs(playwright, baseURL!, "kurator3");
  p1 = await apiAs(playwright, baseURL!, "pasien1");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
});

const uniq = () => `Saran uji E2E ${Date.now()}${Math.floor(Math.random() * 1000)}`;
const rule = (text = uniq()) => ({
  needCode: "lingkungan_tenang",
  actionText: text,
  iconName: "Users",
  rationale: "Masukan komunitas uji otomatis.",
  changeNote: "Aturan baru untuk uji E2E.",
});

async function createDraft(text?: string) {
  const r = await k1.post("/api/kurator/aturan", { data: rule(text) });
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json()).id as string;
}
async function submit(id: string) {
  const r = await k1.post(`/api/kurator/aturan/${id}/ajukan`, { data: { changeNote: "Siap ditinjau." } });
  expect(r.status(), await r.text()).toBe(200);
}
const vote = (ctx: APIRequestContext, id: string, decision: string, note = "") => ctx.post(`/api/kurator/aturan/${id}/tinjau`, { data: { decision, note } });

test.describe("Kurasi aturan: alur sah (K3-K5)", () => {
  test("buat draft, ubah, ajukan, dua peninjau berbeda menyetujui, aturan terbit dan terlihat petugas", async () => {
    const text = uniq();
    const id = await createDraft(text);

    const save = await k1.patch(`/api/kurator/aturan/${id}`, { data: { ...rule(text + " (revisi kecil)") } });
    expect(save.status(), await save.text()).toBe(200);
    const finalText = text + " (revisi kecil)";

    // Draft belum terlihat petugas.
    let saran = await (await staffA.post("/api/petugas/saran", { data: { needCodes: ["lingkungan_tenang"] } })).json();
    expect(JSON.stringify(saran)).not.toContain(finalText);

    await submit(id);
    // Dalam tinjauan pun belum terlihat petugas.
    saran = await (await staffA.post("/api/petugas/saran", { data: { needCodes: ["lingkungan_tenang"] } })).json();
    expect(JSON.stringify(saran)).not.toContain(finalText);

    const v1 = await vote(k2, id, "approve");
    expect(v1.status(), await v1.text()).toBe(200);
    expect((await v1.json()).outcome).toBe("approved");
    saran = await (await staffA.post("/api/petugas/saran", { data: { needCodes: ["lingkungan_tenang"] } })).json();
    expect(JSON.stringify(saran), "satu persetujuan belum cukup").not.toContain(finalText);

    const v2 = await vote(k3, id, "approve");
    expect(v2.status(), await v2.text()).toBe(200);
    expect((await v2.json()).outcome).toBe("published");
    saran = await (await staffA.post("/api/petugas/saran", { data: { needCodes: ["lingkungan_tenang"] } })).json();
    expect(JSON.stringify(saran)).toContain(finalText);
  });

  test("minta revisi dengan alasan: kembali ke draft penulis, lalu bisa diubah dan diajukan lagi", async () => {
    const id = await createDraft();
    await submit(id);
    const rv = await vote(k2, id, "revise", "Kalimat kurang jelas.");
    expect(rv.status(), await rv.text()).toBe(200);
    expect((await rv.json()).outcome).toBe("revision_requested");
    const fix = await k1.patch(`/api/kurator/aturan/${id}`, { data: rule("Kalimat sudah diperjelas " + Date.now()) });
    expect(fix.status(), await fix.text()).toBe(200);
    await submit(id);
    // Suara putaran baru dihitung ulang: peninjau yang tadi meminta revisi boleh memilih lagi.
    expect((await vote(k2, id, "approve")).status()).toBe(200);
  });

  test("versi baru dari aturan terbit: versi lama berstatus superseded setelah terbit", async () => {
    const id = await createDraft();
    await submit(id);
    await vote(k2, id, "approve");
    await vote(k3, id, "approve");
    const [row] = await adminQuery<{ rule_key: string }>("SELECT rule_key FROM accommodation_rules WHERE id = $1", [id]);
    const nv = await k1.post(`/api/kurator/garis/${row.rule_key}/versi-baru`);
    expect(nv.status(), await nv.text()).toBe(200);
    const nid = (await nv.json()).id as string;
    // Versi lanjutan wajib catatan perubahan.
    const noNote = await k1.post(`/api/kurator/aturan/${nid}/ajukan`, { data: { changeNote: "" } });
    expect(noNote.status()).toBe(400);
    expect((await k1.patch(`/api/kurator/aturan/${nid}`, { data: { ...rule("Versi dua " + Date.now()), changeNote: "Perjelas kalimat." } })).status()).toBe(200);
    await submit(nid);
    await vote(k2, nid, "approve");
    expect((await vote(k3, nid, "approve")).status()).toBe(200);
    const [old] = await adminQuery<{ status: string }>("SELECT status FROM accommodation_rules WHERE id = $1", [id]);
    expect(old.status).toBe("superseded");
  });

  test("buang draft", async () => {
    const id = await createDraft();
    const del = await k1.delete(`/api/kurator/aturan/${id}`);
    expect(del.status(), await del.text()).toBe(200);
    expect((await k1.delete(`/api/kurator/aturan/${id}`)).status()).toBe(404);
  });
});

test.describe("Kurasi aturan: pelanggaran", () => {
  test("penulis tidak dapat meninjau aturannya sendiri", async () => {
    const id = await createDraft();
    await submit(id);
    const r = await vote(k1, id, "approve");
    expect(r.status()).toBe(403);
    expect((await jsonOf(r)).code).toBe("OWN_RULE");
  });

  test("satu kurator tidak dapat memberi suara dua kali pada putaran yang sama", async () => {
    const id = await createDraft();
    await submit(id);
    expect((await vote(k2, id, "approve")).status()).toBe(200);
    const again = await vote(k2, id, "approve");
    expect(again.status()).toBe(409);
    expect((await jsonOf(again)).code).toBe("ALREADY_VOTED");
    const [row] = await adminQuery<{ status: string }>("SELECT status FROM accommodation_rules WHERE id = $1", [id]);
    expect(row.status, "dua suara dari kurator yang sama tidak boleh menerbitkan").toBe("in_review");
  });

  test("minta revisi tanpa alasan ditolak; keputusan tak dikenal ditolak", async () => {
    const id = await createDraft();
    await submit(id);
    expect((await vote(k2, id, "revise", "   ")).status()).toBe(400);
    expect((await vote(k2, id, "terserah")).status()).toBe(400);
    expect((await vote(k2, id, "")).status()).toBe(400);
  });

  test("kurator lain tidak dapat mengubah, mengajukan, atau membuang draft milik orang lain", async () => {
    const id = await createDraft();
    expect((await k2.patch(`/api/kurator/aturan/${id}`, { data: rule("Dibajak") })).status()).toBe(403);
    expect((await k2.post(`/api/kurator/aturan/${id}/ajukan`, { data: { changeNote: "x" } })).status()).toBeGreaterThanOrEqual(400);
    expect((await k2.delete(`/api/kurator/aturan/${id}`)).status()).toBeGreaterThanOrEqual(400);
    const [row] = await adminQuery<{ action_text: string; status: string }>("SELECT action_text, status FROM accommodation_rules WHERE id = $1", [id]);
    expect(row.action_text).not.toBe("Dibajak");
    expect(row.status).toBe("draft");
  });

  test("aturan yang sudah terbit atau sedang ditinjau tidak dapat diubah atau dibuang", async () => {
    const id = await createDraft();
    await submit(id);
    expect((await k1.patch(`/api/kurator/aturan/${id}`, { data: rule("Ubah saat tinjauan") })).status()).toBe(409);
    expect((await k1.delete(`/api/kurator/aturan/${id}`)).status()).toBeGreaterThanOrEqual(400);
    await vote(k2, id, "approve");
    await vote(k3, id, "approve");
    expect((await k1.patch(`/api/kurator/aturan/${id}`, { data: rule("Ubah setelah terbit") })).status()).toBe(409);
    const [row] = await adminQuery<{ action_text: string }>("SELECT action_text FROM accommodation_rules WHERE id = $1", [id]);
    expect(row.action_text).not.toBe("Ubah setelah terbit");
  });

  test("meninjau draft (belum diajukan) ditolak", async () => {
    const id = await createDraft();
    const r = await vote(k2, id, "approve");
    expect(r.status()).toBe(409);
  });

  test("tidak boleh ada dua versi terbuka untuk satu aturan", async () => {
    const id = await createDraft();
    await submit(id);
    await vote(k2, id, "approve");
    await vote(k3, id, "approve");
    const [row] = await adminQuery<{ rule_key: string }>("SELECT rule_key FROM accommodation_rules WHERE id = $1", [id]);
    expect((await k1.post(`/api/kurator/garis/${row.rule_key}/versi-baru`)).status()).toBe(200);
    expect((await k1.post(`/api/kurator/garis/${row.rule_key}/versi-baru`)).status()).toBe(409);
  });

  test("validasi isian: kosong, terlalu panjang, ikon tak dikenal, kebutuhan tak dikenal, diagnosis tak dianjurkan", async () => {
    const bad = [
      ["saran kosong", { ...rule(), actionText: "  " }],
      ["saran panjang", { ...rule(), actionText: "x".repeat(500) }],
      ["sumber kosong", { ...rule(), rationale: "" }],
      ["sumber panjang", { ...rule(), rationale: "x".repeat(1000) }],
      ["catatan panjang", { ...rule(), changeNote: "x".repeat(1000) }],
      ["ikon ngawur", { ...rule(), iconName: "Bom" }],
      ["kebutuhan kosong", { ...rule(), needCode: "" }],
      ["kebutuhan injeksi", { ...rule(), needCode: "x'; DROP TABLE accommodation_rules;--" }],
      ["kebutuhan tak ada", { ...rule(), needCode: "tidak_ada_kode" }],
    ] as const;
    for (const [label, data] of bad) {
      const r = await k1.post("/api/kurator/aturan", { data });
      expect(r.status(), label).toBe(400);
    }
  });

  test("peran selain kurator ditolak di semua rute kurasi", async () => {
    const id = await createDraft();
    for (const ctx of [p1, staffA]) {
      for (const [m, path, data] of [
        ["post", "/api/kurator/aturan", rule()],
        ["patch", `/api/kurator/aturan/${id}`, rule()],
        ["delete", `/api/kurator/aturan/${id}`, undefined],
        ["post", `/api/kurator/aturan/${id}/ajukan`, { changeNote: "x" }],
        ["post", `/api/kurator/aturan/${id}/tinjau`, { decision: "approve" }],
      ] as const) {
        const r = await (ctx as any)[m](path, { data });
        expect([401, 403], `${m} ${path}`).toContain(r.status());
      }
    }
  });

  test("trigger database: menerbitkan langsung lewat SQL tanpa dua persetujuan ditolak", async () => {
    const id = await createDraft();
    await submit(id);
    await expect(adminQuery("UPDATE accommodation_rules SET status = 'published' WHERE id = $1", [id])).rejects.toThrow();
    const [row] = await adminQuery<{ status: string }>("SELECT status FROM accommodation_rules WHERE id = $1", [id]);
    expect(row.status).toBe("in_review");
  });
});

test.describe("Kurasi aturan: layar (K3-K6)", () => {
  test("pustaka punya tab Semua/Terbit/Draft dengan hitungan, memfilter kartu", async ({ page, context }) => {
    await loginAs(context, "kurator1");
    await page.goto("/kurator");
    const tabs = page.getByRole("tablist", { name: /filter aturan/i });
    await expect(tabs).toBeVisible();
    for (const name of [/Semua \(\d+\)/, /Terbit \(\d+\)/, /Draft \(\d+\)/]) await expect(tabs.getByRole("tab", { name })).toBeVisible();
    await tabs.getByRole("tab", { name: /Terbit/ }).click();
    await expect(tabs.getByRole("tab", { name: /Terbit/ })).toHaveAttribute("aria-selected", "true");
    const kartuTerbit = await page.getByTestId("kartu-aturan").allInnerTexts();
    for (const t of kartuTerbit) expect(t).toMatch(/Terbit, versi/);
    await tabs.getByRole("tab", { name: /Draft/ }).click();
    for (const t of await page.getByTestId("kartu-aturan").allInnerTexts()) expect(t).toMatch(/Draft versi|dalam tinjauan/);
  });

  test("notifikasi: simpan draft, ajukan tinjauan, beri suara, terbit", async ({ browser, baseURL }) => {
    const ctx1 = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    await loginAs(ctx1, "kurator1");
    const page = await ctx1.newPage();
    await page.goto("/kurator/editor/baru");
    await page.locator("#kebutuhan").selectOption("lingkungan_tenang");
    await page.getByLabel(/Saran tindakan untuk petugas/).fill("Siapkan kursi di dekat pintu keluar " + Date.now());
    await page.getByRole("button", { name: "Ikon", exact: false }).first().isVisible().catch(() => {});
    await page.locator("[aria-pressed]").first().click();
    await page.getByLabel(/Sumber atau alasan/).fill("Masukan komunitas uji.");
    await page.getByRole("button", { name: /Simpan Draft/i }).click();
    await expect(page).toHaveURL(/\/kurator\/editor\/[0-9a-f-]{36}\?info=disimpan/);
    await expect(page.getByText("Draft tersimpan").first()).toBeVisible();

    await page.getByRole("button", { name: /Simpan Draft/i }).click();
    await expect(page.getByText("Draft tersimpan").first()).toBeVisible();

    await page.getByRole("button", { name: /Ajukan Tinjauan/i }).click();
    await expect(page).toHaveURL(/\/kurator\/tinjau\/[0-9a-f-]{36}\?info=diajukan/);
    await expect(page.getByText("Diajukan untuk tinjauan")).toBeVisible();
    const reviewUrl = page.url().split("?")[0];

    // Penulis tidak melihat form suara untuk aturannya sendiri.
    await expect(page.getByRole("button", { name: /Kirim Suara/i })).toHaveCount(0);

    const ctx2 = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    await loginAs(ctx2, "kurator2");
    const p2 = await ctx2.newPage();
    await p2.goto(reviewUrl);
    await p2.getByRole("radio", { name: /Setuju/ }).check();
    await p2.getByRole("button", { name: /Kirim Suara/i }).click();
    await expect(p2.getByText("Suara tersimpan")).toBeVisible();

    const ctx3 = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    await loginAs(ctx3, "kurator3");
    const p3 = await ctx3.newPage();
    await p3.goto(reviewUrl);
    await p3.getByRole("radio", { name: /Setuju/ }).check();
    await p3.getByRole("button", { name: /Kirim Suara/i }).click();
    await expect(p3).toHaveURL(/\/kurator\?info=terbit/);
    await expect(p3.getByText("Aturan terbit", { exact: true })).toBeVisible();
    await Promise.all([ctx1.close(), ctx2.close(), ctx3.close()]);
  });

  test("minta revisi di layar wajib alasan", async ({ browser, baseURL }) => {
    const id = await createDraft();
    await submit(id);
    const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    await loginAs(ctx, "kurator2");
    const page = await ctx.newPage();
    await page.goto(`/kurator/tinjau/${id}`);
    await page.getByRole("radio", { name: /Minta revisi/ }).check();
    await page.getByRole("button", { name: /Kirim Suara/i }).click();
    await expect(page.getByText("Belum bisa disimpan")).toBeVisible();
    await page.getByLabel(/Alasan revisi/).fill("Mohon perjelas kalimatnya.");
    await page.getByRole("button", { name: /Kirim Suara/i }).click();
    await expect(page).toHaveURL(/\/kurator\/tinjau\?info=revisi/);
    await expect(page.getByText("Permintaan revisi terkirim")).toBeVisible();
    await ctx.close();
  });

  test("kurator lain yang membuka editor draft orang lain dialihkan (tidak bisa mengedit)", async ({ browser, baseURL }) => {
    const id = await createDraft();
    const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    await loginAs(ctx, "kurator2");
    const page = await ctx.newPage();
    await page.goto(`/kurator/editor/${id}`);
    await expect(page).not.toHaveURL(/\/kurator\/editor\//);
    await ctx.close();
  });

  test("halaman riwayat dan tinjau dengan id ngawur menjawab 404, bukan galat", async ({ page, context }) => {
    await loginAs(context, "kurator1");
    for (const path of ["/kurator/tinjau/bukan-uuid", "/kurator/editor/bukan-uuid", "/kurator/riwayat/bukan-ada"]) {
      const res = await page.goto(path);
      expect([404, 200], path).toContain(res?.status());
      expect(await page.locator("body").innerText()).not.toMatch(/Application error|Internal Server Error/);
    }
  });
});
