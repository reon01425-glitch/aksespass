export const VALID_AUTH_REASONS = {
  "sesi-berakhir": "Sesi Anda berakhir. Silakan masuk lagi.",
} as const;

export type AuthReasonKey = keyof typeof VALID_AUTH_REASONS;

/**
 * Mengembalikan teks pesan peringatan bila kode alasan terdaftar pada daftar tetap.
 * Menghasilkan null bila alasan kosong atau tidak dikenal (teks tidak pernah diambil dari URL).
 */
export function getAuthReasonMessage(
  reason: string | null | undefined
): string | null {
  if (!reason) return null;
  if (Object.prototype.hasOwnProperty.call(VALID_AUTH_REASONS, reason)) {
    return VALID_AUTH_REASONS[reason as AuthReasonKey];
  }
  return null;
}
