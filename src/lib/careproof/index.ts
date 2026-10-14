import { withContext, type AppDbRole } from "../../db";
import { recordAuditEvent } from "../audit";
import { NEED_CATEGORIES, type NeedCategory } from "../consent/constants";
import type { SessionClaims } from "../auth/session";

export type CareProofStatus = "terpenuhi" | "sebagian" | "belum";
export type CareProofConfirmedBy = "patient" | "companion" | "on_site";

export interface ConfirmVisitActor {
  userId: string;
  role: "patient" | "companion" | "staff";
  facilityId?: string | null;
}

export interface ConfirmVisitInput {
  status: CareProofStatus;
  unmetNeedCodes?: string[];
}

export interface ConfirmVisitResult {
  ok: true;
  visitId: string;
  status: CareProofStatus;
  confirmedBy: CareProofConfirmedBy;
  confirmedAt: string;
}

export class CareProofError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "BAD_REQUEST") {
    super(message);
    this.name = "CareProofError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Konfirmasi pelayanan CareProof (P16, D8, T9):
 * Digunakan oleh Pasien, Pendamping resmi, maupun Konfirmasi di Tempat oleh petugas.
 *
 * Aturan Domain & Arsitektur §9:
 * 1. Status harus bernilai 'terpenuhi', 'sebagian', atau 'belum'.
 * 2. Kunjungan harus sudah dicatat bantuannya (recorded_at IS NOT NULL); belum dicatat -> ditolak.
 * 3. unmetNeedCodes harus merupakan subset dari katalog kebutuhan yang sah. Jika terpenuhi, wajib kosong.
 * 4. confirmed_by mengikuti actor:
 *    - staff -> 'on_site'
 *    - companion -> 'companion'
 *    - patient -> 'patient'
 * 5. Resolusi Kepemilikan: Jawaban pasien adalah penentu utama (single source of truth).
 *    - Pasien boleh menimpa jawaban pendamping maupun jawaban di tempat.
 *    - Pendamping atau petugas di tempat TIDAK boleh menimpa jawaban yang sudah dikonfirmasi oleh pasien -> 409 "Pasien sudah mengonfirmasi".
 * 6. Menulis audit event 'visit_confirmed' (pelaku, confirmed_by via actorRole, subject_ref dari visits, fasilitas; tanpa isi jawaban/kebutuhan).
 */
export async function confirmVisit(
  actor: ConfirmVisitActor,
  visitId: string,
  input: ConfirmVisitInput,
  options?: { now?: Date }
): Promise<ConfirmVisitResult> {
  const allowedStatuses: CareProofStatus[] = ["terpenuhi", "sebagian", "belum"];
  if (!allowedStatuses.includes(input.status)) {
    throw new CareProofError(
      `Status konfirmasi tidak valid: ${input.status}`,
      400,
      "INVALID_STATUS"
    );
  }

  // Tentukan confirmed_by berdasarkan peran aktor pemanggil
  let confirmedBy: CareProofConfirmedBy;
  if (actor.role === "staff") {
    confirmedBy = "on_site";
  } else if (actor.role === "companion") {
    confirmedBy = "companion";
  } else if (actor.role === "patient") {
    confirmedBy = "patient";
  } else {
    throw new CareProofError("Peran tidak diizinkan untuk mengonfirmasi kunjungan", 403, "FORBIDDEN");
  }

  // Validasi unmetNeedCodes
  let unmetNeedCodes: string[] = [];
  if (input.status === "terpenuhi") {
    unmetNeedCodes = [];
  } else if (Array.isArray(input.unmetNeedCodes)) {
    unmetNeedCodes = Array.from(
      new Set(
        input.unmetNeedCodes.filter(
          (c): c is string => typeof c === "string" && Boolean(c.trim())
        )
      )
    );
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role as AppDbRole,
      facilityId: actor.facilityId ?? undefined,
    },
    async (tx) => {
      // 1. Ambil data kunjungan dan konfirmasi yang sudah ada (bila ada)
      const visitRes = await tx.query<{
        id: string;
        facility_id: string;
        patient_user_id: string;
        recorded_at: string | null;
        subject_ref: string;
        confirmation_id: string | null;
        existing_confirmed_by: CareProofConfirmedBy | null;
      }>(
        `SELECT
           v.id,
           v.facility_id,
           v.patient_user_id,
           v.recorded_at,
           v.subject_ref,
           vc.id AS confirmation_id,
           vc.confirmed_by AS existing_confirmed_by
         FROM visits v
         LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
         WHERE v.id = $1;`,
        [visitId]
      );

      if (visitRes.rows.length === 0) {
        throw new CareProofError("Kunjungan tidak ditemukan", 404, "NOT_FOUND");
      }

      const visitRow = visitRes.rows[0];

      // Kunjungan harus sudah dicatat bantuannya (recorded_at IS NOT NULL)
      if (visitRow.recorded_at === null) {
        throw new CareProofError(
          "Kunjungan belum dicatat bantuannya oleh petugas",
          400,
          "VISIT_NOT_RECORDED"
        );
      }

      // Validasi unmetNeedCodes terhadap needs_catalog jika ada
      if (unmetNeedCodes.length > 0) {
        const catRes = await tx.query<{ code: string }>(
          `SELECT code FROM needs_catalog WHERE code = ANY($1);`,
          [unmetNeedCodes]
        );
        if (catRes.rows.length !== unmetNeedCodes.length) {
          throw new CareProofError(
            "Sebagian kode kebutuhan yang belum terpenuhi tidak terdaftar di katalog",
            400,
            "INVALID_UNMET_NEEDS"
          );
        }
      }

      // 2. Aturan §9: Resolusi Kepemilikan Konfirmasi
      // Jika pasien sudah mengonfirmasi sendiri, pendamping atau petugas di tempat TIDAK BOLEH menimpa
      if (
        visitRow.existing_confirmed_by === "patient" &&
        confirmedBy !== "patient"
      ) {
        throw new CareProofError(
          "Pasien sudah mengonfirmasi",
          409,
          "PATIENT_ALREADY_CONFIRMED"
        );
      }

      // 3. Simpan atau perbarui konfirmasi kunjungan
      if (visitRow.confirmation_id) {
        await tx.query(
          `UPDATE visit_confirmations
           SET status = $1,
               unmet_need_codes = $2,
               confirmed_by = $3,
               confirmed_by_user_id = $4,
               confirmed_at = $5
           WHERE visit_id = $6;`,
          [
            input.status,
            unmetNeedCodes,
            confirmedBy,
            actor.userId,
            now.toISOString(),
            visitId,
          ]
        );
      } else {
        await tx.query(
          `INSERT INTO visit_confirmations (
             id, visit_id, status, unmet_need_codes, confirmed_by,
             confirmed_by_user_id, confirmed_at
           ) VALUES (
             gen_random_uuid(), $1, $2, $3, $4, $5, $6
           );`,
          [
            visitId,
            input.status,
            unmetNeedCodes,
            confirmedBy,
            actor.userId,
            now.toISOString(),
          ]
        );
      }

      // 4. Catat kejadian audit visit_confirmed (tanpa isi jawaban/kebutuhan)
      await recordAuditEvent(tx, {
        eventType: "visit_confirmed",
        actorId: actor.userId,
        actorRole: actor.role as AppDbRole,
        subjectRef: visitRow.subject_ref,
        facilityId: visitRow.facility_id,
        occurredAt: now,
      });

      return {
        ok: true,
        visitId,
        status: input.status,
        confirmedBy,
        confirmedAt: now.toISOString(),
      };
    }
  );
}

export const OWN_CONFIRMATIONS_WINDOW_DAYS = 30;

export interface RecordedAssistanceItem {
  ruleId: string;
  actionText: string;
  iconName: string;
}

export interface OwnConfirmationCurrentAnswer {
  status: CareProofStatus;
  confirmedBy: CareProofConfirmedBy;
  unmetNeedCodes: string[];
}

export interface OwnConfirmationItem {
  visitId: string;
  recordedAt: string;
  facilityName: string;
  assistance: RecordedAssistanceItem[];
  /** Kategori kebutuhan yang relevan/dibagikan pada kunjungan ini (dari consent atau bantuan tercatat). */
  sharedCategories: NeedCategory[];
  currentAnswer: OwnConfirmationCurrentAnswer | null;
}

export interface OwnVisitHistoryItem {
  visitId: string;
  shortRef: string;
  createdAt: string;
  recordedAt: string;
  facilityName: string;
  channel: "qr" | "kartu";
  assistance: RecordedAssistanceItem[];
  currentAnswer: OwnConfirmationCurrentAnswer | null;
}

async function getOwnRecordedVisits(
  session: { userId: string; role: string } | SessionClaims,
  visitId?: string
): Promise<OwnVisitHistoryItem[]> {
  if (session.role !== "patient") {
    return [];
  }

  return withContext({ userId: session.userId, role: "patient" }, async (tx) => {
    const result = await tx.query<{
      id: string;
      created_at: string;
      recorded_at: string;
      facility_name: string;
      channel: "qr" | "kartu";
      recorded_rule_ids: string[] | null;
      status: CareProofStatus | null;
      confirmed_by: CareProofConfirmedBy | null;
      unmet_need_codes: string[] | null;
    }>(
      `SELECT
         v.id,
         v.created_at,
         v.recorded_at,
         f.name AS facility_name,
         v.channel,
         v.recorded_rule_ids,
         vc.status,
         vc.confirmed_by,
         vc.unmet_need_codes
       FROM visits v
       JOIN facilities f ON f.id = v.facility_id
       LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
       WHERE v.patient_user_id = $1
         AND v.recorded_at IS NOT NULL
         AND ($2::text IS NULL OR v.id::text = $2::text)
       ORDER BY v.recorded_at DESC;`,
      [session.userId, visitId ?? null]
    );

    if (result.rows.length === 0) {
      return [];
    }

    const ruleIds = Array.from(
      new Set(result.rows.flatMap((row) => row.recorded_rule_ids || []))
    );
    const ruleMap = new Map<string, RecordedAssistanceItem>();

    if (ruleIds.length > 0) {
      const rulesResult = await tx.query<{
        id: string;
        action_text: string;
        icon_name: string;
      }>(
        `SELECT id, action_text, icon_name
         FROM accommodation_rules
         WHERE id = ANY($1);`,
        [ruleIds]
      );

      for (const rule of rulesResult.rows) {
        ruleMap.set(rule.id, {
          ruleId: rule.id,
          actionText: rule.action_text,
          iconName: rule.icon_name,
        });
      }
    }

    return result.rows.map((row) => ({
      visitId: row.id,
      shortRef: row.id.replace(/-/g, "").slice(-8).toUpperCase(),
      createdAt: new Date(row.created_at).toISOString(),
      recordedAt: new Date(row.recorded_at).toISOString(),
      facilityName: row.facility_name,
      channel: row.channel,
      assistance: (row.recorded_rule_ids || [])
        .map((id) => ruleMap.get(id))
        .filter((item): item is RecordedAssistanceItem => item !== undefined),
      currentAnswer: row.status && row.confirmed_by
        ? {
            status: row.status,
            confirmedBy: row.confirmed_by,
            unmetNeedCodes: row.unmet_need_codes || [],
          }
        : null,
    }));
  });
}

export async function listOwnVisitHistory(
  session: { userId: string; role: string } | SessionClaims
): Promise<OwnVisitHistoryItem[]> {
  return getOwnRecordedVisits(session);
}

export async function getOwnVisitHistoryItem(
  session: { userId: string; role: string } | SessionClaims,
  visitId: string
): Promise<OwnVisitHistoryItem | null> {
  const [item] = await getOwnRecordedVisits(session, visitId);
  return item ?? null;
}

/**
 * P16: daftar kunjungan tercatat ${OWN_CONFIRMATIONS_WINDOW_DAYS} hari terakhir milik pasien
 * sendiri yang (a) belum dikonfirmasi, atau (b) dijawab pendamping/di tempat dan masih bisa
 * diubah pasien (resolusi kepemilikan §9 -- pasien selalu bisa menimpa). Kunjungan yang sudah
 * dikonfirmasi oleh pasien sendiri TIDAK muncul lagi di daftar ini (sudah final).
 */
export async function listOwnConfirmations(
  session: { userId: string; role: string } | SessionClaims
): Promise<OwnConfirmationItem[]> {
  if (session.role !== "patient") {
    return [];
  }

  return withContext({ userId: session.userId, role: "patient" }, async (tx) => {
    const res = await tx.query<{
      id: string;
      recorded_at: string;
      facility_name: string;
      recorded_rule_ids: string[] | null;
      consent_shared_fields: string[] | null;
      status: CareProofStatus | null;
      confirmed_by: CareProofConfirmedBy | null;
      unmet_need_codes: string[] | null;
    }>(
      `SELECT
         v.id,
         v.recorded_at,
         f.name AS facility_name,
         v.recorded_rule_ids,
         c.shared_fields AS consent_shared_fields,
         vc.status,
         vc.confirmed_by,
         vc.unmet_need_codes
       FROM visits v
       JOIN facilities f ON f.id = v.facility_id
       LEFT JOIN consents c ON c.id = v.consent_id
       LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
       WHERE v.patient_user_id = $1
         AND v.recorded_at IS NOT NULL
         AND v.recorded_at >= now() - interval '30 days'
         AND (vc.id IS NULL OR vc.confirmed_by IN ('companion', 'on_site'))
       ORDER BY v.recorded_at DESC;`,
      [session.userId]
    );

    if (res.rows.length === 0) {
      return [];
    }

    const allRuleIds = Array.from(
      new Set(res.rows.flatMap((r) => r.recorded_rule_ids || []))
    );

    const ruleMap = new Map<
      string,
      { actionText: string; iconName: string; category: string }
    >();
    if (allRuleIds.length > 0) {
      const rulesRes = await tx.query<{
        id: string;
        action_text: string;
        icon_name: string;
        category: string;
      }>(
        `SELECT ar.id, ar.action_text, ar.icon_name, nc.category
         FROM accommodation_rules ar
         JOIN needs_catalog nc ON nc.code = ar.trigger_need_code
         WHERE ar.id = ANY($1);`,
        [allRuleIds]
      );
      for (const row of rulesRes.rows) {
        ruleMap.set(row.id, {
          actionText: row.action_text,
          iconName: row.icon_name,
          category: row.category,
        });
      }
    }

    return res.rows.map((row) => {
      const ruleIds = row.recorded_rule_ids || [];
      const assistance: RecordedAssistanceItem[] = ruleIds
        .map((ruleId) => {
          const rule = ruleMap.get(ruleId);
          if (!rule) return null;
          return { ruleId, actionText: rule.actionText, iconName: rule.iconName };
        })
        .filter((r): r is RecordedAssistanceItem => r !== null);

      const categoriesFromRules = ruleIds
        .map((id) => ruleMap.get(id)?.category)
        .filter((c): c is string => Boolean(c));
      const categoriesFromConsent = (row.consent_shared_fields || []).filter(
        (f): f is NeedCategory => (NEED_CATEGORIES as readonly string[]).includes(f)
      );
      const sharedCategories = Array.from(
        new Set([...categoriesFromRules, ...categoriesFromConsent])
      ) as NeedCategory[];

      return {
        visitId: row.id,
        recordedAt: new Date(row.recorded_at).toISOString(),
        facilityName: row.facility_name,
        assistance,
        sharedCategories,
        currentAnswer: row.status
          ? {
              status: row.status,
              confirmedBy: row.confirmed_by as CareProofConfirmedBy,
              unmetNeedCodes: row.unmet_need_codes || [],
            }
          : null,
      };
    });
  });
}

/**
 * P16 detail: satu kunjungan milik pasien sendiri yang masih bisa dikonfirmasi/diubah.
 * Melempar CareProofError 404 bila kunjungan bukan milik pasien, belum dicatat, di luar
 * jendela waktu, atau sudah final dikonfirmasi oleh pasien sendiri -- pesan galat yang sama
 * untuk seluruh kasus tersebut agar tidak membocorkan keberadaan kunjungan milik orang lain.
 */
export async function getOwnConfirmableVisit(
  session: { userId: string; role: string } | SessionClaims,
  visitId: string
): Promise<OwnConfirmationItem> {
  if (session.role !== "patient") {
    throw new CareProofError(
      "Hanya pasien yang dapat membuka layar ini",
      403,
      "FORBIDDEN"
    );
  }

  const items = await listOwnConfirmations(session);
  const found = items.find((i) => i.visitId === visitId);
  if (!found) {
    throw new CareProofError(
      "Kunjungan tidak ditemukan atau sudah Anda konfirmasi sebelumnya",
      404,
      "NOT_FOUND"
    );
  }
  return found;
}

export interface CompanionConfirmableVisitItem {
  visitId: string;
  recordedAt: string;
  facilityName: string;
  assistance: RecordedAssistanceItem[];
  sharedCategories: NeedCategory[];
  currentAnswer: {
    status: CareProofStatus;
    confirmedBy: CareProofConfirmedBy;
    unmetNeedCodes: string[];
  } | null;
  isPatientConfirmed: boolean;
}

export interface CareProofSessionActor {
  userId: string;
  role: string;
  facilityId?: string | null;
}

/**
 * Menghitung jumlah konfirmasi kunjungan yang masih menunggu respon pasien/pendamping.
 */
export async function countPendingConfirmationsForPatient(
  session: CareProofSessionActor,
  patientUserId: string
): Promise<number> {
  return await withContext(
    {
      userId: session.userId,
      role: session.role as AppDbRole,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{ count: number }>(
        `SELECT count(*)::int AS count
         FROM visits v
         LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
         WHERE v.patient_user_id = $1
           AND v.recorded_at IS NOT NULL
           AND v.recorded_at >= now() - interval '30 days'
           AND (vc.status IS NULL OR vc.confirmed_by <> 'patient');`,
        [patientUserId]
      );
      return res.rows[0]?.count ?? 0;
    }
  );
}

/**
 * Membaca daftar kunjungan pasien tertaut untuk konfirmasi oleh pendamping aktif (D8).
 */
export async function listConfirmableVisitsForPatient(
  session: CareProofSessionActor,
  patientUserId: string
): Promise<CompanionConfirmableVisitItem[]> {
  return await withContext(
    {
      userId: session.userId,
      role: session.role as AppDbRole,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{
        id: string;
        recorded_at: string;
        facility_name: string;
        recorded_rule_ids: string[] | null;
        consent_shared_fields: string[] | null;
        status: CareProofStatus | null;
        confirmed_by: CareProofConfirmedBy | null;
        unmet_need_codes: string[] | null;
      }>(
        `SELECT
           v.id,
           v.recorded_at,
           f.name AS facility_name,
           v.recorded_rule_ids,
           c.shared_fields AS consent_shared_fields,
           vc.status,
           vc.confirmed_by,
           vc.unmet_need_codes
         FROM visits v
         JOIN facilities f ON f.id = v.facility_id
         LEFT JOIN consents c ON c.id = v.consent_id
         LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
         WHERE v.patient_user_id = $1
           AND v.recorded_at IS NOT NULL
           AND v.recorded_at >= now() - interval '30 days'
         ORDER BY v.recorded_at DESC;`,
        [patientUserId]
      );

      if (res.rows.length === 0) {
        return [];
      }

      const allRuleIds = Array.from(
        new Set(res.rows.flatMap((r) => r.recorded_rule_ids || []))
      );

      const ruleMap = new Map<
        string,
        { actionText: string; iconName: string; category: string }
      >();
      if (allRuleIds.length > 0) {
        const rulesRes = await tx.query<{
          id: string;
          action_text: string;
          icon_name: string;
          category: string;
        }>(
          `SELECT ar.id, ar.action_text, ar.icon_name, nc.category
           FROM accommodation_rules ar
           JOIN needs_catalog nc ON nc.code = ar.trigger_need_code
           WHERE ar.id = ANY($1);`,
          [allRuleIds]
        );
        for (const row of rulesRes.rows) {
          ruleMap.set(row.id, {
            actionText: row.action_text,
            iconName: row.icon_name,
            category: row.category,
          });
        }
      }

      return res.rows.map((row) => {
        const ruleIds = row.recorded_rule_ids || [];
        const assistance: RecordedAssistanceItem[] = ruleIds
          .map((ruleId) => {
            const rule = ruleMap.get(ruleId);
            if (!rule) return null;
            return {
              ruleId,
              actionText: rule.actionText,
              iconName: rule.iconName,
            };
          })
          .filter((r): r is RecordedAssistanceItem => r !== null);

        const categoriesFromRules = ruleIds
          .map((id) => ruleMap.get(id)?.category)
          .filter((c): c is string => Boolean(c));
        const categoriesFromConsent = (
          row.consent_shared_fields || []
        ).filter((f): f is NeedCategory =>
          (NEED_CATEGORIES as readonly string[]).includes(f)
        );
        const sharedCategories = Array.from(
          new Set([...categoriesFromRules, ...categoriesFromConsent])
        ) as NeedCategory[];

        const isPatientConfirmed = row.confirmed_by === "patient";

        return {
          visitId: row.id,
          recordedAt: new Date(row.recorded_at).toISOString(),
          facilityName: row.facility_name,
          assistance,
          sharedCategories,
          currentAnswer: row.status
            ? {
                status: row.status,
                confirmedBy: row.confirmed_by as CareProofConfirmedBy,
                unmetNeedCodes: row.unmet_need_codes || [],
              }
            : null,
          isPatientConfirmed,
        };
      });
    }
  );
}
