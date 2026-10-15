/**
 * Ringkasan kebutuhan untuk kartu cetak (P7) dan tampilan offline (P8).
 *
 * Disimpan di perangkat pasien (localStorage) dalam SATU slot tetap, karena
 * halaman offline statis tidak tahu siapa penggunanya saat tidak ada sinyal.
 * Hanya berisi ringkasan teks kebutuhan dan Kode Kartu pasien (identitas jalur kartu cetak [T4b],
 * bukan token atau data QR). TIDAK pernah memuat token atau data QR.
 * Dihapus saat pasien keluar atau memilih "Hapus dari perangkat".
 * Kunci yang sama dibaca oleh public/offline.html.
 */
export const OFFLINE_SUMMARY_KEY = "aksespass:offline-summary:v1";

export type OfflineTextSize = "100" | "150" | "200";
export type OfflineContrast = "standard" | "high";

export interface OfflineSummaryNeed {
  label: string;
  categoryLabel: string;
}

export interface OfflineSummary {
  version: 1;
  preferredName: string;
  needs: OfflineSummaryNeed[];
  /** Catatan pribadi; null bila tidak disertakan. */
  note: string | null;
  /** Pilihan isi kartu: semua kebutuhan, atau daftar kode tertentu. */
  selection: "all" | string[];
  includeNote: boolean;
  /** Kode Kartu 8 karakter agar petugas dapat memakainya di T4b walau tanpa sinyal; null bila belum ada. */
  cardCode: string | null;
  textSize: OfflineTextSize;
  contrast: OfflineContrast;
  savedAt: string;
  /** Terakhir kali isinya dicocokkan dengan paspor di server. */
  syncedAt: string;
}

export interface OfflineSourceNeed {
  code: string;
  label: string;
  categoryLabel: string;
}

export interface BuildOfflineSummaryInput {
  preferredName: string;
  /** Semua kebutuhan di paspor saat ini, sudah berurutan sesuai katalog. */
  needs: OfflineSourceNeed[];
  note: string | null;
  selection: "all" | string[];
  includeNote: boolean;
  cardCode?: string | null;
  textSize: OfflineTextSize;
  contrast: OfflineContrast;
  savedAt: string;
  syncedAt: string;
}

export function buildOfflineSummary(
  input: BuildOfflineSummaryInput
): OfflineSummary {
  const chosen =
    input.selection === "all"
      ? input.needs
      : input.needs.filter((need) =>
          (input.selection as string[]).includes(need.code)
        );
  const note = input.note?.trim() ?? "";
  return {
    version: 1,
    preferredName: input.preferredName.trim(),
    needs: chosen.map(({ label, categoryLabel }) => ({ label, categoryLabel })),
    note: input.includeNote && note ? note : null,
    selection: input.selection,
    includeNote: input.includeNote,
    cardCode: input.cardCode ?? null,
    textSize: input.textSize,
    contrast: input.contrast,
    savedAt: input.savedAt,
    syncedAt: input.syncedAt,
  };
}

const TEXT_SIZES: readonly string[] = ["100", "150", "200"];
const CONTRASTS: readonly string[] = ["standard", "high"];

export function parseOfflineSummary(
  raw: string | null | undefined
): OfflineSummary | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const o = value as Record<string, unknown>;
    if (
      o.version !== 1 ||
      typeof o.preferredName !== "string" ||
      !Array.isArray(o.needs) ||
      !o.needs.every(
        (n) =>
          n &&
          typeof n === "object" &&
          typeof (n as Record<string, unknown>).label === "string" &&
          typeof (n as Record<string, unknown>).categoryLabel === "string"
      ) ||
      !(o.note === null || typeof o.note === "string") ||
      !(
        o.selection === "all" ||
        (Array.isArray(o.selection) &&
          o.selection.every((c) => typeof c === "string"))
      ) ||
      typeof o.includeNote !== "boolean" ||
      !(o.cardCode === undefined || o.cardCode === null || typeof o.cardCode === "string") ||
      typeof o.textSize !== "string" ||
      !TEXT_SIZES.includes(o.textSize) ||
      typeof o.contrast !== "string" ||
      !CONTRASTS.includes(o.contrast) ||
      typeof o.savedAt !== "string" ||
      typeof o.syncedAt !== "string"
    ) {
      return null;
    }
    return {
      version: 1,
      preferredName: o.preferredName,
      needs: (o.needs as OfflineSummaryNeed[]).map((n) => ({
        label: n.label,
        categoryLabel: n.categoryLabel,
      })),
      note: o.note as string | null,
      selection: o.selection as "all" | string[],
      includeNote: o.includeNote,
      cardCode: typeof o.cardCode === "string" ? o.cardCode : null,
      textSize: o.textSize as OfflineTextSize,
      contrast: o.contrast as OfflineContrast,
      savedAt: o.savedAt,
      syncedAt: o.syncedAt,
    };
  } catch {
    return null;
  }
}

export function loadOfflineSummary(): OfflineSummary | null {
  try {
    return parseOfflineSummary(window.localStorage.getItem(OFFLINE_SUMMARY_KEY));
  } catch {
    return null;
  }
}

/** Mengembalikan false bila penyimpanan penuh atau dinonaktifkan. */
export function saveOfflineSummary(summary: OfflineSummary): boolean {
  try {
    window.localStorage.setItem(OFFLINE_SUMMARY_KEY, JSON.stringify(summary));
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineSummary(): void {
  try {
    window.localStorage.removeItem(OFFLINE_SUMMARY_KEY);
  } catch {
    // abaikan
  }
}

/**
 * Bila pasien sudah pernah menyimpan ringkasan offline, cocokkan isinya dengan
 * paspor terbaru (mis. setelah paspor diubah). Tidak membuat ringkasan baru.
 * Mengembalikan true bila ringkasan diperbarui.
 */
export function refreshOfflineSummary(source: {
  preferredName: string;
  needs: OfflineSourceNeed[];
  note: string | null;
}): boolean {
  const existing = loadOfflineSummary();
  if (!existing) return false;
  const next = buildOfflineSummary({
    preferredName: source.preferredName,
    needs: source.needs,
    note: source.note,
    selection: existing.selection,
    includeNote: existing.includeNote,
    cardCode: existing.cardCode,
    textSize: existing.textSize,
    contrast: existing.contrast,
    savedAt: existing.savedAt,
    syncedAt: new Date().toISOString(),
  });
  return saveOfflineSummary(next);
}
