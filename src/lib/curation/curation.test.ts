import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createNewVersion,
  createRule,
  CurationError,
  discardDraft,
  getRuleVersion,
  listRuleHistory,
  listRuleLines,
  reviewRule,
  saveDraft,
  submitForReview,
} from "./index";
import { withContext } from "../../db";

const K1 = { userId: "22222222-2222-4222-8222-222222222501", role: "curator" };
const K2 = { userId: "22222222-2222-4222-8222-222222222502", role: "curator" };
const K3 = { userId: "22222222-2222-4222-8222-222222222503", role: "curator" };
const STAFF = { userId: "22222222-2222-4222-8222-222222222301", role: "staff" };

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}
async function sql<T>(q: string, p: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: adminUrl() });
  await c.connect();
  try {
    return (await c.query(q, p)).rows as T[];
  } finally {
    await c.end();
  }
}

const input = (text: string, need: string) => ({
  needCode: need,
  actionText: text,
  iconName: "Hand",
  rationale: "Masukan komunitas.",
  changeNote: "Catatan uji",
});

let need = "";
const created: string[] = [];

beforeAll(async () => {
  need = (await sql<{ code: string }>("SELECT code FROM needs_catalog ORDER BY sort_order LIMIT 1;"))[0].code;
});

afterAll(async () => {
  if (created.length) {
    await sql("DELETE FROM accommodation_rules WHERE rule_key = ANY($1::uuid[]);", [created]);
  }
});

describe("Kurasi aturan (K3-K6)", () => {
  it("hanya kurator; peran lain ditolak", async () => {
    await expect(listRuleLines(STAFF)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createRule(STAFF, input("x", need))).rejects.toBeInstanceOf(CurationError);
  });

  it("validasi masukan", async () => {
    await expect(createRule(K1, { ...input("", need) })).rejects.toMatchObject({ code: "ACTION_REQUIRED" });
    await expect(createRule(K1, { ...input("a", need), iconName: "Ngawur" })).rejects.toMatchObject({ code: "INVALID_ICON" });
    await expect(createRule(K1, { ...input("a", "tidak_ada") })).rejects.toMatchObject({ code: "INVALID_NEED" });
  });

  it("draf tidak dipakai engine; hanya penulis yang mengubah dan membuang", async () => {
    const { id } = await createRule(K1, input("Saran uji satu", need));
    const row = (await getRuleVersion(K1, id))!;
    created.push(row.ruleKey);
    expect(row.status).toBe("draft");
    await expect(saveDraft(K2, id, input("diubah orang lain", need))).rejects.toMatchObject({ code: "NOT_AUTHOR" });
    await saveDraft(K1, id, input("Saran uji satu (ubah)", need));
    expect((await getRuleVersion(K1, id))!.actionText).toBe("Saran uji satu (ubah)");
    await discardDraft(K1, id);
    expect(await getRuleVersion(K1, id)).toBeNull();
  });

  it("terbit butuh 2 peninjau berbeda; penulis tidak bisa meninjau; versi lama digantikan", async () => {
    const { id } = await createRule(K1, input("Saran uji dua", need));
    const v1 = (await getRuleVersion(K1, id))!;
    created.push(v1.ruleKey);
    await submitForReview(K1, id);
    await expect(saveDraft(K1, id, input("edit saat tinjauan", need))).rejects.toMatchObject({ code: "NOT_DRAFT" });
    await expect(reviewRule(K1, id, { decision: "approve" })).rejects.toMatchObject({ code: "OWN_RULE" });
    expect(await reviewRule(K2, id, { decision: "approve" })).toEqual({ outcome: "approved" });
    await expect(reviewRule(K2, id, { decision: "approve" })).rejects.toMatchObject({ code: "ALREADY_VOTED" });
    expect((await getRuleVersion(K1, id))!.status).toBe("in_review");
    expect(await reviewRule(K3, id, { decision: "approve" })).toEqual({ outcome: "published" });
    const pub = (await getRuleVersion(K1, id))!;
    expect(pub.status).toBe("published");
    expect(pub.approvedBy).toBe("Kurator Contoh 2, Kurator Contoh 3");

    // versi baru: draf v2, lalu terbit menggantikan v1
    const nv = await createNewVersion(K2, v1.ruleKey);
    await expect(createNewVersion(K3, v1.ruleKey)).rejects.toMatchObject({ code: "ALREADY_OPEN" });
    await saveDraft(K2, nv.id, input("Saran uji dua v2", need));
    await expect(submitForReview(K2, nv.id)).resolves.toBeUndefined();
    await reviewRule(K1, nv.id, { decision: "approve" });
    await reviewRule(K3, nv.id, { decision: "approve" });
    const history = await listRuleHistory(K1, v1.ruleKey);
    expect(history.map((h) => [h.version, h.status])).toEqual([[2, "published"], [1, "superseded"]]);
  });

  it("minta revisi mengembalikan ke draf dengan alasan, putaran berikutnya mulai dari nol", async () => {
    const { id } = await createRule(K1, input("Saran uji tiga", need));
    created.push((await getRuleVersion(K1, id))!.ruleKey);
    await submitForReview(K1, id);
    await expect(reviewRule(K2, id, { decision: "revise" })).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
    expect(await reviewRule(K2, id, { decision: "revise", note: "Perjelas kalimat" })).toEqual({ outcome: "revision_requested" });
    const back = (await getRuleVersion(K1, id))!;
    expect(back.status).toBe("draft");
    expect(back.revisionNote).toBe("Perjelas kalimat");
    await submitForReview(K1, id);
    const again = (await getRuleVersion(K1, id))!;
    expect(again.reviewRound).toBe(2);
    expect(again.approvals).toBe(0);
    expect(again.iVoted).toBe(false);
  });

  it("database menolak penerbitan lewat jalur pintas dan perubahan aturan terbit", async () => {
    const { id } = await createRule(K1, input("Saran uji empat", need));
    created.push((await getRuleVersion(K1, id))!.ruleKey);
    await submitForReview(K1, id);
    await expect(
      withContext({ userId: K1.userId, role: "curator" }, (tx) =>
        tx.query("UPDATE accommodation_rules SET status = 'published' WHERE id = $1;", [id])
      )
    ).rejects.toThrow(/2 peninjau/);
    await reviewRule(K2, id, { decision: "approve" });
    await reviewRule(K3, id, { decision: "approve" });
    await expect(
      withContext({ userId: K1.userId, role: "curator" }, (tx) =>
        tx.query("UPDATE accommodation_rules SET action_text = 'diubah diam-diam' WHERE id = $1;", [id])
      )
    ).rejects.toThrow(/tidak dapat diubah/);
    await expect(
      withContext({ userId: STAFF.userId, role: "staff" }, (tx) =>
        tx.query("UPDATE accommodation_rules SET action_text = 'x' WHERE id = $1;", [id])
      )
    ).resolves.toMatchObject({ rowCount: 0 });
  });
});
