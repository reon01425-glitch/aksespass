import { withContext } from "../../db";
import { recordAuditEvent } from "../audit";
import { maskPhone } from "../account";

export interface RecoveryActor {
  userId: string;
  role: string;
  facilityId?: string | null;
}

export class RecoveryError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "RecoveryError";
    this.status = status;
  }
}

/** Jeda keselamatan sebelum nomor diganti (menit). Bawaan 24 jam; dapat diatur lewat RECOVERY_COOLDOWN_MINUTES. */
export function getRecoveryCooldownMinutes(): number {
  const raw = Number(process.env.RECOVERY_COOLDOWN_MINUTES);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 24 * 60;
}

function ctx(a: RecoveryActor) {
  return { userId: a.userId, role: a.role as "patient" | "companion", facilityId: a.facilityId ?? null };
}

export interface RecoveryRequestItem {
  id: string;
  /** ID tautan pendamping (null untuk pasien). */
  linkId: string | null;
  maskedNewPhone: string;
  createdAt: string;
  eligibleAt: string;
  initiatedByMe: boolean;
  initiatorName: string;
}

/** Permintaan pemulihan yang masih tertunda dan terlihat oleh pemanggil (pasien terkait atau pendampingnya). */
export async function listRecoveryRequests(session: RecoveryActor): Promise<RecoveryRequestItem[]> {
  if (session.role !== "patient" && session.role !== "companion") return [];
  return withContext(ctx(session), async (tx) => {
    const res = await tx.query<{
      id: string;
      link_id: string | null;
      new_phone: string;
      created_at: string;
      eligible_at: string;
      initiated_by_me: boolean;
      initiator_name: string | null;
    }>("SELECT * FROM get_recovery_requests();");
    return res.rows.map((r) => ({
      id: r.id,
      linkId: r.link_id,
      maskedNewPhone: maskPhone(r.new_phone),
      createdAt: new Date(r.created_at).toISOString(),
      eligibleAt: new Date(r.eligible_at).toISOString(),
      initiatedByMe: r.initiated_by_me,
      initiatorName: r.initiator_name || "Pendamping",
    }));
  });
}

/**
 * Pendamping aktif mengajukan pemindahan akun pasien ke nomor baru. Kode verifikasi nomor baru
 * harus sudah diperiksa pemanggil. Alasan penolakan sengaja tidak dibedakan.
 */
export async function requestRecovery(
  session: RecoveryActor,
  input: { linkId: string; newPhone: string },
  options?: { now?: Date }
): Promise<{ id: string; eligibleAt: string }> {
  if (session.role !== "companion") {
    throw new RecoveryError("Hanya pendamping yang dapat mengajukan pemulihan akun.", 403);
  }
  return withContext(ctx(session), async (tx) => {
    const res = await tx.query<{ id: string; eligible_at: string; patient_subject_ref: string }>(
      "SELECT * FROM request_account_recovery($1, $2, $3);",
      [input.linkId, input.newPhone, getRecoveryCooldownMinutes()]
    );
    const row = res.rows[0];
    if (!row) {
      throw new RecoveryError(
        "Permintaan tidak dapat dibuat. Nomor mungkin sudah dipakai, atau sudah ada permintaan pemulihan lain untuk pasien ini."
      );
    }
    await recordAuditEvent(tx, {
      eventType: "recovery_requested",
      actorId: session.userId,
      actorRole: "companion",
      subjectRef: row.patient_subject_ref,
      occurredAt: options?.now,
    });
    return { id: row.id, eligibleAt: new Date(row.eligible_at).toISOString() };
  });
}

/** Membatalkan permintaan: pasien terkait atau pendamping aktif mana pun. */
export async function cancelRecovery(session: RecoveryActor, requestId: string): Promise<void> {
  if (session.role !== "patient" && session.role !== "companion") {
    throw new RecoveryError("Akses ditolak.", 403);
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    throw new RecoveryError("Permintaan tidak ditemukan.", 404);
  }
  await withContext(ctx(session), async (tx) => {
    const res = await tx.query<{ subject: string | null }>("SELECT cancel_account_recovery($1) AS subject;", [requestId]);
    const subject = res.rows[0]?.subject;
    if (!subject) throw new RecoveryError("Permintaan tidak ditemukan.", 404);
    await recordAuditEvent(tx, {
      eventType: "recovery_cancelled",
      actorId: session.userId,
      actorRole: session.role as "patient" | "companion",
      subjectRef: subject,
    });
  });
}
