import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { normalizePhoneNumber, verifyOtpForAction } from "@/lib/auth";
import { wrapRouteHandler } from "@/lib/http";
import { RecoveryError, requestRecovery } from "@/lib/recovery";

/** Pendamping mengajukan pemulihan akun pasien ke nomor baru setelah kode nomor baru diisi. */
export const POST = wrapRouteHandler(async (req: Request) => {
  const auth = await requireSession(req, { roles: ["companion"] });
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as { linkId?: unknown; phone?: unknown; code?: unknown };
  if (typeof body.linkId !== "string" || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ ok: false, error: "Nomor baru dan kode verifikasi wajib diisi." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(body.linkId)) {
    return NextResponse.json({ ok: false, error: "Tautan tidak ditemukan." }, { status: 404 });
  }

  try {
    const phone = normalizePhoneNumber(body.phone);
    await verifyOtpForAction(phone, body.code);
    const result = await requestRecovery(auth.session, { linkId: body.linkId, newPhone: phone });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RecoveryError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal mengajukan pemulihan.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
});
