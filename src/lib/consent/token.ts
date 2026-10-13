import crypto from "node:crypto";

/**
 * Alfabet Crockford Base32 (32 simbol, tanpa huruf ambigu I, L, O, U).
 * 0123456789ABCDEFGHJKMNPQRSTVWXYZ
 */
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCKFORD_REGEX = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/**
 * Meng-encode 16 byte (128 bit) acak kriptografis ke dalam 26 karakter Crockford Base32.
 * 128 bit / 5 bit per karakter = 25 karakter penuh + 1 karakter (3 bit + 2 bit padding 0).
 */
export function encodeCrockford128(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error("Token 128 bit memerlukan tepat 16 byte data biner.");
  }

  let chars = "";
  for (let i = 0; i < 26; i++) {
    const bitStart = i * 5;
    let val = 0;
    for (let b = 0; b < 5; b++) {
      const bitPos = bitStart + b;
      if (bitPos < 128) {
        const byteIdx = Math.floor(bitPos / 8);
        const bitIdx = 7 - (bitPos % 8);
        const bit = (bytes[byteIdx] >> bitIdx) & 1;
        val = (val << 1) | bit;
      } else {
        val = val << 1;
      }
    }
    chars += CROCKFORD_ALPHABET[val];
  }
  return chars;
}

/**
 * Menghasilkan token acak 128 bit (26 karakter Crockford Base32).
 */
export function generateConsentToken(): string {
  const bytes = crypto.randomBytes(16);
  return encodeCrockford128(bytes);
}

/**
 * Menghasilkan SHA-256 heksadesimal dari token untuk disimpan di tabel consent_qr.
 */
export function hashConsentToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Menormalkan input token dari kamera QR atau ketikan manual:
 * 1. Bila berupa URL, ambil fragmen setelah tanda pagar (#).
 * 2. Ubah ke huruf besar.
 * 3. Hapus spasi dan tanda hubung (-).
 * 4. Normalisasi karakter ambigu: O -> 0, I -> 1, L -> 1.
 * 5. Validasi panjang 26 karakter dan alfabet Crockford Base32.
 * Mengembalikan null bila salah format (diperlakukan sama dengan token tak dikenal).
 */
export function normalizeToken(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  let raw = input.trim();
  if (raw.includes("#")) {
    const parts = raw.split("#");
    raw = parts[parts.length - 1] ?? "";
  }

  let cleaned = raw.toUpperCase().replace(/[\s-]+/g, "");
  cleaned = cleaned.replace(/O/g, "0");
  cleaned = cleaned.replace(/[IL]/g, "1");

  if (!CROCKFORD_REGEX.test(cleaned)) {
    return null;
  }

  return cleaned;
}

import { buildQrPayload } from "./time";

export function buildConsentQrUrl(token: string, appOrigin?: string): string {
  return buildQrPayload(token, appOrigin);
}
