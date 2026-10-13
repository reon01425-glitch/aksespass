import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { getLinkedPatientByLinkId, CompanionError } from "@/lib/companions";
import {
  confirmVisit,
  CareProofError,
  type CareProofStatus,
} from "@/lib/careproof";

export const POST = wrapRouteHandler(
  async (
    req: Request,
    context: { params: Promise<{ linkId: string; visitId: string }> }
  ) => {
    const sessionRes = await requireSession(req, { roles: ["companion"] });
    if (!sessionRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak valid" },
        { status: 401 }
      );
    }

    const { linkId, visitId } = (await context?.params) ?? {
      linkId: "",
      visitId: "",
    };

    if (!linkId || !visitId) {
      return NextResponse.json(
        { ok: false, error: "ID tautan atau ID kunjungan tidak valid" },
        { status: 400 }
      );
    }

    try {
      // Pastikan tautan aktif dan milik pendamping ini
      await getLinkedPatientByLinkId(sessionRes.session, linkId);

      const body = (await req.json().catch(() => ({}))) as {
        status?: unknown;
        unmetNeedCodes?: unknown;
      };

      if (
        typeof body.status !== "string" ||
        !["terpenuhi", "sebagian", "belum"].includes(body.status)
      ) {
        return NextResponse.json(
          { ok: false, error: "Status konfirmasi tidak valid" },
          { status: 400 }
        );
      }

      const unmetNeedCodes = Array.isArray(body.unmetNeedCodes)
        ? body.unmetNeedCodes.filter(
            (c): c is string => typeof c === "string" && Boolean(c.trim())
          )
        : [];

      const result = await confirmVisit(
        {
          userId: sessionRes.session.userId,
          role: "companion",
        },
        visitId,
        {
          status: body.status as CareProofStatus,
          unmetNeedCodes,
        }
      );

      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err instanceof CareProofError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.status }
        );
      }
      if (err instanceof CompanionError) {
        return NextResponse.json(
          { ok: false, error: err.message, code: err.code },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Gagal mengonfirmasi kunjungan." },
        { status: 500 }
      );
    }
  }
);
