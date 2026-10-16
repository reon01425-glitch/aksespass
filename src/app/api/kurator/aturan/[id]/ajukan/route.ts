import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { CurationError, submitForReview } from "@/lib/curation";

/** K4 -> K5: ajukan tinjauan. */
export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const s = await requireSession(req, { roles: ["curator"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    try {
      await submitForReview(s.session, id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof CurationError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
