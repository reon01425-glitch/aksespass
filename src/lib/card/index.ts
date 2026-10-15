import crypto from "node:crypto";
import { withContext } from "../../db";
import { recordAuditEvent } from "../audit";
import { checkScanRateLimit } from "../consent/rate-limit";
import { VisitActionError, type VisitSessionParam } from "../visits";

/** Alfabet Crockford Base32 (tanpa I, L, O, U) agar kode mudah dibaca dan diketik. */
const CARD_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CARD_CODE_LENGTH = 8;
export const CARD_NOTE_MAX_LENGTH = 280;

export function generateCardCode(): string {
  const bytes = crypto.randomBytes(CARD_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CARD_CODE_LENGTH; i += 1) {
    out += CARD_CODE_ALPHABET[bytes[i] % 32];
  }
  return out;
}

/** Huruf besar, tanpa spasi atau tanda hubung; O dibaca 0, I dan L dibaca 1. Null bila bentuknya salah. */
export function normalizeCardCode(input: string): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return new RegExp(`^[${CARD_CODE_ALPHABET}]{${CARD_CODE_LENGTH}}$`).test(cleaned)
    ? cleaned
    : null;
}

export { formatCardCode } from "./format";

interface PatientActor {
  userId: string;
  role: string;
}

function assertPatient(actor: PatientActor): void {
  if (actor.role !== "patient") {
    throw new VisitActionError("Hanya pasien yang dapat mengelola kode kartu", 403, "FORBIDDEN");
  }
}

async function writeNewCode(userId: string, onlyIfEmpty: boolean): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCardCode();
    try {
      const rows = await withContext({ userId, role: "patient" }, async (tx) => {
        const res = await tx.query<{ card_code: string }>(
          `UPDATE patient_profiles
           SET card_code = $2
           WHERE user_id = $1 ${onlyIfEmpty ? "AND card_code IS NULL" : ""}
           RETURNING card_code;`,
          [userId, code]
        );
        return res.rows;
      });
      return rows[0]?.card_code ?? null;
    } catch (err) {
      // Bentrok keunikan (sangat jarang): coba kode lain.
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  throw new Error("Gagal membuat kode kartu.");
}

/** Kode kartu pasien; dibuat saat pertama diminta. Null bila pasien belum punya paspor. */
export async function getOrCreateOwnCardCode(actor: PatientActor): Promise<string | null> {
  assertPatient(actor);
  const existing = await withContext(
    { userId: actor.userId, role: "patient" },
    async (tx) => {
      const res = await tx.query<{ card_code: string | null }>(
        "SELECT card_code FROM patient_profiles WHERE user_id = $1;",
        [actor.userId]
      );
      return res.rows[0] ?? null;
    }
  );
  if (!existing) return null;
  if (existing.card_code) return existing.card_code;
  const created = await writeNewCode(actor.userId, true);
  if (created) return created;
  // Balapan: kode sudah dibuat proses lain.
  const again = await withContext({ userId: actor.userId, role: "patient" }, async (tx) => {
    const res = await tx.query<{ card_code: string | null }>(
      "SELECT card_code FROM patient_profiles WHERE user_id = $1;",
      [actor.userId]
    );
    return res.rows[0]?.card_code ?? null;
  });
  return again;
}

/** Membuat kode baru; kode lama langsung tidak berlaku. */
export async function regenerateOwnCardCode(actor: PatientActor): Promise<string> {
  assertPatient(actor);
  const code = await writeNewCode(actor.userId, false);
  if (!code) {
    throw new VisitActionError("Isi paspor terlebih dahulu", 409, "NO_PASSPORT");
  }
  return code;
}

export interface RecordCardVisitInput {
  cardCode: string;
  needCodes: string[];
  ruleIds: string[];
  note?: string | null;
  /** UUID dari perangkat petugas; kiriman ulang dengan client_id sama tidak menggandakan kunjungan. */
  clientId: string;
}

export interface RecordCardVisitResult {
  ok: true;
  visitId: string;
  recordedAt: string;
  duplicate: boolean;
}

const UNKNOWN_CODE_MESSAGE = "Kode kartu tidak dikenali. Periksa kode yang tertulis di kartu.";

/**
 * T4b: mencatat kunjungan dari kartu cetak (jalur 'kartu'). Pasien dikenali dari Kode Kartu;
 * tidak ada data profil yang dibaca atau dikembalikan. Kunjungan langsung berstatus tercatat
 * dan selesai, sehingga pasien dapat mengonfirmasinya (P16). Idempoten lewat clientId.
 */
export async function recordCardVisit(
  session: VisitSessionParam,
  input: RecordCardVisitInput,
  options?: { now?: Date; ip?: string }
): Promise<RecordCardVisitResult> {
  if (session.role !== "staff" || !session.facilityId) {
    throw new VisitActionError("Hanya petugas fasilitas yang dapat mencatat kunjungan", 403, "FORBIDDEN");
  }
  const facilityId = session.facilityId;
  const now = options?.now ?? new Date();

  const code = normalizeCardCode(input.cardCode);
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > CARD_NOTE_MAX_LENGTH) {
    throw new VisitActionError("Catatan petugas melebihi batas maksimum 280 karakter", 400, "NOTE_TOO_LONG");
  }
  const clientId = typeof input.clientId === "string" ? input.clientId.trim() : "";
  if (!clientId || clientId.length > 128) {
    throw new VisitActionError("clientId tidak valid", 400, "BAD_CLIENT_ID");
  }
  const needCodes = Array.from(new Set(input.needCodes.filter(Boolean)));
  if (needCodes.length === 0) {
    throw new VisitActionError("Pilih minimal satu kebutuhan dari kartu", 400, "NO_NEEDS");
  }

  const limit = await checkScanRateLimit(session.userId, options?.ip ?? "unknown", { now });
  if (!limit.allowed) {
    throw new VisitActionError("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.", 429, "RATE_LIMITED");
  }
  if (!code) {
    throw new VisitActionError(UNKNOWN_CODE_MESSAGE, 422, "UNKNOWN_CODE");
  }

  return await withContext(
    { userId: session.userId, role: "staff", facilityId },
    async (tx) => {
      // Kiriman ulang yang sama (idempoten).
      const dup = await tx.query<{ id: string; recorded_at: string }>(
        "SELECT id, recorded_at FROM visits WHERE client_id = $1 AND staff_user_id = $2 AND facility_id = $3;",
        [clientId, session.userId, facilityId]
      );
      if (dup.rows.length > 0) {
        return {
          ok: true as const,
          visitId: dup.rows[0].id,
          recordedAt: new Date(dup.rows[0].recorded_at).toISOString(),
          duplicate: true,
        };
      }

      const found = await tx.query<{ patient_user_id: string; subject_ref: string }>(
        "SELECT patient_user_id, subject_ref FROM find_patient_by_card_code($1);",
        [code]
      );
      if (found.rows.length === 0) {
        throw new VisitActionError(UNKNOWN_CODE_MESSAGE, 422, "UNKNOWN_CODE");
      }
      const patient = found.rows[0];

      const catalogRes = await tx.query<{ code: string }>(
        "SELECT code FROM needs_catalog WHERE code = ANY($1);",
        [needCodes]
      );
      if (catalogRes.rows.length !== needCodes.length) {
        throw new VisitActionError("Ada kebutuhan yang tidak dikenali", 400, "INVALID_NEEDS");
      }

      const ruleIds = Array.from(new Set(input.ruleIds.filter(Boolean)));
      if (ruleIds.length > 0) {
        const rules = await tx.query<{ id: string }>(
          "SELECT id FROM accommodation_rules WHERE id = ANY($1) AND status = 'published';",
          [ruleIds]
        );
        if (rules.rows.length !== ruleIds.length) {
          throw new VisitActionError(
            "Sebagian atau seluruh aturan tidak valid atau belum diterbitkan",
            400,
            "INVALID_RULES"
          );
        }
      }

      const ins = await tx.query<{ id: string }>(
        `INSERT INTO visits (
           patient_user_id, facility_id, staff_user_id, consent_id, channel, client_id,
           created_at, recorded_at, completed_at, subject_ref,
           recorded_need_codes, recorded_rule_ids, staff_note
         ) VALUES ($1, $2, $3, NULL, 'kartu', $4, $5, $5, $5, $6, $7, $8, $9)
         RETURNING id;`,
        [
          patient.patient_user_id,
          facilityId,
          session.userId,
          clientId,
          now.toISOString(),
          patient.subject_ref,
          needCodes,
          ruleIds,
          note || null,
        ]
      );

      await recordAuditEvent(tx, {
        eventType: "visit_recorded",
        actorId: session.userId,
        actorRole: "staff",
        subjectRef: patient.subject_ref,
        facilityId,
        occurredAt: now,
      });

      return {
        ok: true as const,
        visitId: ins.rows[0].id,
        recordedAt: now.toISOString(),
        duplicate: false,
      };
    }
  );
}
