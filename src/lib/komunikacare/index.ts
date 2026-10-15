import { withContext } from "../../db";
import {
  BOARD_SENTENCES,
  KOMUNIKACARE_TEXT_MAX_LENGTH,
  type KomunikaMessage,
} from "./board";

export * from "./board";

export class KomunikaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "KomunikaError";
  }
}

export const KOMUNIKACARE_MAX_MESSAGES_PER_VISIT = 100;
const UUID = /^[0-9a-f-]{36}$/i;

interface Session {
  userId: string;
  role: string;
  facilityId?: string | null;
}

function ctx(session: Session) {
  if (session.role === "staff" && session.facilityId) {
    return { userId: session.userId, role: "staff" as const, facilityId: session.facilityId };
  }
  if (session.role === "patient") {
    return { userId: session.userId, role: "patient" as const };
  }
  throw new KomunikaError("Tidak diizinkan", 403, "FORBIDDEN");
}

/**
 * Kirim satu pesan. Pasien: gambar papan (kind=icon) atau teks. Petugas: teks.
 * Hanya selama pelayanan belum selesai. Isi pesan tidak dicatat di audit/log.
 */
export async function sendMessage(
  session: Session,
  input: { visitId: string; kind: "icon" | "text"; body: string }
): Promise<KomunikaMessage> {
  const c = ctx(session);
  if (!UUID.test(input.visitId)) throw new KomunikaError("Tidak ditemukan", 404, "NOT_FOUND");

  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (input.kind === "icon") {
    if (c.role !== "patient" || !BOARD_SENTENCES[body]) {
      throw new KomunikaError("Pesan tidak valid", 400, "INVALID");
    }
  } else if (input.kind === "text") {
    if (!body || body.length > KOMUNIKACARE_TEXT_MAX_LENGTH) {
      throw new KomunikaError(
        `Teks 1–${KOMUNIKACARE_TEXT_MAX_LENGTH} karakter`,
        400,
        "INVALID"
      );
    }
  } else {
    throw new KomunikaError("Pesan tidak valid", 400, "INVALID");
  }

  return await withContext(c, async (tx) => {
    const res = await tx.query<{ id: string; created_at: string }>(
      `INSERT INTO komunikacare_messages (visit_id, sender, kind, body)
       SELECT v.id, $2, $3, $4
       FROM visits v
       WHERE v.id = $1
         AND v.completed_at IS NULL
         AND (SELECT count(*) FROM komunikacare_messages m WHERE m.visit_id = v.id) < $5
       RETURNING id, created_at;`,
      [input.visitId, c.role, input.kind, body, KOMUNIKACARE_MAX_MESSAGES_PER_VISIT]
    );
    if (res.rows.length === 0) {
      throw new KomunikaError(
        "Kunjungan tidak ditemukan, sudah selesai, atau batas pesan tercapai",
        404,
        "NOT_FOUND_OR_ENDED"
      );
    }
    return {
      id: res.rows[0].id,
      sender: c.role,
      kind: input.kind,
      body,
      createdAt: new Date(res.rows[0].created_at).toISOString(),
    };
  });
}

export interface MessageList {
  messages: KomunikaMessage[];
  /** true bila pelayanan sudah selesai: percakapan ditutup. */
  ended: boolean;
}

/** Daftar pesan kunjungan (terlama dulu), hanya 12 jam terakhir. null = tidak terlihat. */
export async function listMessages(
  session: Session,
  visitId: string
): Promise<MessageList | null> {
  const c = ctx(session);
  if (!UUID.test(visitId)) return null;
  return await withContext(c, async (tx) => {
    const v = await tx.query<{ completed_at: string | null }>(
      `SELECT completed_at FROM visits WHERE id = $1;`,
      [visitId]
    );
    if (v.rows.length === 0) return null;
    const res = await tx.query<{
      id: string;
      sender: "patient" | "staff";
      kind: "icon" | "text";
      body: string;
      created_at: string;
    }>(
      `SELECT id, sender, kind, body, created_at
       FROM komunikacare_messages
       WHERE visit_id = $1 AND created_at > now() - interval '12 hours'
       ORDER BY created_at ASC, id ASC
       LIMIT 100;`,
      [visitId]
    );
    return {
      ended: v.rows[0].completed_at !== null,
      messages: res.rows.map((r) => ({
        id: r.id,
        sender: r.sender,
        kind: r.kind,
        body: r.body,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  });
}
