import {
  APP_DB_ROLES,
  type AppDbRole,
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "./constants";
import { signWithWebCrypto, verifyWithWebCrypto } from "./crypto";
import { getAppOrigin, getSessionSecret } from "./env";

export interface SessionClaims {
  sessionId: string;
  userId: string;
  role: AppDbRole;
  facilityId: string | null;
  expiresAt: number; // Unix timestamp dalam milidetik
  version: number;
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Mengekstrak nilai cookie sesi dari header Cookie mentah.
 * Memeriksa kedua nama cookie (__Host-aksespass_session atau aksespass_session).
 */
export function extractSessionCookieFromHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.startsWith(`${SECURE_COOKIE_NAME}=`)) {
      return part.slice(SECURE_COOKIE_NAME.length + 1).trim();
    }
    if (part.startsWith(`${COOKIE_NAME}=`)) {
      return part.slice(COOKIE_NAME.length + 1).trim();
    }
  }
  return null;
}

/**
 * Verifikasi murni tanpa DB untuk cookie sesi (dipakai oleh middleware/proxy).
 * Memeriksa tanda tangan HMAC-SHA256, format klaim, dan masa berlaku.
 */
export async function verifySessionCookie(
  cookieValue: string | null | undefined,
  options?: { allowExpired?: boolean }
): Promise<SessionClaims | null> {
  if (!cookieValue || typeof cookieValue !== "string") {
    return null;
  }

  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  const payloadB64 = cookieValue.slice(0, dotIndex);
  const signatureB64 = cookieValue.slice(dotIndex + 1);
  if (!payloadB64 || !signatureB64) {
    return null;
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const isValidSignature = await verifyWithWebCrypto(
    payloadB64,
    signatureB64,
    secret
  );
  if (!isValidSignature) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr) as Partial<SessionClaims>;

    if (
      typeof parsed.sessionId !== "string" ||
      parsed.sessionId.trim().length < 16
    ) {
      return null;
    }

    if (typeof parsed.userId !== "string" || !UUID_REGEX.test(parsed.userId)) {
      return null;
    }

    if (
      typeof parsed.role !== "string" ||
      !(APP_DB_ROLES as readonly string[]).includes(parsed.role)
    ) {
      return null;
    }

    if (
      parsed.facilityId !== null &&
      (typeof parsed.facilityId !== "string" ||
        !UUID_REGEX.test(parsed.facilityId))
    ) {
      return null;
    }

    if (
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }

    if (!options?.allowExpired && parsed.expiresAt <= Date.now()) {
      return null;
    }

    if (typeof parsed.version !== "number" || parsed.version < 1) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      role: parsed.role as AppDbRole,
      facilityId: parsed.facilityId ?? null,
      expiresAt: parsed.expiresAt,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

/**
 * Membuat nilai cookie sesi bertanda tangan (payloadBase64.signatureBase64).
 */
export async function createSessionCookieValue(
  claims: SessionClaims
): Promise<string> {
  const secret = getSessionSecret();
  const jsonStr = JSON.stringify(claims);
  const payloadB64 = Buffer.from(jsonStr, "utf8").toString("base64url");
  const signature = await signWithWebCrypto(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export interface SessionCookieHeaderResult {
  name: string;
  value: string;
  header: string;
}

/**
 * Menghasilkan header Set-Cookie untuk sesi pengguna.
 * Menghormati HttpOnly, SameSite=Lax, Path=/, Max-Age, dan Secure (+ prefix __Host-) bila https.
 */
export async function buildSessionCookieHeader(
  claims: SessionClaims
): Promise<SessionCookieHeaderResult> {
  const isSecure = getAppOrigin().startsWith("https://");
  const name = isSecure ? SECURE_COOKIE_NAME : COOKIE_NAME;
  const value = await createSessionCookieValue(claims);
  const maxAgeSec = Math.max(0, Math.round((claims.expiresAt - Date.now()) / 1000));

  const headerParts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (isSecure) {
    headerParts.push("Secure");
  }

  return {
    name,
    value,
    header: headerParts.join("; "),
  };
}

/**
 * Menghasilkan header Set-Cookie untuk menghapus cookie sesi (logout).
 */
export function buildClearSessionCookieHeader(): {
  name: string;
  header: string;
} {
  const isSecure = getAppOrigin().startsWith("https://");
  const name = isSecure ? SECURE_COOKIE_NAME : COOKIE_NAME;

  const headerParts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (isSecure) {
    headerParts.push("Secure");
  }

  return {
    name,
    header: headerParts.join("; "),
  };
}
