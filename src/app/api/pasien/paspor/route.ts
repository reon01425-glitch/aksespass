import { requireSession } from "../../../../lib/auth";
import { saveOwnPassport } from "../../../../lib/passport";
import { jsonResponse, wrapRouteHandler } from "../../../../lib/http";
import { logger, serializeError } from "../../../../lib/privacy";

export const POST = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["patient"] });

  if (!sessionRes.ok) {
    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: hanya pasien yang dapat menyimpan paspor." },
        { status: 403 }
      );
    }

    return jsonResponse(
      { ok: false, error: "Sesi tidak valid atau telah berakhir." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { ok: false, error: "Format data paspor tidak valid." },
      { status: 400 }
    );
  }

  try {
    const claims = {
      sessionId: sessionRes.session.sessionId,
      userId: sessionRes.session.userId,
      role: sessionRes.session.role,
      facilityId: sessionRes.session.facilityId,
      expiresAt: Date.now() + 60000,
      version: 1,
    };

    const saved = await saveOwnPassport(claims, body);
    return jsonResponse({ ok: true, passport: saved });
  } catch (err) {
    const serialized = serializeError(err);
    logger.warn({
      event: "passport_save_validation_failed",
      userId: sessionRes.session.userId,
      reason: serialized.message,
    });

    // Kembalikan pesan galat generik atau ramah pengguna tanpa membocorkan internal server
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Terjadi kesalahan saat menyimpan paspor. Silakan coba lagi.";

    return jsonResponse({ ok: false, error: message }, { status: 422 });
  }
});
