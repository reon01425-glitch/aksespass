import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { wrapRouteHandler } from "@/lib/http";
import { KomunikaError, listMessages, sendMessage } from "@/lib/komunikacare";

const NO_STORE = { "Cache-Control": "no-store" };

/** GET ?kunjungan=<id> — pesan kunjungan (pasien pemilik atau petugas fasilitas). */
export const GET = wrapRouteHandler(async (req: Request) => {
  const s = await requireSession(req, { roles: ["patient", "staff"] });
  if (!s.ok) {
    return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  }
  const visitId = new URL(req.url).searchParams.get("kunjungan") ?? "";
  try {
    const list = await listMessages(s.session, visitId);
    if (!list) {
      return NextResponse.json(
        { ok: false, error: "Kunjungan tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, ...list }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof KomunikaError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    throw err;
  }
});

/** POST { visitId, kind, body } */
export const POST = wrapRouteHandler(async (req: Request) => {
  const s = await requireSession(req, { roles: ["patient", "staff"] });
  if (!s.ok) {
    return NextResponse.json({ ok: false, error: "Sesi tidak valid" }, { status: 401 });
  }
  const b = ((await req.json().catch(() => ({}))) ?? {}) as {
    visitId?: unknown;
    kind?: unknown;
    body?: unknown;
  };
  if (
    typeof b.visitId !== "string" ||
    (b.kind !== "icon" && b.kind !== "text") ||
    typeof b.body !== "string"
  ) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }
  try {
    const message = await sendMessage(s.session, {
      visitId: b.visitId,
      kind: b.kind,
      body: b.body,
    });
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    if (err instanceof KomunikaError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    throw err;
  }
});
