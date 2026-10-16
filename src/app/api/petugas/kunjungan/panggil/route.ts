import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { callPatient, VisitActionError } from "@/lib/visits";

export const POST = wrapRouteHandler(async (req) => {
  const sessionRes = await requireSession(req, { roles: ["staff"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as {
    visitId?: unknown;
    room?: unknown;
  };

  if (typeof body.visitId !== "string" || !body.visitId.trim()) {
    return NextResponse.json(
      { ok: false, error: "visitId wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const result = await callPatient(sessionRes.session, {
      visitId: body.visitId.trim(),
      room: typeof body.room === "string" ? body.room : null,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof VisitActionError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    throw err;
  }
});
