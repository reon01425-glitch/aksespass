import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { regenerateOwnCardCode } from "@/lib/card";
import { VisitActionError } from "@/lib/visits";

/** Membuat Kode Kartu baru; kode lama langsung tidak berlaku. */
export const POST = wrapRouteHandler(async (req) => {
  const sessionRes = await requireSession(req, { roles: ["patient"] });
  if (!sessionRes.ok) {
    return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  }
  try {
    const code = await regenerateOwnCardCode(sessionRes.session);
    return NextResponse.json({ ok: true, code }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    if (err instanceof VisitActionError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    throw err;
  }
});
