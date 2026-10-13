export const NEED_CATEGORIES = [
  "komunikasi",
  "penglihatan",
  "pendengaran",
  "mobilitas",
  "sensorik_lingkungan",
  "pendampingan",
] as const;

export type NeedCategory = (typeof NEED_CATEGORIES)[number];

export const CONSENT_SHARED_FIELDS = [
  ...NEED_CATEGORIES,
  "catatan_pasien",
] as const;

export type ConsentSharedField = (typeof CONSENT_SHARED_FIELDS)[number];

export const ALLOWED_SHARED_FIELDS = [
  ...NEED_CATEGORIES,
  "catatan_pasien",
  "nama_panggilan",
  "preferred_name",
] as const;

export type AllowedSharedField = (typeof ALLOWED_SHARED_FIELDS)[number];

export function isAllowedSharedField(field: string): field is AllowedSharedField {
  return (ALLOWED_SHARED_FIELDS as readonly string[]).includes(field);
}

/**
 * Menormalkan nama field untuk penyimpanan audit log di PostgreSQL.
 * Kolom/array database menggunakan 'preferred_name' untuk nama panggilan pasien.
 */
export function normalizeAuditField(field: AllowedSharedField): string {
  if (field === "nama_panggilan") {
    return "preferred_name";
  }
  return field;
}
