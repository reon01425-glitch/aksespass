import { withContext } from "../../db";
import { recordAuditEvent } from "../audit";
import {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "./constants";
import {
  NEED_CATEGORIES,
  type NeedCategory,
} from "../consent/constants";

export {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "./constants";

export type PassportStatus = "complete" | "empty";

export interface CompanionUpdateInfo {
  companionName: string;
  updatedAt: string;
}

export interface OwnPassportStatusResult {
  status: PassportStatus;
  preferredName: string | null;
  needCount: number;
  lastUpdatedByCompanion?: CompanionUpdateInfo | null;
}

export interface NeedsCatalogItem {
  code: string;
  label: string;
  iconName: string;
  category: NeedCategory;
  sortOrder: number;
}

export interface NeedsCategoryGroup {
  category: NeedCategory;
  categoryLabel: string;
  items: NeedsCatalogItem[];
}

export interface OwnPassportData {
  preferredName: string;
  namaPanggilan: string;
  needCodes: string[];
  kodeKebutuhan: string[];
  patientNote: string | null;
  catatan: string | null;
  updatedAt: string;
  waktuUbah: string;
  lastUpdatedByCompanion?: CompanionUpdateInfo | null;
}

export interface SavePassportInput {
  preferredName?: string;
  namaPanggilan?: string;
  needCodes?: string[];
  kodeKebutuhan?: string[];
  patientNote?: string | null;
  catatan?: string | null;
}

export interface SavePassportOptions {
  targetPatientUserId?: string;
  actorUserId?: string;
  actorRole?: string;
}

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  komunikasi: "Komunikasi",
  penglihatan: "Penglihatan",
  pendengaran: "Pendengaran",
  mobilitas: "Mobilitas",
  sensorik_lingkungan: "Sensorik dan Lingkungan",
  pendampingan: "Pendampingan",
};

export interface PassportSessionActor {
  userId: string;
  role: string;
  facilityId?: string | null;
  sessionId?: string;
}

/**
 * Membaca ringkasan status paspor milik pasien sendiri (P4).
 */
export async function getOwnPassportStatus(
  session: PassportSessionActor,
  targetPatientUserId?: string
): Promise<OwnPassportStatusResult> {
  const targetUserId =
    session.role === "patient"
      ? session.userId
      : targetPatientUserId || session.userId;

  if (!targetUserId) {
    return {
      status: "empty",
      preferredName: null,
      needCount: 0,
      lastUpdatedByCompanion: null,
    };
  }

  return withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{
        preferred_name: string;
        need_count: string;
        last_updated_by_companion_id: string | null;
        last_updated_by_companion_at: string | null;
        companion_name: string | null;
      }>(
        `SELECT pp.preferred_name, count(ppn.need_code) as need_count,
                pp.last_updated_by_companion_id, pp.last_updated_by_companion_at,
                get_patient_companion_name(pp.last_updated_by_companion_id) as companion_name
         FROM patient_profiles pp
         LEFT JOIN patient_profile_needs ppn ON ppn.profile_id = pp.id
         WHERE pp.user_id = $1
         GROUP BY pp.id, pp.preferred_name, pp.last_updated_by_companion_id, pp.last_updated_by_companion_at;`,
        [targetUserId]
      );

      if (res.rows.length === 0) {
        return {
          status: "empty",
          preferredName: null,
          needCount: 0,
          lastUpdatedByCompanion: null,
        };
      }

      const count = parseInt(res.rows[0].need_count, 10) || 0;
      const row = res.rows[0];
      const lastUpdatedByCompanion = row.last_updated_by_companion_id
        ? {
            companionName: row.companion_name || "Pendamping",
            updatedAt: row.last_updated_by_companion_at
              ? new Date(row.last_updated_by_companion_at).toISOString()
              : new Date().toISOString(),
          }
        : null;

      return {
        status: count > 0 ? "complete" : "empty",
        preferredName: row.preferred_name,
        needCount: count,
        lastUpdatedByCompanion,
      };
    }
  );
}

/**
 * Mengambil katalog kebutuhan yang dikelompokkan per kategori.
 * Kategori tanpa item tidak dikembalikan.
 */
export async function getNeedsCatalog(
  session?: PassportSessionActor
): Promise<NeedsCategoryGroup[]> {
  const context = session
    ? {
        userId: session.userId,
        role: session.role,
        facilityId: session.facilityId,
      }
    : {};

  return withContext(context, async (tx) => {
    const res = await tx.query<{
      code: string;
      label: string;
      icon_name: string;
      category: NeedCategory;
      sort_order: number;
    }>(
      `SELECT code, label, icon_name, category, sort_order
       FROM needs_catalog
       ORDER BY sort_order ASC, code ASC;`
    );

    const itemsByCategory = new Map<NeedCategory, NeedsCatalogItem[]>();
    for (const cat of NEED_CATEGORIES) {
      itemsByCategory.set(cat, []);
    }

    for (const row of res.rows) {
      const group = itemsByCategory.get(row.category);
      if (group) {
        group.push({
          code: row.code,
          label: row.label,
          iconName: row.icon_name,
          category: row.category,
          sortOrder: row.sort_order,
        });
      }
    }

    const groups: NeedsCategoryGroup[] = [];
    for (const cat of NEED_CATEGORIES) {
      const items = itemsByCategory.get(cat) || [];
      if (items.length > 0) {
        groups.push({
          category: cat,
          categoryLabel: NEED_CATEGORY_LABELS[cat] || cat,
          items,
        });
      }
    }

    return groups;
  });
}

/**
 * Membaca data lengkap paspor pasien sendiri.
 * Mengembalikan nama panggilan, kode kebutuhan, catatan, dan waktu ubah — atau null bila belum ada.
 */
export async function getOwnPassport(
  session: PassportSessionActor,
  targetPatientUserId?: string
): Promise<OwnPassportData | null> {
  const targetUserId =
    session.role === "patient"
      ? session.userId
      : targetPatientUserId || session.userId;

  if (!targetUserId) {
    return null;
  }

  return withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const profileRes = await tx.query<{
        id: string;
        user_id: string;
        preferred_name: string;
        patient_note: string | null;
        updated_at: string;
        last_updated_by_companion_id: string | null;
        last_updated_by_companion_at: string | null;
        companion_name: string | null;
      }>(
        `SELECT id, user_id, preferred_name, patient_note, updated_at,
                last_updated_by_companion_id, last_updated_by_companion_at,
                get_patient_companion_name(last_updated_by_companion_id) as companion_name
         FROM patient_profiles
         WHERE user_id = $1;`,
        [targetUserId]
      );

      if (profileRes.rows.length === 0) {
        return null;
      }

      const profile = profileRes.rows[0];
      const needsRes = await tx.query<{
        need_code: string;
      }>(
        `SELECT ppn.need_code
         FROM patient_profile_needs ppn
         JOIN needs_catalog nc ON nc.code = ppn.need_code
         WHERE ppn.profile_id = $1
         ORDER BY nc.sort_order ASC, nc.code ASC;`,
        [profile.id]
      );

      const needCodes = needsRes.rows.map((r) => r.need_code);
      const updatedAtIso = new Date(profile.updated_at).toISOString();
      const lastUpdatedByCompanion = profile.last_updated_by_companion_id
        ? {
            companionName: profile.companion_name || "Pendamping",
            updatedAt: profile.last_updated_by_companion_at
              ? new Date(profile.last_updated_by_companion_at).toISOString()
              : new Date().toISOString(),
          }
        : null;

      return {
        preferredName: profile.preferred_name,
        namaPanggilan: profile.preferred_name,
        needCodes,
        kodeKebutuhan: needCodes,
        patientNote: profile.patient_note,
        catatan: profile.patient_note,
        updatedAt: updatedAtIso,
        waktuUbah: updatedAtIso,
        lastUpdatedByCompanion,
      };
    }
  );
}

/**
 * Menyimpan atau memperbarui data paspor pasien sendiri dalam satu transaksi withContext.
 * Memvalidasi skema ketat: menolak kunci tak dikenal (termasuk apa pun bernama diagnosis/diagnosa).
 * Mengganti seluruh daftar kebutuhan dan menyetel penanda pembaruan terakhir.
 */
export async function saveOwnPassport(
  session: PassportSessionActor,
  rawInput: unknown,
  options?: string | SavePassportOptions
): Promise<OwnPassportData> {
  if (
    typeof rawInput !== "object" ||
    rawInput === null ||
    Array.isArray(rawInput)
  ) {
    throw new Error("Masukan paspor harus berupa objek.");
  }

  const allowedKeys = new Set([
    "preferredName",
    "namaPanggilan",
    "needCodes",
    "kodeKebutuhan",
    "patientNote",
    "catatan",
  ]);

  for (const key of Object.keys(rawInput)) {
    if (key.toLowerCase().includes("diagnos")) {
      throw new Error("Kolom diagnosis tidak diizinkan.");
    }
    if (!allowedKeys.has(key)) {
      throw new Error(`Kunci masukan tidak dikenal: ${key}`);
    }
  }

  const input = rawInput as Record<string, unknown>;

  const rawPreferredName = (input.preferredName ?? input.namaPanggilan) as unknown;
  const rawNeedCodes = (input.needCodes ?? input.kodeKebutuhan) as unknown;
  const rawPatientNote = (input.patientNote ?? input.catatan) as unknown;

  if (typeof rawPreferredName !== "string") {
    throw new Error("Nama panggilan wajib diisi.");
  }
  const preferredName = rawPreferredName.trim();
  if (preferredName.length === 0) {
    throw new Error("Nama panggilan wajib diisi.");
  }
  if (preferredName.length > PATIENT_PREFERRED_NAME_MAX_LENGTH) {
    throw new Error(
      `Nama panggilan maksimal ${PATIENT_PREFERRED_NAME_MAX_LENGTH} karakter.`
    );
  }

  if (!Array.isArray(rawNeedCodes)) {
    throw new Error("Kode kebutuhan harus berupa daftar array.");
  }
  const uniqueNeedCodes = Array.from(
    new Set(
      rawNeedCodes
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );
  if (uniqueNeedCodes.length === 0) {
    throw new Error("Pilih minimal satu kebutuhan.");
  }

  let patientNote: string | null = null;
  if (
    rawPatientNote !== undefined &&
    rawPatientNote !== null &&
    rawPatientNote !== ""
  ) {
    if (typeof rawPatientNote !== "string") {
      throw new Error("Catatan harus berupa teks.");
    }
    const trimmedNote = rawPatientNote.trim();
    if (trimmedNote.length > PATIENT_NOTE_MAX_LENGTH) {
      throw new Error(
        `Catatan maksimal ${PATIENT_NOTE_MAX_LENGTH} karakter.`
      );
    }
    patientNote = trimmedNote.length > 0 ? trimmedNote : null;
  }

  const opts =
    typeof options === "string"
      ? { targetPatientUserId: options }
      : options || {};

  const targetUserId =
    session.role === "patient"
      ? session.userId
      : opts.targetPatientUserId || session.userId;

  const actorRole = opts.actorRole || session.role;
  const actorUserId = opts.actorUserId || session.userId;

  if (
    session.role === "patient" &&
    opts.targetPatientUserId &&
    opts.targetPatientUserId !== session.userId
  ) {
    throw new Error("Pasien hanya dapat menyimpan paspor miliknya sendiri.");
  }

  return withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      // 1. Verifikasi semua need_codes ada di needs_catalog
      const validNeedsRes = await tx.query<{ code: string }>(
        `SELECT code FROM needs_catalog WHERE code = ANY($1::text[]);`,
        [uniqueNeedCodes]
      );
      const validCodesSet = new Set(validNeedsRes.rows.map((r) => r.code));
      for (const code of uniqueNeedCodes) {
        if (!validCodesSet.has(code)) {
          throw new Error(`Kode kebutuhan tidak valid: ${code}`);
        }
      }

      // 2. Set penanda perubahan terakhir: jika oleh pasien, companion_id = null
      const companionId = actorRole === "companion" ? actorUserId : null;
      const companionAt =
        actorRole === "companion" ? new Date().toISOString() : null;

      // 3. Upsert patient_profiles
      const profileRes = await tx.query<{
        id: string;
        user_id: string;
        preferred_name: string;
        patient_note: string | null;
        updated_at: string;
      }>(
        `INSERT INTO patient_profiles (
           user_id,
           preferred_name,
           patient_note,
           last_updated_by_companion_id,
           last_updated_by_companion_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id)
         DO UPDATE SET
           preferred_name = EXCLUDED.preferred_name,
           patient_note = EXCLUDED.patient_note,
           last_updated_by_companion_id = EXCLUDED.last_updated_by_companion_id,
           last_updated_by_companion_at = EXCLUDED.last_updated_by_companion_at,
           updated_at = now()
         RETURNING id, user_id, preferred_name, patient_note, updated_at;`,
        [targetUserId, preferredName, patientNote, companionId, companionAt]
      );

      const profile = profileRes.rows[0];

      // 4. Ganti isi patient_profile_needs
      await tx.query(
        `DELETE FROM patient_profile_needs WHERE profile_id = $1;`,
        [profile.id]
      );

      await tx.query(
        `INSERT INTO patient_profile_needs (profile_id, need_code)
         SELECT $1, unnest($2::text[]);`,
        [profile.id, uniqueNeedCodes]
      );

      // 5. Bila diubah oleh pendamping, catat audit event profile_changed_by_companion
      if (actorRole === "companion") {
        const compRes = await tx.query<{ patient_subject_ref: string }>(
          `SELECT patient_subject_ref
           FROM companions
           WHERE patient_user_id = $1 AND companion_user_id = $2;`,
          [targetUserId, actorUserId]
        );

        let subjectRef = compRes.rows[0]?.patient_subject_ref;
        if (!subjectRef) {
          const uRes = await tx.query<{ audit_subject_id: string }>(
            "SELECT audit_subject_id FROM users WHERE id = $1;",
            [targetUserId]
          );
          subjectRef = uRes.rows[0]?.audit_subject_id;
        }

        if (subjectRef) {
          await recordAuditEvent(tx, {
            eventType: "profile_changed_by_companion",
            actorId: actorUserId,
            actorRole: "companion",
            subjectRef,
            occurredAt: new Date(),
          });
        }
      }

      const updatedAtIso = new Date(profile.updated_at).toISOString();

      return {
        preferredName: profile.preferred_name,
        namaPanggilan: profile.preferred_name,
        needCodes: uniqueNeedCodes,
        kodeKebutuhan: uniqueNeedCodes,
        patientNote: profile.patient_note,
        catatan: profile.patient_note,
        updatedAt: updatedAtIso,
        waktuUbah: updatedAtIso,
      };
    }
  );
}
