import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { rejectCompanionLink, CompanionError } from "@/lib/companions";

export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ linkId: string }> }) => {
    const sessionRes = await requireSession(req, { roles: ["patient"] });
    if (!sessionRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak valid" },
        { status: 401 }
      );
    }

    const { linkId } = (await context?.params) ?? { linkId: "" };
    if (!linkId) {
      return NextResponse.json(
        { ok: false, error: "ID tautan tidak valid" },
        { status: 400 }
      );
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(linkId)) {
      return NextResponse.json({ ok: false, error: "Tautan tidak ditemukan." }, { status: 404 });
    }

    try {
      const result = await rejectCompanionLink(sessionRes.session, linkId);
      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err instanceof CompanionError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Gagal menolak tautan pendamping." },
        { status: 500 }
      );
    }
  }
);
