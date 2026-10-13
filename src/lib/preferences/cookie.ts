import {
  PREFERENCE_COOKIE_MAX_AGE_SECONDS,
  PREFERENCE_COOKIE_NAME,
  VALID_CONTRASTS,
  VALID_TEXT_SIZES,
  type AppPreferences,
  type ContrastMode,
  type TextSize,
} from "./constants";

/**
 * Memvalidasi apakah nilai text size termasuk dalam allowlist.
 */
export function isValidTextSize(val: unknown): val is TextSize {
  return typeof val === "string" && (VALID_TEXT_SIZES as readonly string[]).includes(val);
}

/**
 * Memvalidasi apakah nilai kontras termasuk dalam allowlist.
 */
export function isValidContrast(val: unknown): val is ContrastMode {
  return typeof val === "string" && (VALID_CONTRASTS as readonly string[]).includes(val);
}

/**
 * Melakukan serialisasi preferensi ke format string cookie.
 * Melempar error bila ada nilai yang di luar allowlist tetap.
 */
export function serializePreferenceCookie(pref: AppPreferences): string {
  if (!isValidTextSize(pref.textSize) || !isValidContrast(pref.contrast)) {
    throw new Error("Nilai preferensi tidak valid.");
  }

  return JSON.stringify({
    textSize: pref.textSize,
    contrast: pref.contrast,
  });
}

/**
 * Melakukan parse isi cookie aksespass_pref.
 * Menolak keras (mengembalikan null) bila format rusak, berisi kunci asing,
 * atau berisi nilai di luar daftar tetap.
 */
export function parsePreferenceCookie(
  raw: string | null | undefined
): AppPreferences | null {
  if (!raw) return null;

  try {
    const decoded = raw.startsWith("%7B") || raw.startsWith("%7b")
      ? decodeURIComponent(raw)
      : raw;
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const keys = Object.keys(parsed);
    // Hanya mengizinkan tepat dua nilai itu (textSize dan contrast)
    if (keys.length !== 2) {
      return null;
    }

    if (!("textSize" in parsed) || !("contrast" in parsed)) {
      return null;
    }

    if (!isValidTextSize(parsed.textSize) || !isValidContrast(parsed.contrast)) {
      return null;
    }

    return {
      textSize: parsed.textSize,
      contrast: parsed.contrast,
    };
  } catch {
    return null;
  }
}

/**
 * Membuat header Set-Cookie HttpOnly untuk preferensi aksesibilitas.
 */
export function buildPreferenceCookieHeader(
  pref: AppPreferences,
  isSecure = false
): string {
  const value = serializePreferenceCookie(pref);
  const parts = [
    `${PREFERENCE_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${PREFERENCE_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isSecure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
