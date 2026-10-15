import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { RecoveryError, cancelRecovery } from "@/lib/recovery";

/** Membatalkan permintaan pemulihan: pasien terkait atau pendamping aktif mana pun. */
export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const auth = await requireSession(req, { roles: ["patient", "companion"] });
    if (!auth.ok) return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
    const { id } = await context.params;
    try {
      await cancelRecovery(auth.session, id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof RecoveryError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
      }
      throw err;
    }
  }
);
