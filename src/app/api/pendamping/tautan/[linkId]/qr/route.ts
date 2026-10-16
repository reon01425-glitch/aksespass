import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { getLinkedPatientByLinkId, CompanionError } from "@/lib/companions";
import { createConsent, type ConsentDuration } from "@/lib/consent";

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

      const body = ((await req.json().catch(() => ({}))) ?? {}) as {
        facilityId?: unknown;
        sharedFields?: unknown;
        duration?: unknown;
      };

      if (typeof body.facilityId !== "string" || !body.facilityId.trim()) {
        return NextResponse.json(
          { ok: false, error: "facilityId wajib diisi" },
          { status: 400 }
        );
      }

      if (!Array.isArray(body.sharedFields) || body.sharedFields.length === 0) {
        return NextResponse.json(
          { ok: false, error: "sharedFields wajib diisi" },
          { status: 400 }
        );
      }

      if (typeof body.duration !== "string" || !body.duration.trim()) {
        return NextResponse.json(
          { ok: false, error: "duration wajib diisi" },
          { status: 400 }
        );
      }

      const result = await createConsent(
        {
          userId: sessionRes.session.userId,
          role: "companion",
        },
        {
          facilityId: body.facilityId.trim(),
          sharedFields: body.sharedFields as string[],
          duration: body.duration as ConsentDuration,
          targetPatientUserId: patient.patientUserId,
        }
      );

      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err instanceof CompanionError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.status }
        );
      }
      const message = err instanceof Error ? err.message : "Gagal membuat ConsentQR.";
      return NextResponse.json(
        { ok: false, error: message },
        { status: 422 }
      );
    }
  }
);
