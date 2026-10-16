import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { createRule, CurationError } from "@/lib/curation";

/** K3 -> K4: aturan baru sebagai draf. */
export const POST = wrapRouteHandler(async (req: Request) => {
  const s = await requireSession(req, { roles: ["curator"] });
  if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  const b = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  try {
    const r = await createRule(s.session, b);
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    if (err instanceof CurationError) {
      return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
    }
    throw err;
  }
});
