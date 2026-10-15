import { requireSession } from "../../../../lib/auth";
import { jsonResponse } from "../../../../lib/http";

export async function requirePatient(request: Request) {
  const res = await requireSession(request, { roles: ["patient"] });
  if (res.ok) return { ok: true as const, session: res.session };
  const forbidden = res.reason === "FORBIDDEN_ROLE";
  return {
    ok: false as const,
    response: jsonResponse(
      {
        ok: false,
        error: forbidden
          ? "Akses ditolak: hanya pasien yang dapat mengubah akunnya."
          : "Sesi tidak valid atau telah berakhir.",
      },
      { status: forbidden ? 403 : 401 }
    ),
  };
}
