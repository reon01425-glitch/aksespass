import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { createStaff, StaffAdminError } from "@/lib/staff";

export const POST = wrapRouteHandler(async (req: Request) => {
  const s = await requireSession(req, { roles: ["facility_admin"] });
  if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  const b = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  try {
    const r = await createStaff(s.session, { name: b.name, phone: b.phone, unit: b.unit });
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    if (err instanceof StaffAdminError) {
      return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
    }
    throw err;
  }
});
