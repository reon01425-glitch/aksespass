import { requireSession } from "../../../../../../lib/auth";
import { regenerateQr } from "../../../../../../lib/consent";
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
      const forbidden = sessionRes.reason === "FORBIDDEN_ROLE";
      return jsonResponse(
        {
          ok: false,
          error: forbidden
            ? "Akses ditolak."
            : "Sesi tidak valid atau telah berakhir.",
        },
        { status: forbidden ? 403 : 401 }
      );
    }

    const { qrId } = (await context?.params) ?? { qrId: "" };
    if (!qrId) {
      return jsonResponse(
        { ok: false, error: "QR tidak ditemukan" },
        { status: 404 }
      );
    }

    const res = await regenerateQr(
      {
        userId: sessionRes.session.userId,
        role: sessionRes.session.role,
        facilityId: sessionRes.session.facilityId,
      },
      qrId
    );
    if (!res) {
      return jsonResponse(
        { ok: false, error: "QR tidak ditemukan, sudah dicabut, atau kedaluwarsa." },
        { status: 404 }
      );
    }
    return jsonResponse(res);
  }
);
