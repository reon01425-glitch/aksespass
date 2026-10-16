import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { setStaffActive, StaffAdminError } from "@/lib/staff";

export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ userId: string }> }) => {
    const s = await requireSession(req, { roles: ["facility_admin"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { userId } = await context.params;
    const b = ((await req.json().catch(() => ({}))) ?? {}) as { active?: unknown };
    if (typeof b.active !== "boolean") {
      return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
    }
    try {
      const status = await setStaffActive(s.session, { userId, active: b.active });
      return NextResponse.json({ ok: true, status });
    } catch (err) {
      if (err instanceof StaffAdminError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
