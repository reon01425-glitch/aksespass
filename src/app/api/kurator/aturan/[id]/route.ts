import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { CurationError, discardDraft, saveDraft } from "@/lib/curation";

function fail(err: unknown) {
  if (err instanceof CurationError) {
    return NextResponse.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
  }
  throw err;
}

/** K4: simpan draf. */
export const PATCH = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const s = await requireSession(req, { roles: ["curator"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    try {
      await saveDraft(s.session, id, b);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return fail(err);
    }
  }
);

/** K4: buang draf. */
export const DELETE = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const s = await requireSession(req, { roles: ["curator"] });
    if (!s.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    try {
      await discardDraft(s.session, id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return fail(err);
    }
  }
);
