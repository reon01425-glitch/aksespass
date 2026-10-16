import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { createNewVersion, CurationError } from "@/lib/curation";

/** K3 -> K4: versi baru dari aturan terbit. */
export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ ruleKey: string }> }) => {
    const s = await requireSession(req, { roles: ["curator"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { ruleKey } = await context.params;
    try {
      const r = await createNewVersion(s.session, ruleKey);
      return NextResponse.json({ ok: true, ...r });
    } catch (err) {
      if (err instanceof CurationError) {
        return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
