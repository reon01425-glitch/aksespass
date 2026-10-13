import { requireSession } from "../../../../../../lib/auth";
import { revokeQr } from "../../../../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../../../../lib/http";

export const POST = wrapRouteHandler(
  async (
    request: Request,
    context: { params: Promise<{ qrId: string }> }
  ) => {
    const sessionRes = await requireSession(request, {
      roles: ["patient", "companion"],
    });

    if (!sessionRes.ok) {
      if (sessionRes.reason === "FORBIDDEN_ROLE") {
        return jsonResponse(
          {
            ok: false,
            error: "Akses ditolak: hanya pasien atau pendamping aktif yang dapat mencabut QR.",
          },
          { status: 403 }
        );
      }
      return jsonResponse(
        { ok: false, error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    const { qrId } = (await context?.params) ?? { qrId: "" };
    if (!qrId) {
      return jsonResponse(
        { ok: false, error: "QR tidak ditemukan" },
        { status: 404 }
      );
    }

    const claims = {
      sessionId: sessionRes.session.sessionId,
      userId: sessionRes.session.userId,
      role: sessionRes.session.role,
      facilityId: sessionRes.session.facilityId,
    };

    const res = await revokeQr(claims, qrId);

    if (!res.ok || res.count === 0) {
      return jsonResponse(
        { ok: false, error: "QR tidak ditemukan atau sudah dicabut." },
        { status: 404 }
      );
    }

    return jsonResponse({ ok: true, count: res.count });
  }
);
