import { withContext } from "../../db";
import { recordAuditEvent } from "../audit";
import { NEED_CATEGORIES, type NeedCategory } from "../consent/constants";
import {
  currentJakartaPeriod,
  getFacilityDashboard,
  type DashboardCell,
  type DashboardPeriod,
} from "../dashboard";
import { NEED_CATEGORY_LABELS } from "../passport";

import {
  FACILITY_ACTION_NOTE_MAX_LENGTH,
  FACILITY_ACTION_STATUS_LABELS,
  type FacilityActionStatus,
} from "./shared";

export { FACILITY_ACTION_NOTE_MAX_LENGTH, FACILITY_ACTION_STATUS_LABELS };
export type { FacilityActionStatus };

export interface FacilityActionItem {
  id: string;
  category: NeedCategory;
  categoryLabel: string;
  status: FacilityActionStatus;
  stepNote: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export class FacilityActionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly existingId?: string
  ) {
    super(message);
    this.name = "FacilityActionError";
  }
}

interface AdminSession {
  userId: string;
  role: string;
  facilityId?: string | null;
}

const UUID = /^[0-9a-f-]{36}$/i;

function ctx(session: AdminSession) {
  if (session.role !== "facility_admin" || !session.facilityId) {
    throw new FacilityActionError("Hanya admin fasilitas", 403, "FORBIDDEN");
  }
  return { userId: session.userId, role: "facility_admin" as const, facilityId: session.facilityId };
}

interface Row {
  id: string;
  need_category: NeedCategory;
  status: FacilityActionStatus;
  step_note: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function map(r: Row): FacilityActionItem {
  return {
    id: r.id,
    category: r.need_category,
    categoryLabel: NEED_CATEGORY_LABELS[r.need_category] ?? r.need_category,
    status: r.status,
    stepNote: r.step_note,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
  };
}

const COLUMNS = "id, need_category, status, step_note, created_at, updated_at, completed_at";

/** A8: daftar tindak lanjut fasilitas, yang berjalan di atas. */
export async function listFacilityActions(session: AdminSession): Promise<FacilityActionItem[]> {
  const c = ctx(session);
  return withContext(c, async (tx) => {
    const res = await tx.query<Row>(
      `SELECT ${COLUMNS} FROM facility_actions WHERE facility_id = $1
       ORDER BY (status = 'selesai'), updated_at DESC;`,
      [c.facilityId]
    );
    return res.rows.map(map);
  });
}

/** A7 → A8: buat tindak lanjut untuk satu kategori. Bila sudah ada yang berjalan, kembalikan galat 409 + id-nya. */
export async function createFacilityAction(
  session: AdminSession,
  input: { category: unknown }
): Promise<{ id: string }> {
  const c = ctx(session);
  const category = String(input.category ?? "");
  if (!(NEED_CATEGORIES as readonly string[]).includes(category)) {
    throw new FacilityActionError("Kategori tidak dikenal", 400, "INVALID_CATEGORY");
  }
  return withContext(c, async (tx) => {
    const existing = await tx.query<{ id: string }>(
      `SELECT id FROM facility_actions
       WHERE facility_id = $1 AND need_category = $2 AND status <> 'selesai';`,
      [c.facilityId, category]
    );
    if (existing.rows[0]) {
      throw new FacilityActionError(
        "Sudah ada tindak lanjut yang berjalan untuk kategori ini",
        409,
        "ALREADY_OPEN",
        existing.rows[0].id
      );
    }
    const res = await tx.query<{ id: string }>(
      `INSERT INTO facility_actions (facility_id, need_category, created_by)
       VALUES ($1, $2, $3) RETURNING id;`,
      [c.facilityId, category, c.userId]
    );
    await recordAuditEvent(tx, {
      eventType: "facility_action_created",
      actorId: c.userId,
      actorRole: "facility_admin",
      facilityId: c.facilityId,
    });
    return { id: res.rows[0].id };
  });
}

/** A8: ubah status dan catatan langkah. Catatan dapat dibaca pasien terkait; tanpa data pribadi. */
export async function updateFacilityAction(
  session: AdminSession,
  input: { id: string; status: unknown; stepNote: unknown }
): Promise<FacilityActionItem> {
  const c = ctx(session);
  if (!UUID.test(input.id)) throw new FacilityActionError("Tidak ditemukan", 404, "NOT_FOUND");
  const status = String(input.status ?? "");
  if (!["baru", "dikerjakan", "selesai"].includes(status)) {
    throw new FacilityActionError("Status tidak valid", 400, "INVALID_STATUS");
  }
  const note = typeof input.stepNote === "string" ? input.stepNote.trim() : "";
  if (note.length > FACILITY_ACTION_NOTE_MAX_LENGTH) {
    throw new FacilityActionError(
      `Catatan maksimal ${FACILITY_ACTION_NOTE_MAX_LENGTH} karakter`,
      400,
      "NOTE_TOO_LONG"
    );
  }
  return withContext(c, async (tx) => {
    let res;
    try {
      res = await tx.query<Row>(
        `UPDATE facility_actions
         SET status = $3, step_note = $4, updated_at = now(),
             completed_at = CASE WHEN $3 = 'selesai' THEN COALESCE(completed_at, now()) ELSE NULL END
         WHERE id = $1 AND facility_id = $2
         RETURNING ${COLUMNS};`,
        [input.id, c.facilityId, status, note]
      );
    } catch (err) {
      // membuka kembali tindak lanjut yang sudah selesai saat sudah ada yang berjalan
      if (err instanceof Error && /idx_facility_actions_open/.test(err.message)) {
        throw new FacilityActionError(
          "Sudah ada tindak lanjut yang berjalan untuk kategori ini",
          409,
          "ALREADY_OPEN"
        );
      }
      throw err;
    }
    if (res.rows.length === 0) throw new FacilityActionError("Tidak ditemukan", 404, "NOT_FOUND");
    await recordAuditEvent(tx, {
      eventType: "facility_action_updated",
      actorId: c.userId,
      actorRole: "facility_admin",
      facilityId: c.facilityId,
    });
    return map(res.rows[0]);
  });
}

export type UnmetTrend = "naik" | "turun" | "tetap" | "belum_cukup_data";

export interface UnmetNeedRow {
  category: NeedCategory;
  categoryLabel: string;
  current: DashboardCell;
  trend: UnmetTrend;
  openActionId: string | null;
  openActionStatus: FacilityActionStatus | null;
}

function previousPeriod(p: DashboardPeriod): DashboardPeriod {
  return p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 };
}

/**
 * A7: kategori kebutuhan yang paling sering belum terpenuhi (agregat anonim, ambang K-10 dari
 * fungsi dashboard) dengan tren dibanding bulan sebelumnya. Terurut: terbanyak dulu, sel
 * disembunyikan di akhir.
 */
export async function getUnmetNeeds(
  session: AdminSession,
  period?: DashboardPeriod
): Promise<{ facilityName: string; period: DashboardPeriod; rows: UnmetNeedRow[] }> {
  ctx(session);
  const p = period ?? currentJakartaPeriod();
  const [cur, prev, actions] = await Promise.all([
    getFacilityDashboard(session, p),
    getFacilityDashboard(session, previousPeriod(p)),
    listFacilityActions(session),
  ]);
  const curCats = cur.selected.categoryBreakdown;
  const prevCats = prev.selected.categoryBreakdown;
  const rows: UnmetNeedRow[] = NEED_CATEGORIES.map((category) => {
    const current: DashboardCell = curCats?.[category] ?? { hidden: true };
    const before: DashboardCell | undefined = prevCats?.[category];
    let trend: UnmetTrend = "belum_cukup_data";
    if (!current.hidden && before && !before.hidden) {
      trend = current.value > before.value ? "naik" : current.value < before.value ? "turun" : "tetap";
    }
    const open = actions.find((a) => a.category === category && a.status !== "selesai");
    return {
      category,
      categoryLabel: NEED_CATEGORY_LABELS[category] ?? category,
      current,
      trend,
      openActionId: open?.id ?? null,
      openActionStatus: open?.status ?? null,
    };
  });
  rows.sort((a, b) => {
    const av = a.current.hidden ? -1 : a.current.value;
    const bv = b.current.hidden ? -1 : b.current.value;
    return bv - av;
  });
  return { facilityName: cur.facilityName, period: p, rows };
}
