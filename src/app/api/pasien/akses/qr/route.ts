import { requireSession } from "../../../../../lib/auth";
import { listOwnActiveQrs } from "../../../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";

export const GET = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["patient"] });

  if (!sessionRes.ok) {
    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: hanya pasien yang dapat melihat daftar QR." },
        { status: 403 }
      );
    }
    return jsonResponse(
      { ok: false, error: "Sesi tidak valid atau telah berakhir." },
      { status: 401 }
    );
  }

  const qrs = await listOwnActiveQrs({
    userId: sessionRes.session.userId,
    role: sessionRes.session.role,
  });

  return jsonResponse({ ok: true, data: qrs });
});
