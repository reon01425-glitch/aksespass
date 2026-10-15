import { describe, expect, it } from "vitest";
import {
  isDraftSameAsSaved,
  isPassportDraftEmpty,
  parsePassportDraft,
  passportDraftKey,
  serializePassportDraft,
  type PassportDraft,
} from "./draft";
import {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "./constants";

const sample: PassportDraft = {
  preferredName: "Ani",
  needCodes: ["a", "b"],
  patientNote: "Bicara pelan",
  step: 2,
  updatedAt: "2026-10-15T05:00:00.000Z",
};

describe("Draft paspor di perangkat (src/lib/passport/draft)", () => {
  it("kunci penyimpanan terpisah per pengguna", () => {
    expect(passportDraftKey("u1")).not.toBe(passportDraftKey("u2"));
    expect(passportDraftKey("u1")).toContain("u1");
  });

  it("serialisasi lalu parse mengembalikan isi yang sama", () => {
    expect(parsePassportDraft(serializePassportDraft(sample))).toEqual(sample);
  });

  it("parse menolak data rusak atau bentuk salah", () => {
    expect(parsePassportDraft(null)).toBeNull();
    expect(parsePassportDraft("")).toBeNull();
    expect(parsePassportDraft("bukan-json")).toBeNull();
    expect(parsePassportDraft("[]")).toBeNull();
    expect(parsePassportDraft(JSON.stringify({ ...sample, step: -1 }))).toBeNull();
    expect(parsePassportDraft(JSON.stringify({ ...sample, step: 1.5 }))).toBeNull();
    expect(parsePassportDraft(JSON.stringify({ ...sample, needCodes: [1] }))).toBeNull();
    expect(parsePassportDraft(JSON.stringify({ ...sample, preferredName: 5 }))).toBeNull();
  });

  it("parse membuang kode di luar katalog dan duplikat", () => {
    const raw = JSON.stringify({ ...sample, needCodes: ["a", "x", "a", "b"] });
    expect(parsePassportDraft(raw, new Set(["a", "b"]))?.needCodes).toEqual(["a", "b"]);
  });

  it("parse memangkas teks yang melebihi batas", () => {
    const raw = JSON.stringify({
      ...sample,
      preferredName: "n".repeat(PATIENT_PREFERRED_NAME_MAX_LENGTH + 20),
      patientNote: "c".repeat(PATIENT_NOTE_MAX_LENGTH + 20),
    });
    const parsed = parsePassportDraft(raw);
    expect(parsed?.preferredName).toHaveLength(PATIENT_PREFERRED_NAME_MAX_LENGTH);
    expect(parsed?.patientNote).toHaveLength(PATIENT_NOTE_MAX_LENGTH);
  });

  it("draft kosong dikenali", () => {
    expect(
      isPassportDraftEmpty({ ...sample, preferredName: " ", patientNote: "", needCodes: [] })
    ).toBe(true);
    expect(isPassportDraftEmpty(sample)).toBe(false);
  });

  it("perbandingan dengan paspor tersimpan tidak peka urutan dan spasi pinggir", () => {
    const saved = { preferredName: " Ani ", needCodes: ["b", "a"], patientNote: "Bicara pelan " };
    expect(isDraftSameAsSaved(sample, saved)).toBe(true);
    expect(isDraftSameAsSaved({ ...sample, needCodes: ["a"] }, saved)).toBe(false);
    expect(isDraftSameAsSaved({ ...sample, patientNote: "lain" }, saved)).toBe(false);
  });
});
