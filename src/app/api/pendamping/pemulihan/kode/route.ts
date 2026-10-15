import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { requestOtp } from "@/lib/auth";
import { wrapRouteHandler } from "@/lib/http";

/** Mengirim kode verifikasi ke NOMOR BARU pasien (bukan ke nomor lama). Hanya pendamping. */
export const POST = wrapRouteHandler(async (req: Request) => {
  const auth = await requireSession(req, { roles: ["companion"] });
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { phone?: unknown };
  if (typeof body.phone !== "string" || !body.phone.trim()) {
    return NextResponse.json({ ok: false, error: "Nomor telepon wajib diisi." }, { status: 400 });
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";
  try {
    const result = await requestOtp(body.phone, { ip });
    return NextResponse.json({ ok: true, message: result.message, devOtp: result.devOtp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim kode verifikasi.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
});
