import { type AppDbRole, APP_DB_ROLES, type TransactionClient } from "../../db";
import {
  type AllowedSharedField,
  isAllowedSharedField,
  normalizeAuditField,
} from "../consent/constants";

export const AUDIT_EVENT_TYPES = [
  "qr_created",
  "qr_revoked",
  "qr_scanned",
  "profile_read",
  "brief_sent",
  "brief_opened",
  "qr_scan_rejected",
  "visit_recorded",
  "visit_synced",
  "visit_confirmed",
  "companion_link_requested",
  "companion_linked",
  "companion_unlinked",
  "profile_changed_by_companion",
  "delegation_signed_off",
  "access_reported",
  "account_deleted",
  "staff_invited",
  "staff_activated",
  "staff_updated",
  "staff_deactivated",
  "staff_reactivated",
  "facility_action_created",
  "facility_action_updated",
  "recovery_requested",
  "recovery_cancelled",
  "recovery_completed",
  "rule_draft_saved",
  "rule_submitted",
  "rule_reviewed",
  "rule_published",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export function isAuditEventType(val: string): val is AuditEventType {
  return (AUDIT_EVENT_TYPES as readonly string[]).includes(val);
}

export interface AuditEventInput {
  eventType: AuditEventType;
  actorId?: string | null;
  actorRole?: AppDbRole | null;
  subjectRef?: string | null;
  facilityId?: string | null;
  fields?: readonly AllowedSharedField[] | AllowedSharedField[];
  occurredAt?: Date | string | null;
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function validateUuid(val: string, name: string): void {
  if (!UUID_REGEX.test(val)) {
    throw new Error(`${name} pada event audit harus berupa UUID valid: ${val}`);
  }
}

/**
 * Mencatat kejadian audit ke tabel audit_events di dalam transaksi yang sama.
 * Mewajibkan TransactionClient bertipe bermerek dari withContext, memastikan audit
 * selalu atomik dengan aksinya (bila aksi gagal, audit batal; bila audit gagal, aksi batal).
 * Nilai data profil TIDAK PERNAH diterima — hanya nama field dari konstanta bersama yang diizinkan.
 */
export async function recordAuditEvent(
  tx: TransactionClient,
  event: AuditEventInput
): Promise<void> {
  if (!tx || typeof tx.query !== "function") {
    throw new Error(
      "recordAuditEvent mewajibkan TransactionClient yang sah dari withContext."
    );
  }

  if (!isAuditEventType(event.eventType)) {
    throw new Error(`Tipe event audit tidak dikenal: ${String(event.eventType)}`);
  }

  if (event.actorRole !== undefined && event.actorRole !== null) {
    if (!(APP_DB_ROLES as readonly string[]).includes(event.actorRole)) {
      throw new Error(`Peran pelaku audit tidak valid: ${event.actorRole}`);
    }
  }

  if (event.actorId) {
    validateUuid(event.actorId, "actorId");
  }

  if (event.subjectRef) {
    validateUuid(event.subjectRef, "subjectRef");
  }

  if (event.facilityId) {
    validateUuid(event.facilityId, "facilityId");
  }

  const normalizedFields: string[] = [];
  if (event.fields) {
    if (!Array.isArray(event.fields)) {
      throw new Error("fields pada event audit harus berupa array nama field.");
    }

    for (const f of event.fields) {
      if (typeof f !== "string" || !isAllowedSharedField(f)) {
        throw new Error(`Field audit tidak diizinkan: ${String(f)}`);
      }
      normalizedFields.push(normalizeAuditField(f));
    }
  }

  await tx.query(
    `INSERT INTO audit_events (
      event_type,
      actor_id,
      actor_role,
      subject_ref,
      facility_id,
      fields,
      occurred_at
    ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()));`,
    [
      event.eventType,
      event.actorId ?? null,
      event.actorRole ?? null,
      event.subjectRef ?? null,
      event.facilityId ?? null,
      normalizedFields,
      event.occurredAt ?? null,
    ]
  );
}

import { withContext } from "../../db";
import { formatDateTimeWib } from "../consent/time";

export const HUMAN_FIELD_LABELS: Record<string, string> = {
  nama_panggilan: "Nama panggilan",
  preferred_name: "Nama panggilan",
  komunikasi: "Komunikasi",
  penglihatan: "Penglihatan",
  pendengaran: "Pendengaran",
  mobilitas: "Mobilitas",
  sensorik_lingkungan: "Sensorik Lingkungan",
  pendampingan: "Pendampingan",
  catatan_pasien: "Catatan",
  catatan: "Catatan",
};

/**
 * Memetakan daftar nama field mentah di audit ke label bahasa Indonesia yang ramah manusia.
 * Field yang tidak dikenal TIDAK AKAN dicetak mentah (diabaikan).
 */
export function mapAuditFieldsToHumanLabels(
  fields: readonly string[] | null | undefined
): string[] {
  if (!fields || !Array.isArray(fields)) return [];
  const labels: string[] = [];
  for (const f of fields) {
    if (typeof f !== "string") continue;
    const key = f.toLowerCase().trim();
    if (HUMAN_FIELD_LABELS[key]) {
      labels.push(HUMAN_FIELD_LABELS[key]);
    }
  }
  return labels;
}

export interface RawAccessHistoryRow {
  occurred_at: Date | string;
  event_type: AuditEventType;
  actor_label: string;
  facility_name: string | null;
  fields: string[];
}

export interface AccessHistoryEntry {
  id: string;
  occurredAt: string;
  occurredAtDate: Date;
  timeTextWib: string;
  eventType: AuditEventType;
  title: string;
  actorLabel: string;
  facilityName: string | null;
  fieldLabels: string[];
}

/**
 * Fungsi murni untuk memetakan baris event audit ke entri tampilan riwayat pasien (P19).
 * - qr_scanned disaring (return null) karena selalu berpasangan dengan profile_read.
 * - profile_read memuat nama petugas/pelaku dan fasilitas, serta field yang dilihat.
 * - qr_scan_rejected memuat label penolakan dan fasilitas.
 * - qr_created / qr_revoked memuat aksi "Anda membuat/mencabut QR untuk <fasilitas>".
 * - Event lain memiliki label umum tanpa detail sensitif.
 */
export function mapAuditEventToDisplayEntry(
  row: RawAccessHistoryRow,
  index: number = 0
): AccessHistoryEntry | null {
  if (row.event_type === "qr_scanned") {
    return null;
  }

  const occurredAtDate = new Date(row.occurred_at);
  const timeTextWib = formatDateTimeWib(occurredAtDate);
  const actor = row.actor_label?.trim() || "Sistem";
  const facility = row.facility_name?.trim() || null;

  let title = "";
  let fieldLabels: string[] = [];

  switch (row.event_type) {
    case "profile_read": {
      title = facility
        ? `Data dibuka oleh ${actor} — ${facility}`
        : `Data dibuka oleh ${actor}`;
      fieldLabels = mapAuditFieldsToHumanLabels(row.fields);
      break;
    }
    case "qr_scan_rejected": {
      title = facility
        ? `Percobaan pindai ditolak — ${facility}`
        : "Percobaan pindai ditolak";
      break;
    }
    case "qr_created": {
      title = facility
        ? `Anda membuat QR untuk ${facility}`
        : "Anda membuat QR";
      break;
    }
    case "qr_revoked": {
      title = facility
        ? `Anda mencabut QR untuk ${facility}`
        : "Anda mencabut QR";
      break;
    }
    case "brief_sent": {
      title = facility ? `Brief dikirim ke ${facility}` : "Brief dikirim";
      break;
    }
    case "brief_opened": {
      title = facility ? `Brief dibuka — ${facility}` : "Brief dibuka";
      break;
    }
    case "visit_recorded": {
      title = facility ? `Kunjungan dicatat — ${facility}` : "Kunjungan dicatat";
      break;
    }
    case "visit_synced": {
      title = "Kunjungan tersinkron";
      break;
    }
    case "visit_confirmed": {
      title = "Konfirmasi kunjungan dikirim";
      break;
    }
    case "companion_link_requested": {
      title = "Permintaan tautan pendamping";
      break;
    }
    case "companion_linked": {
      title =
        actor && actor !== "Sistem" && actor !== "Anda"
          ? `Pendamping ${actor} ditautkan`
          : "Pendamping ditautkan";
      break;
    }
    case "companion_unlinked": {
      title =
        actor && actor !== "Sistem" && actor !== "Anda"
          ? `Pendamping ${actor} dilepas`
          : "Pendamping dilepas";
      break;
    }
    case "profile_changed_by_companion": {
      title =
        actor && actor !== "Sistem" && actor !== "Anda"
          ? `Paspor diubah oleh ${actor}`
          : "Paspor diubah oleh pendamping";
      break;
    }
    case "delegation_signed_off": {
      title = "Delegasi darurat disahkan";
      break;
    }
    case "access_reported": {
      title = "Akses dilaporkan";
      break;
    }
    case "account_deleted": {
      title = "Akun dihapus";
      break;
    }
    case "recovery_requested": {
      title =
        actor && actor !== "Sistem" && actor !== "Anda"
          ? `Pemulihan nomor akun diajukan oleh ${actor}`
          : "Pemulihan nomor akun diajukan";
      break;
    }
    case "recovery_cancelled": {
      title = "Permintaan pemulihan nomor akun dibatalkan";
      break;
    }
    case "recovery_completed": {
      title = "Nomor akun dipindahkan";
      break;
    }
    default: {
      title = "Aktivitas akun";
      break;
    }
  }

  return {
    id: `history-${occurredAtDate.getTime()}-${index}`,
    occurredAt: occurredAtDate.toISOString(),
    occurredAtDate,
    timeTextWib,
    eventType: row.event_type,
    title,
    actorLabel: actor,
    facilityName: facility,
    fieldLabels,
  };
}

export interface AccessHistoryFilter {
  from?: Date | string | null;
  to?: Date | string | null;
  facilityId?: string | null;
}

/**
 * Mengambil riwayat akses khusus milik pasien pemanggil (P19) lewat fungsi SECURITY DEFINER.
 * Hanya pasien yang diizinkan memanggil fungsi ini (peran lain menghasilkan []).
 */
export async function getOwnAccessHistory(
  session: { userId: string; role: AppDbRole },
  filter?: AccessHistoryFilter
): Promise<AccessHistoryEntry[]> {
  if (session.role !== "patient") {
    return [];
  }

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
    },
    async (tx) => {
      const fromParam = filter?.from ? new Date(filter.from).toISOString() : null;
      const toParam = filter?.to ? new Date(filter.to).toISOString() : null;
      const facilityIdParam = filter?.facilityId ? filter.facilityId : null;

      const res = await tx.query<RawAccessHistoryRow>(
        `SELECT
           occurred_at,
           event_type,
           actor_label,
           facility_name,
           fields
         FROM get_patient_access_history($1::timestamptz, $2::timestamptz, $3::uuid);`,
        [fromParam, toParam, facilityIdParam]
      );

      return res.rows
        .map((row, idx) => mapAuditEventToDisplayEntry(row, idx))
        .filter((entry): entry is AccessHistoryEntry => entry !== null);
    }
  );
}

