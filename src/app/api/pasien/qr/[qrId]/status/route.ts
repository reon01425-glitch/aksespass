import { requireSession } from "../../../../../../lib/auth";
import { getConsentQrStatus } from "../../../../../../lib/consent";
import { jsonResponse, wrapRouteHandler } from "../../../../../../lib/http";

export const GET = wrapRouteHandler(
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
            error:
              "Akses ditolak: hanya pasien atau pendamping yang dapat mengakses status QR.",
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

    const statusResult = await getConsentQrStatus(claims, qrId);

    if (statusResult.status === "not_found") {
      return jsonResponse(
        { ok: false, error: "QR tidak ditemukan" },
        { status: 404 }
      );
    }

    return jsonResponse({
      ok: true,
      ...statusResult,
    });
  }
);
