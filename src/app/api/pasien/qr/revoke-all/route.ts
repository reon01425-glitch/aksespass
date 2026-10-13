import { requireSession } from "../../../../../lib/auth";
import { revokeAllActive } from "../../../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";

export const POST = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["patient"] });

  if (!sessionRes.ok) {
    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: hanya pasien yang dapat mencabut QR." },
        { status: 403 }
      );
    }
    return jsonResponse(
      { ok: false, error: "Sesi tidak valid atau telah berakhir." },
      { status: 401 }
    );
  }

  const claims = {
    sessionId: sessionRes.session.sessionId,
    userId: sessionRes.session.userId,
    role: sessionRes.session.role,
    facilityId: sessionRes.session.facilityId,
  };

  const res = await revokeAllActive(claims);

  return jsonResponse({ ok: true, count: res.count });
});
