import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { CurationError, reviewRule } from "@/lib/curation";

/** K5: beri suara setuju atau minta revisi. */
export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const s = await requireSession(req, { roles: ["curator"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    const b = ((await req.json().catch(() => ({}))) ?? {}) as { decision?: unknown; note?: unknown };
    try {
      const r = await reviewRule(s.session, id, { decision: b.decision, note: b.note });
      return NextResponse.json({ ok: true, ...r });
    } catch (err) {
      if (err instanceof CurationError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
