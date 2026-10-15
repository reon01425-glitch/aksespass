import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { getOwnWaitingState } from "@/lib/visits";

export const GET = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ visitId: string }> }) => {
    const sessionRes = await requireSession(req, { roles: ["patient"] });
    if (!sessionRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak valid" },
        { status: 401 }
      );
    }

    const { visitId } = await context.params;
    const state = await getOwnWaitingState(sessionRes.session, visitId);
    if (!state) {
      return NextResponse.json(
        { ok: false, error: "Kunjungan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, ...state },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
);
