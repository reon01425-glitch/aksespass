import { buildClearSessionCookieHeader, verifyOtpForAction } from "../../../../../lib/auth";
import { deleteOwnPatientAccount, getOwnPhone } from "../../../../../lib/account";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";
import { requirePatient } from "../_session";

export const POST = wrapRouteHandler(async (request: Request) => {
  const auth = await requirePatient(request);
  if (!auth.ok) return auth.response;

  let body: { code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Format request JSON tidak valid." }, { status: 400 });
  }
  if (!body.code) {
    return jsonResponse({ ok: false, error: "Kode verifikasi wajib diisi." }, { status: 400 });
  }

  try {
    const phone = await getOwnPhone(auth.session);
    if (!phone) {
      return jsonResponse({ ok: false, error: "Akun tidak ditemukan." }, { status: 404 });
    }
    await verifyOtpForAction(phone, body.code);
    const ok = await deleteOwnPatientAccount(auth.session);
    if (!ok) {
      return jsonResponse({ ok: false, error: "Akun tidak dapat dihapus." }, { status: 400 });
    }
    return jsonResponse(
      { ok: true },
      { headers: { "Set-Cookie": buildClearSessionCookieHeader().header } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus akun.";
    return jsonResponse({ ok: false, error: message }, { status: 400 });
  }
});
