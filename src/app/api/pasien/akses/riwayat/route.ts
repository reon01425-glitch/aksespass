import { requireSession } from "../../../../../lib/auth";
import { getOwnAccessHistory } from "../../../../../lib/audit";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";

export const GET = wrapRouteHandler(async (request: Request) => {
  const sessionRes = await requireSession(request, { roles: ["patient"] });

  if (!sessionRes.ok) {
    if (sessionRes.reason === "FORBIDDEN_ROLE") {
      return jsonResponse(
        { ok: false, error: "Akses ditolak: hanya pasien yang dapat melihat riwayat akses." },
        { status: 403 }
      );
    }
    return jsonResponse(
      { ok: false, error: "Sesi tidak valid atau telah berakhir." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const facilityIdParam = url.searchParams.get("facilityId");

  const history = await getOwnAccessHistory(
    {
      userId: sessionRes.session.userId,
      role: sessionRes.session.role,
    },
    {
      from: fromParam ? new Date(fromParam) : null,
      to: toParam ? new Date(toParam) : null,
      facilityId: facilityIdParam || null,
    }
  );

  return jsonResponse({ ok: true, data: history });
});
