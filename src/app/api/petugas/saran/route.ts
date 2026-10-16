import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { getSuggestionsForNeeds } from "@/lib/accommodation";

export const POST = wrapRouteHandler(async (req) => {
  const sessionRes = await requireSession(req, { roles: ["staff"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as { needCodes?: unknown };
  if (!Array.isArray(body.needCodes)) {
    return NextResponse.json(
      { ok: false, error: "Parameter needCodes harus berupa array string" },
      { status: 400 }
    );
  }

  const needCodes = body.needCodes.filter(
    (c): c is string => typeof c === "string" && Boolean(c.trim())
  );

  const result = await getSuggestionsForNeeds(needCodes);

  return NextResponse.json({
    ok: true,
    suggestions: result.suggestions,
    uncoveredNeeds: result.uncoveredNeeds,
  });
});
