import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { markRevokedLinksSeen } from "@/lib/companions";

export const POST = wrapRouteHandler(async (req: Request) => {
  const sessionRes = await requireSession(req, { roles: ["companion"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }
  const count = await markRevokedLinksSeen(sessionRes.session);
  return NextResponse.json({ ok: true, count });
});
