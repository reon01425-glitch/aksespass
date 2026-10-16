import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { StaffAdminError, updateStaff } from "@/lib/staff";

export const PATCH = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ userId: string }> }) => {
    const s = await requireSession(req, { roles: ["facility_admin"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { userId } = await context.params;
    const b = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    try {
      await updateStaff(s.session, { userId, name: b.name, unit: b.unit });
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof StaffAdminError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
