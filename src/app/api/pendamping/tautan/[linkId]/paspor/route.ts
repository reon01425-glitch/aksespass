import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { getLinkedPatientByLinkId, CompanionError } from "@/lib/companions";
import { saveOwnPassport } from "@/lib/passport";

export const POST = wrapRouteHandler(
  async (req: Request, context: { params: Promise<{ linkId: string }> }) => {
    const sessionRes = await requireSession(req, { roles: ["companion"] });
    if (!sessionRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak valid" },
        { status: 401 }
      );
    }

    const { linkId } = (await context?.params) ?? { linkId: "" };
    if (!linkId) {
      return NextResponse.json(
        { ok: false, error: "ID tautan tidak valid" },
        { status: 400 }
      );
    }

    try {
      const patient = await getLinkedPatientByLinkId(
        sessionRes.session,
        linkId
      );

      const body = (await req.json().catch(() => ({}))) as unknown;

      const updated = await saveOwnPassport(sessionRes.session, body, {
        targetPatientUserId: patient.patientUserId,
        actorRole: "companion",
        actorUserId: sessionRes.session.userId,
      });

      return NextResponse.json({ ok: true, passport: updated });
    } catch (err: unknown) {
      if (err instanceof CompanionError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.status }
        );
      }
      const message = err instanceof Error ? err.message : "Gagal menyimpan paspor.";
      return NextResponse.json(
        { ok: false, error: message },
        { status: 422 }
      );
    }
  }
);
