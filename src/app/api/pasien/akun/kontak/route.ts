import { verifyOtpForAction, normalizePhoneNumber } from "../../../../../lib/auth";
import { changeOwnPhone } from "../../../../../lib/account";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";
import { requirePatient } from "../_session";

export const POST = wrapRouteHandler(async (request: Request) => {
  const auth = await requirePatient(request);
  if (!auth.ok) return auth.response;

  let body: { phone?: string; code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Format request JSON tidak valid." }, { status: 400 });
  }
  if (!body.phone || !body.code) {
    return jsonResponse({ ok: false, error: "Nomor baru dan kode verifikasi wajib diisi." }, { status: 400 });
  }

  try {
    const phone = normalizePhoneNumber(body.phone);
    await verifyOtpForAction(phone, body.code);
    const ok = await changeOwnPhone(auth.session, phone);
    if (!ok) {
      return jsonResponse(
        { ok: false, error: "Nomor ini tidak dapat dipakai. Coba nomor lain." },
        { status: 400 }
      );
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah nomor.";
    return jsonResponse({ ok: false, error: message }, { status: 400 });
  }
});
