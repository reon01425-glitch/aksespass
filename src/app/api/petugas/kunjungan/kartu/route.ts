import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { recordCardVisit } from "@/lib/card";
import { VisitActionError } from "@/lib/visits";

export const POST = wrapRouteHandler(async (req) => {
  const sessionRes = await requireSession(req, { roles: ["staff"] });
  if (!sessionRes.ok) {
    return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as {
    cardCode?: unknown;
    needCodes?: unknown;
    ruleIds?: unknown;
    note?: unknown;
    clientId?: unknown;
  };

  const strings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      : [];

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    const result = await recordCardVisit(
      sessionRes.session,
      {
        cardCode: typeof body.cardCode === "string" ? body.cardCode : "",
        needCodes: strings(body.needCodes),
        ruleIds: strings(body.ruleIds),
        note: typeof body.note === "string" ? body.note : null,
        clientId: typeof body.clientId === "string" ? body.clientId : "",
      },
      { ip }
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    if (err instanceof VisitActionError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    throw err;
  }
});
