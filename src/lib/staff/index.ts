import { withContext } from "../../db";
import { recordAuditEvent } from "../audit";
import { normalizePhoneNumber } from "../auth/crypto";
import { maskPhone } from "../account";

import { STAFF_NAME_MAX_LENGTH, STAFF_UNIT_MAX_LENGTH } from "./limits";

export { STAFF_NAME_MAX_LENGTH, STAFF_UNIT_MAX_LENGTH };

export type StaffStatus = "invited" | "active" | "inactive";

export interface StaffListItem {
  userId: string;
  name: string;
  unit: string;
  status: StaffStatus;
  phoneMasked: string;
}

export class StaffAdminError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "StaffAdminError";
  }
}

interface AdminSession {
  userId: string;
  role: string;
  facilityId?: string | null;
}

function ctx(session: AdminSession) {
  if (session.role !== "facility_admin" || !session.facilityId) {
    throw new StaffAdminError("Hanya admin fasilitas yang dapat mengelola petugas", 403, "FORBIDDEN");
  }
  return {
    userId: session.userId,
    role: "facility_admin" as const,
    facilityId: session.facilityId,
  };
}

const UUID = /^[0-9a-f-]{36}$/i;

function cleanText(value: unknown, max: number, label: string): string {
  const v = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!v || v.length > max) {
    throw new StaffAdminError(`${label} wajib diisi, maksimal ${max} karakter`, 400, "INVALID_INPUT");
  }
  return v;
}

/** Daftar petugas fasilitas admin (nomor disamarkan). Terurut: menunggu aktivasi, aktif, nonaktif. */
export async function listStaff(session: AdminSession): Promise<StaffListItem[]> {
  const c = ctx(session);
  return withContext(c, async (tx) => {
    const res = await tx.query<{
      id: string;
      display_name: string;
      phone: string | null;
      unit: string;
      status: StaffStatus;
    }>(
      `SELECT u.id, u.display_name, u.phone, sm.unit, sm.status
       FROM staff_memberships sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.facility_id = $1 AND u.role = 'staff'
       ORDER BY CASE sm.status WHEN 'invited' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
                lower(u.display_name);`,
      [c.facilityId]
    );
    return res.rows.map((r) => ({
      userId: r.id,
      name: r.display_name,
      unit: r.unit,
      status: r.status,
      phoneMasked: maskPhone(r.phone),
    }));
  });
}

/** A5: daftarkan petugas baru. Status awal "Menunggu aktivasi" sampai petugas login pertama. */
export async function createStaff(
  session: AdminSession,
  input: { name: unknown; phone: unknown; unit: unknown }
): Promise<{ userId: string }> {
  const c = ctx(session);
  const name = cleanText(input.name, STAFF_NAME_MAX_LENGTH, "Nama");
  const unit = cleanText(input.unit, STAFF_UNIT_MAX_LENGTH, "Unit");
  let phone: string;
  try {
    phone = normalizePhoneNumber(String(input.phone ?? ""));
  } catch {
    throw new StaffAdminError("Nomor HP tidak valid. Contoh: 0812 3456 7890", 400, "INVALID_PHONE");
  }

  return withContext(c, async (tx) => {
    let row: { user_id: string; audit_subject_id: string } | undefined;
    try {
      const res = await tx.query<{ user_id: string; audit_subject_id: string }>(
        "SELECT * FROM admin_create_staff($1, $2, $3);",
        [name, phone, unit]
      );
      row = res.rows[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("PHONE_TAKEN")) {
        throw new StaffAdminError("Nomor ini tidak dapat didaftarkan. Gunakan nomor lain.", 409, "PHONE_UNAVAILABLE");
      }
      throw err;
    }
    if (!row) throw new StaffAdminError("Gagal mendaftarkan petugas", 500, "CREATE_FAILED");
    await recordAuditEvent(tx, {
      eventType: "staff_invited",
      actorId: c.userId,
      actorRole: "facility_admin",
      subjectRef: row.audit_subject_id,
      facilityId: c.facilityId,
    });
    return { userId: row.user_id };
  });
}

/** Ubah nama dan unit petugas. Nomor HP tidak dapat diubah (ganti = daftarkan ulang). */
export async function updateStaff(
  session: AdminSession,
  input: { userId: string; name: unknown; unit: unknown }
): Promise<void> {
  const c = ctx(session);
  if (!UUID.test(input.userId)) throw new StaffAdminError("Petugas tidak ditemukan", 404, "NOT_FOUND");
  const name = cleanText(input.name, STAFF_NAME_MAX_LENGTH, "Nama");
  const unit = cleanText(input.unit, STAFF_UNIT_MAX_LENGTH, "Unit");
  await withContext(c, async (tx) => {
    const m = await tx.query<{ audit_subject_id: string }>(
      `UPDATE staff_memberships sm SET unit = $3, updated_at = now()
       FROM users u
       WHERE sm.user_id = $1 AND sm.facility_id = $2 AND u.id = sm.user_id AND u.role = 'staff'
       RETURNING u.audit_subject_id;`,
      [input.userId, c.facilityId, unit]
    );
    if (m.rows.length === 0) throw new StaffAdminError("Petugas tidak ditemukan", 404, "NOT_FOUND");
    await tx.query(`UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1 AND role = 'staff';`, [input.userId, name]);
    await recordAuditEvent(tx, {
      eventType: "staff_updated",
      actorId: c.userId,
      actorRole: "facility_admin",
      subjectRef: m.rows[0].audit_subject_id,
      facilityId: c.facilityId,
    });
  });
}

/**
 * Nonaktifkan atau aktifkan kembali. Penjaga sesi memeriksa keanggotaan di setiap permintaan,
 * sehingga petugas nonaktif langsung ditolak (pindai berikutnya gagal).
 * Aktifkan kembali: kembali "Menunggu aktivasi" bila belum pernah login.
 */
export async function setStaffActive(
  session: AdminSession,
  input: { userId: string; active: boolean }
): Promise<StaffStatus> {
  const c = ctx(session);
  if (!UUID.test(input.userId)) throw new StaffAdminError("Petugas tidak ditemukan", 404, "NOT_FOUND");
  return withContext(c, async (tx) => {
    const cur = await tx.query<{ status: StaffStatus; user_status: string; audit_subject_id: string }>(
      `SELECT sm.status, u.status AS user_status, u.audit_subject_id
       FROM staff_memberships sm JOIN users u ON u.id = sm.user_id
       WHERE sm.user_id = $1 AND sm.facility_id = $2 AND u.role = 'staff'
       FOR UPDATE OF sm;`,
      [input.userId, c.facilityId]
    );
    const row = cur.rows[0];
    if (!row) throw new StaffAdminError("Petugas tidak ditemukan", 404, "NOT_FOUND");
    let next: StaffStatus;
    if (!input.active) {
      next = "inactive";
    } else if (row.status === "inactive") {
      next = row.user_status === "pending" ? "invited" : "active";
    } else {
      return row.status;
    }
    if (next === row.status && !(input.active && row.user_status === "inactive")) return next;
    if (input.active && row.user_status === "inactive") {
      await tx.query(
        `UPDATE users SET status = 'active', updated_at = now() WHERE id = $1 AND role = 'staff' AND status = 'inactive';`,
        [input.userId]
      );
    }
    await tx.query(
      `UPDATE staff_memberships SET status = $3, updated_at = now() WHERE user_id = $1 AND facility_id = $2;`,
      [input.userId, c.facilityId, next]
    );
    await recordAuditEvent(tx, {
      eventType: input.active ? "staff_reactivated" : "staff_deactivated",
      actorId: c.userId,
      actorRole: "facility_admin",
      subjectRef: row.audit_subject_id,
      facilityId: c.facilityId,
    });
    return next;
  });
}
