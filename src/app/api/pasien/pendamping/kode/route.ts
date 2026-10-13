import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { createLinkCode, CompanionError } from "@/lib/companions";

export const POST = wrapRouteHandler(async (req: Request) => {
  const sessionRes = await requireSession(req, { roles: ["patient"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }

  try {
    const result = await createLinkCode(sessionRes.session);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    if (err instanceof CompanionError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Gagal membuat kode tautan." },
      { status: 500 }
    );
  }
});
