import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { FacilityActionError, updateFacilityAction } from "@/lib/facility-actions";

export const PATCH = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const s = await requireSession(req, { roles: ["facility_admin"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    const b = ((await req.json().catch(() => ({}))) ?? {}) as { status?: unknown; stepNote?: unknown };
    try {
      const item = await updateFacilityAction(s.session, { id, status: b.status, stepNote: b.stepNote });
      return NextResponse.json({ ok: true, item });
    } catch (err) {
      if (err instanceof FacilityActionError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
