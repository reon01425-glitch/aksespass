import { requestOtp } from "../../../../../lib/auth";
import { getOwnPhone } from "../../../../../lib/account";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";
import { requirePatient } from "../_session";

/**
 * Meminta kode verifikasi untuk tindakan akun.
 * - tujuan "hapus": kode dikirim ke nomor akun sendiri.
 * - tujuan "kontak": kode dikirim ke nomor baru yang diketik pasien.
 */
export const POST = wrapRouteHandler(async (request: Request) => {
  const auth = await requirePatient(request);
  if (!auth.ok) return auth.response;

  let body: { purpose?: string; phone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Format request JSON tidak valid." }, { status: 400 });
  }

  let target: string | null = null;
  if (body.purpose === "hapus") {
    target = await getOwnPhone(auth.session);
  } else if (body.purpose === "kontak") {
    target = typeof body.phone === "string" ? body.phone : null;
  } else {
    return jsonResponse({ ok: false, error: "Tujuan tidak dikenal." }, { status: 400 });
  }

  if (!target) {
    return jsonResponse({ ok: false, error: "Nomor telepon wajib diisi." }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";

  try {
    const result = await requestOtp(target, { ip });
    return jsonResponse({ ok: true, message: result.message, devOtp: result.devOtp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim kode verifikasi.";
    return jsonResponse({ ok: false, error: message }, { status: 400 });
  }
});
