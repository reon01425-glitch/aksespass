import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { confirmVisit, CareProofError, type CareProofStatus } from "@/lib/careproof";

export const POST = wrapRouteHandler(async (req) => {
  const sessionRes = await requireSession(req, { roles: ["staff"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    visitId?: unknown;
    status?: unknown;
    unmetNeedCodes?: unknown;
  };

  if (typeof body.visitId !== "string" || !body.visitId.trim()) {
    return NextResponse.json(
      { ok: false, error: "visitId wajib diisi" },
      { status: 400 }
    );
  }

  if (
    typeof body.status !== "string" ||
    !["terpenuhi", "sebagian", "belum"].includes(body.status)
  ) {
    return NextResponse.json(
      { ok: false, error: "Status konfirmasi tidak valid" },
      { status: 400 }
    );
  }

  const unmetNeedCodes = Array.isArray(body.unmetNeedCodes)
    ? body.unmetNeedCodes.filter(
        (c): c is string => typeof c === "string" && Boolean(c.trim())
      )
    : [];

  try {
    const result = await confirmVisit(
      {
        userId: sessionRes.session.userId,
        role: "staff",
        facilityId: sessionRes.session.facilityId,
      },
      body.visitId.trim(),
      {
        status: body.status as CareProofStatus,
        unmetNeedCodes,
      }
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CareProofError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    throw err;
  }
});
