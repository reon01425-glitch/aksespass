import { requireSession } from "../../../lib/auth";
import {
  recordScanRejectedForInactiveStaff,
  scanToken,
} from "../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../lib/http";

export const POST = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["staff"] });

  if (!sessionRes.ok) {
    if (
      sessionRes.reason === "MEMBERSHIP_INACTIVE" ||
      sessionRes.reason === "USER_INACTIVE"
    ) {
      if (sessionRes.claims) {
        await recordScanRejectedForInactiveStaff(sessionRes.claims);
      }
      return jsonResponse(
        { ok: false, error: "Akun tidak aktif. Hubungi admin fasilitas." },
        { status: 403 }
      );
    }

    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: peran tidak sesuai." },
        { status: 403 }
      );
    }

    return jsonResponse(
      { ok: false, error: "Sesi tidak valid." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawToken =
    body &&
    typeof body === "object" &&
    "token" in body &&
    typeof body.token === "string"
      ? body.token
      : "";

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  const userAgent = request.headers.get("user-agent");

  const scanResult = await scanToken(sessionRes.session, rawToken, {
    ip,
    userAgent,
  });

  return jsonResponse(scanResult.body, { status: scanResult.status });
});

export function GET(): Response {
  return jsonResponse(
    { ok: false, error: "Metode GET tidak diizinkan untuk pemindaian token." },
    { status: 405 }
  );
}
