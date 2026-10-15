/**
 * Draft paspor di perangkat (P5). Disimpan di localStorage per pengguna,
 * tidak pernah dikirim ke server, dan tidak dapat dibagikan lewat QR.
 */
import {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "./constants";

export const PASSPORT_DRAFT_KEY_PREFIX = "aksespass:passport-draft:v1:";

export interface PassportDraft {
  preferredName: string;
  needCodes: string[];
  patientNote: string;
  /** Indeks langkah editor terakhir (mulai 0). */
  step: number;
  updatedAt: string;
}

export function passportDraftKey(ownerId: string): string {
  return `${PASSPORT_DRAFT_KEY_PREFIX}${ownerId}`;
}

export function serializePassportDraft(draft: PassportDraft): string {
  return JSON.stringify(draft);
}

/**
 * Membaca draft dari string mentah. Mengembalikan null bila rusak atau
 * bentuknya tidak sesuai. Kode kebutuhan yang tidak ada di katalog dibuang.
 */
export function parsePassportDraft(
  raw: string | null | undefined,
  validCodes?: ReadonlySet<string>
): PassportDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.preferredName !== "string" ||
      typeof obj.patientNote !== "string" ||
      !Array.isArray(obj.needCodes) ||
      !obj.needCodes.every((code) => typeof code === "string") ||
      typeof obj.step !== "number" ||
      !Number.isInteger(obj.step) ||
      obj.step < 0 ||
      typeof obj.updatedAt !== "string"
    ) {
      return null;
    }
    const codes = (obj.needCodes as string[]).filter(
      (code) => !validCodes || validCodes.has(code)
    );
    return {
      preferredName: obj.preferredName.slice(
        0,
        PATIENT_PREFERRED_NAME_MAX_LENGTH
      ),
      patientNote: obj.patientNote.slice(0, PATIENT_NOTE_MAX_LENGTH),
      needCodes: Array.from(new Set(codes)),
      step: obj.step,
      updatedAt: obj.updatedAt,
    };
  } catch {
    return null;
  }
}

/** Draft dianggap kosong bila belum ada isi yang berarti. */
export function isPassportDraftEmpty(draft: PassportDraft): boolean {
  return (
    draft.preferredName.trim() === "" &&
    draft.patientNote.trim() === "" &&
    draft.needCodes.length === 0
  );
}

/** Apakah isi draft sama dengan nilai yang sudah tersimpan di server. */
export function isDraftSameAsSaved(
  draft: Pick<PassportDraft, "preferredName" | "needCodes" | "patientNote">,
  saved: { preferredName: string; needCodes: readonly string[]; patientNote: string }
): boolean {
  if (
    draft.preferredName.trim() !== saved.preferredName.trim() ||
    draft.patientNote.trim() !== saved.patientNote.trim() ||
    draft.needCodes.length !== saved.needCodes.length
  ) {
    return false;
  }
  const savedSet = new Set(saved.needCodes);
  return draft.needCodes.every((code) => savedSet.has(code));
}

/** Membaca draft milik pengguna dari localStorage. Aman bila storage tidak tersedia. */
export function loadPassportDraft(
  ownerId: string,
  validCodes?: ReadonlySet<string>
): PassportDraft | null {
  try {
    return parsePassportDraft(
      window.localStorage.getItem(passportDraftKey(ownerId)),
      validCodes
    );
  } catch {
    return null;
  }
}

export function savePassportDraft(ownerId: string, draft: PassportDraft): void {
  try {
    window.localStorage.setItem(
      passportDraftKey(ownerId),
      serializePassportDraft(draft)
    );
  } catch {
    // Storage penuh atau dinonaktifkan: draft tidak tersimpan, formulir tetap jalan.
  }
}

export function clearPassportDraft(ownerId: string): void {
  try {
    window.localStorage.removeItem(passportDraftKey(ownerId));
  } catch {
    // abaikan
  }
}

/** Menghapus draft semua pengguna di perangkat ini (dipakai saat keluar). */
export function clearAllPassportDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PASSPORT_DRAFT_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // abaikan
  }
}
