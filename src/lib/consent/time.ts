/**
 * src/lib/consent/time.ts
 * Helper utilitas murni untuk pemformatan waktu WIB, hitung mundur masa berlaku ConsentQR,
 * dan penyelesaian field bawaan.
 */

/**
 * Memformat objek Date ke string jam WIB (UTC+7):
 * Contoh: "14:35 WIB" atau "23:59 WIB"
 */
export function formatTimeWib(date: Date): string {
  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const hours = String(wibDate.getUTCHours()).padStart(2, "0");
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes} WIB`;
}

const BULAN_WIB = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Memformat objek Date ke string tanggal dan jam WIB (UTC+7):
 * Contoh: "13 Okt 2026, 14:35 WIB"
 */
export function formatDateTimeWib(date: Date): string {
  const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const day = wibDate.getUTCDate();
  const month = BULAN_WIB[wibDate.getUTCMonth()];
  const year = wibDate.getUTCFullYear();
  const hours = String(wibDate.getUTCHours()).padStart(2, "0");
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}


/**
 * Menghitung dan memformat sisa waktu dalam bahasa Indonesia:
 * - diff <= 0: "sudah kedaluwarsa"
 * - < 60 menit: "sisa X menit"
 * - >= 60 menit bulat: "sisa X jam"
 * - >= 60 menit pecahan: "sisa X jam Y menit"
 */
export function formatRemainingTime(
  expiresAt: Date,
  now: Date = new Date()
): string {
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "sudah kedaluwarsa";
  }

  // Gunakan floor menit untuk konsistensi sisa menit
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  if (totalMinutes === 0) {
    return "sisa kurang dari 1 menit";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    if (minutes === 0) {
      return `sisa ${hours} jam`;
    }
    return `sisa ${hours} jam ${minutes} menit`;
  }

  return `sisa ${totalMinutes} menit`;
}

/**
 * Memformat teks lengkap masa berlaku:
 * Contoh: "Berlaku sampai 14:35 WIB (sisa 52 menit)"
 */
export function formatExpiryText(
  expiresAt: Date,
  now: Date = new Date()
): string {
  const timeStr = formatTimeWib(expiresAt);
  const remainingStr = formatRemainingTime(expiresAt, now);

  if (remainingStr === "sudah kedaluwarsa") {
    return `Kedaluwarsa pada ${timeStr}`;
  }

  return `Berlaku sampai ${timeStr} (${remainingStr})`;
}

/**
 * Memeriksa status kedaluwarsa:
 * - isExpired: now >= expiresAt
 * - isExpiringSoon: sisa waktu <= 15 menit dan belum kedaluwarsa
 */
export function getExpiryStatus(
  expiresAt: Date,
  now: Date = new Date()
): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  remainingMinutes: number;
} {
  const diffMs = expiresAt.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  const isExpired = diffMs <= 0;
  const isExpiringSoon = !isExpired && remainingMinutes <= 15;

  return {
    isExpired,
    isExpiringSoon,
    remainingMinutes,
  };
}

export interface ResolveSharedFieldsInput {
  lastSharedFields?: readonly string[] | null;
  availableCategories: readonly string[];
  hasNote: boolean;
}

/**
 * Menentukan bawaan toggle ConsentQR [Usulan]:
 * - Bila ada consent terakhir: diiris dengan kategori yang benar-benar ada di paspor pasien
 *   dan "catatan_pasien" bila ada catatan.
 * - Bila belum pernah (atau irisan kosong): fallback ke semua aktif.
 */
export function resolveDefaultSharedFields({
  lastSharedFields,
  availableCategories,
  hasNote,
}: ResolveSharedFieldsInput): string[] {
  const allAvailable = [
    ...availableCategories,
    ...(hasNote ? ["catatan_pasien"] : []),
  ];

  if (!lastSharedFields || lastSharedFields.length === 0) {
    return allAvailable;
  }

  const intersected = lastSharedFields.filter((field) => {
    if (field === "catatan_pasien") {
      return hasNote;
    }
    return availableCategories.includes(field);
  });

  if (intersected.length === 0) {
    return allAvailable;
  }

  return intersected;
}

export type ConsentDuration =
  | "1 jam"
  | "hari ini"
  | "24 jam"
  | "1_hour"
  | "today"
  | "24_hours";

/**
 * Memformat token menjadi kelompok 4 karakter untuk kemudahan membaca / mengetik manual:
 * XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX
 */
export function formatTokenForDisplay(token: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < token.length; i += 4) {
    chunks.push(token.slice(i, i + 4));
  }
  return chunks.join("-");
}

/**
 * Membangun URL tujuan QR dengan token di dalam URL fragment (#).
 * Fungsi murni yang aman dijalankan di lingkungan klien maupun server.
 */
export function buildQrPayload(token: string, appOrigin: string = "http://localhost:3000"): string {
  return `${appOrigin}/s#${token}`;
}
