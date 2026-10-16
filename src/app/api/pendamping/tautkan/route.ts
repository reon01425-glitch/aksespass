import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { redeemLinkCode, CompanionError } from "@/lib/companions";

export const POST = wrapRouteHandler(async (req: Request) => {
  const sessionRes = await requireSession(req, { roles: ["companion"] });
  if (!sessionRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Sesi tidak valid" },
      { status: 401 }
    );
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as { code?: unknown };
  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Kode tidak dapat dipakai. Minta kode baru ke pasien.",
      },
      { status: 400 }
    );
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const result = await redeemLinkCode(sessionRes.session, body.code.trim(), {
      clientIp,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CompanionError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Kode tidak dapat dipakai. Minta kode baru ke pasien.",
      },
      { status: 400 }
    );
  }
});
