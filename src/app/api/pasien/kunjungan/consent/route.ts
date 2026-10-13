import { requireSession } from "../../../../../lib/auth";
import {
  createConsent,
  type ConsentDuration,
  isConsentSharedField,
} from "../../../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";
import { logger, serializeError } from "../../../../../lib/privacy";

export const POST = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["patient"] });

  if (!sessionRes.ok) {
    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: hanya pasien yang dapat membuat ConsentQR." },
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
      { ok: false, error: "Format masukan tidak valid." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return jsonResponse(
      { ok: false, error: "Format masukan tidak valid." },
      { status: 400 }
    );
  }

  const payload = body as {
    facilityId?: string;
    sharedFields?: unknown;
    duration?: ConsentDuration;
  };

  const facilityId = typeof payload.facilityId === "string" ? payload.facilityId.trim() : "";
  if (!facilityId) {
    return jsonResponse(
      { ok: false, error: "Pilih fasilitas tujuan." },
      { status: 422 }
    );
  }

  if (!Array.isArray(payload.sharedFields) || payload.sharedFields.length === 0) {
    return jsonResponse(
      { ok: false, error: "Pilih minimal satu kebutuhan untuk dibagikan." },
      { status: 422 }
    );
  }

  for (const field of payload.sharedFields) {
    if (typeof field !== "string" || !isConsentSharedField(field)) {
      return jsonResponse(
        { ok: false, error: `Field kebutuhan tidak diizinkan: ${String(field)}` },
        { status: 422 }
      );
    }
  }

  const duration = payload.duration ?? "1 jam";

  try {
    const claims = {
      sessionId: sessionRes.session.sessionId,
      userId: sessionRes.session.userId,
      role: sessionRes.session.role,
      facilityId: sessionRes.session.facilityId,
    };

    const result = await createConsent(claims, {
      facilityId,
      sharedFields: payload.sharedFields as string[],
      duration,
    });

    return jsonResponse({
      ok: true,
      token: result.token,
      qrId: result.qrId,
      expiresAt: result.expiresAt,
      consentId: result.consentId,
    });
  } catch (err) {
    const serialized = serializeError(err);
    logger.warn({
      event: "consent_create_failed",
      userId: sessionRes.session.userId,
      reason: serialized.message,
    });

    const message =
      err instanceof Error && err.message
        ? err.message
        : "Gagal membuat ConsentQR. Silakan coba lagi.";

    return jsonResponse({ ok: false, error: message }, { status: 422 });
  }
});
