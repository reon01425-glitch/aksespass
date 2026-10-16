import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { createFacilityAction, FacilityActionError } from "@/lib/facility-actions";

export const POST = wrapRouteHandler(async (req: Request) => {
  const s = await requireSession(req, { roles: ["facility_admin"] });
  if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  const b = ((await req.json().catch(() => ({}))) ?? {}) as { category?: unknown };
  try {
    const r = await createFacilityAction(s.session, { category: b.category });
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    if (err instanceof FacilityActionError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message, existingId: err.existingId },
        { status: err.status }
      );
    }
    throw err;
  }
});
