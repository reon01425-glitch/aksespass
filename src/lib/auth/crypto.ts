import crypto from "node:crypto";

/**
 * Normalisasi nomor telepon Indonesia ke format E.164 (+628... / +62...).
 * Menolak format yang tidak valid.
 */
export function normalizePhoneNumber(raw: string): string {
  if (typeof raw !== "string") {
    throw new Error("Nomor telepon harus berupa teks.");
  }

  const clean = raw.trim().replace(/[\s\-()]/g, "");
  if (!clean) {
    throw new Error("Nomor telepon tidak boleh kosong.");
  }

  // Format +62...
  if (clean.startsWith("+62")) {
    if (/^\+62\d{8,14}$/.test(clean)) {
      return clean;
    }
    throw new Error(
      "Format nomor telepon tidak valid. Panjang digit setelah +62 tidak sesuai."
    );
  }

  // Format 62... (tanpa tanda tambah)
  if (clean.startsWith("62")) {
    if (/^62\d{8,14}$/.test(clean)) {
      return "+" + clean;
    }
    throw new Error(
      "Format nomor telepon tidak valid. Panjang digit setelah 62 tidak sesuai."
    );
  }

  // Format lokal 08...
  if (clean.startsWith("08")) {
    if (/^08\d{7,13}$/.test(clean)) {
      return "+62" + clean.slice(1);
    }
    throw new Error(
      "Format nomor telepon tidak valid. Panjang digit setelah 08 tidak sesuai."
    );
  }

  throw new Error(
    "Format nomor telepon tidak valid. Gunakan format 08... atau +628..."
  );
}

/**
 * Menghasilkan HMAC-SHA256 berupa heksadesimal dengan crypto bawaan Node/Web.
 */
export function hmacSha256Hex(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/**
 * Membandingkan dua string secara konstan-waktu untuk mencegah serangan timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Menandatangani payload string menggunakan Web Crypto API (HMAC-SHA256).
 */
export async function signWithWebCrypto(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return base64UrlEncode(signature);
}

/**
 * Memverifikasi tanda tangan payload menggunakan Web Crypto API (HMAC-SHA256)
 * dengan perbandingan konstan-waktu bawaan crypto.subtle.verify.
 */
export async function verifyWithWebCrypto(
  payload: string,
  signatureBase64Url: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const signatureBytes = base64UrlDecode(signatureBase64Url);

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as ArrayBufferView,
      encoder.encode(payload)
    );
  } catch {
    return false;
  }
}
