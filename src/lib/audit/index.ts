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
