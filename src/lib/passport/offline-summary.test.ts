import { describe, expect, it } from "vitest";
import {
  buildOfflineSummary,
  parseOfflineSummary,
  type BuildOfflineSummaryInput,
} from "./offline-summary";

const base: BuildOfflineSummaryInput = {
  preferredName: " Ani ",
  needs: [
    { code: "a", label: "Komunikasi dengan BISINDO", categoryLabel: "Komunikasi" },
    { code: "b", label: "Pengguna Kursi Roda", categoryLabel: "Mobilitas" },
  ],
  note: "  Bicara pelan  ",
  selection: "all",
  includeNote: false,
  textSize: "150",
  contrast: "high",
  savedAt: "2026-10-15T06:00:00.000Z",
  syncedAt: "2026-10-15T06:00:00.000Z",
};

describe("Ringkasan offline dan kartu cetak (src/lib/passport/offline-summary)", () => {
  it("memuat semua kebutuhan bila pilihan 'all' dan merapikan nama", () => {
    const s = buildOfflineSummary(base);
    expect(s.preferredName).toBe("Ani");
    expect(s.needs.map((n) => n.label)).toEqual([
      "Komunikasi dengan BISINDO",
      "Pengguna Kursi Roda",
    ]);
  });

  it("hanya memuat kebutuhan yang dipilih", () => {
    const s = buildOfflineSummary({ ...base, selection: ["b"] });
    expect(s.needs).toEqual([
      { label: "Pengguna Kursi Roda", categoryLabel: "Mobilitas" },
    ]);
  });

  it("catatan hanya ikut bila diizinkan dan tidak kosong", () => {
    expect(buildOfflineSummary(base).note).toBeNull();
    expect(buildOfflineSummary({ ...base, includeNote: true }).note).toBe(
      "Bicara pelan"
    );
    expect(
      buildOfflineSummary({ ...base, includeNote: true, note: "   " }).note
    ).toBeNull();
  });

  it("tidak memuat kode kebutuhan, token, atau data QR dalam hasil", () => {
    const json = JSON.stringify(buildOfflineSummary(base));
    expect(json).not.toMatch(/token|qr|"code"/i);
    expect(Object.keys(buildOfflineSummary(base)).sort()).toEqual(
      [
        "cardCode",
        "contrast",
        "includeNote",
        "needs",
        "note",
        "preferredName",
        "savedAt",
        "selection",
        "syncedAt",
        "textSize",
        "version",
      ].sort()
    );
  });

  it("Kode Kartu ikut tersimpan, bernilai null bila tidak ada, dan data lama tanpa kunci tetap terbaca", () => {
    expect(buildOfflineSummary(base).cardCode).toBeNull();
    const withCode = buildOfflineSummary({ ...base, cardCode: "ABCD2345" });
    expect(withCode.cardCode).toBe("ABCD2345");
    expect(parseOfflineSummary(JSON.stringify(withCode))?.cardCode).toBe("ABCD2345");
    const { cardCode: _drop, ...legacy } = withCode;
    void _drop;
    expect(parseOfflineSummary(JSON.stringify(legacy))?.cardCode).toBeNull();
    expect(parseOfflineSummary(JSON.stringify({ ...withCode, cardCode: 5 }))).toBeNull();
  });

  it("serialisasi lalu parse mengembalikan isi yang sama", () => {
    const s = buildOfflineSummary({ ...base, selection: ["a"], includeNote: true });
    expect(parseOfflineSummary(JSON.stringify(s))).toEqual(s);
  });

  it("parse menolak data rusak atau versi asing", () => {
    const s = buildOfflineSummary(base);
    expect(parseOfflineSummary(null)).toBeNull();
    expect(parseOfflineSummary("bukan-json")).toBeNull();
    expect(parseOfflineSummary("[]")).toBeNull();
    expect(parseOfflineSummary(JSON.stringify({ ...s, version: 2 }))).toBeNull();
    expect(parseOfflineSummary(JSON.stringify({ ...s, textSize: "300" }))).toBeNull();
    expect(parseOfflineSummary(JSON.stringify({ ...s, needs: [{ label: 1 }] }))).toBeNull();
    expect(parseOfflineSummary(JSON.stringify({ ...s, selection: [1] }))).toBeNull();
  });
});
