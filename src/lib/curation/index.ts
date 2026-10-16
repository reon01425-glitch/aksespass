import { withContext, type TransactionClient } from "../../db";
import { recordAuditEvent } from "../audit";
import { NEED_CATEGORY_LABELS } from "../passport";
import {
  RULE_ACTION_MAX_LENGTH,
  RULE_ICONS,
  RULE_NOTE_MAX_LENGTH,
  RULE_RATIONALE_MAX_LENGTH,
  RULE_REQUIRED_APPROVALS,
  type RuleLineItem,
  type RuleReviewItem,
  type RuleStatus,
  type RuleVersionItem,
} from "./shared";

export * from "./shared";

export class CurationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "CurationError";
  }
}

interface CuratorSession {
  userId: string;
  role: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ctx(session: CuratorSession) {
  if (session.role !== "curator") {
    throw new CurationError("Hanya kurator", 403, "FORBIDDEN");
  }
  return { userId: session.userId, role: "curator" as const };
}

function assertUuid(id: string): void {
  if (!UUID.test(id)) throw new CurationError("Tidak ditemukan", 404, "NOT_FOUND");
}

interface RuleRow {
  id: string;
  rule_key: string;
  version: number;
  status: RuleStatus;
  trigger_need_code: string;
  action_text: string;
  icon_name: string;
  rationale: string;
  change_note: string;
  revision_note: string;
  author_name: string;
  created_by: string | null;
  review_round: number;
  published_at: string | null;
  approved_by: string | null;
  updated_at: string;
  need_label: string;
  category: string;
}

interface ReviewRow {
  rule_id: string;
  round: number;
  reviewer_id: string;
  reviewer_name: string;
  decision: "approve" | "revise";
  note: string;
  created_at: string;
}

const RULE_SELECT = `
  SELECT ar.id, ar.rule_key, ar.version, ar.status, ar.trigger_need_code, ar.action_text,
         ar.icon_name, ar.rationale, ar.change_note, ar.revision_note, ar.author_name,
         ar.created_by, ar.review_round, ar.published_at, ar.approved_by, ar.updated_at,
         nc.label AS need_label, nc.category
  FROM accommodation_rules ar
  JOIN needs_catalog nc ON nc.code = ar.trigger_need_code`;

function mapReview(r: ReviewRow): RuleReviewItem {
  return {
    round: r.round,
    reviewerName: r.reviewer_name,
    decision: r.decision,
    note: r.note,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapRule(r: RuleRow, reviews: ReviewRow[], userId: string): RuleVersionItem {
  const mine = reviews.filter((x) => x.rule_id === r.id);
  const current = mine.filter((x) => x.round === r.review_round);
  return {
    id: r.id,
    ruleKey: r.rule_key,
    version: r.version,
    status: r.status,
    needCode: r.trigger_need_code,
    needLabel: r.need_label,
    category: r.category,
    actionText: r.action_text,
    iconName: r.icon_name,
    rationale: r.rationale,
    changeNote: r.change_note,
    revisionNote: r.revision_note,
    authorName: r.author_name,
    isMine: r.created_by === userId,
    reviewRound: r.review_round,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    approvedBy: r.approved_by,
    updatedAt: new Date(r.updated_at).toISOString(),
    approvals: current.filter((x) => x.decision === "approve").length,
    reviews: mine.map(mapReview),
    iVoted: current.some((x) => x.reviewer_id === userId),
  };
}

async function loadReviews(tx: TransactionClient, ruleIds: string[]): Promise<ReviewRow[]> {
  if (ruleIds.length === 0) return [];
  const res = await tx.query<ReviewRow>(
    `SELECT rule_id, round, reviewer_id, reviewer_name, decision, note, created_at
     FROM rule_reviews WHERE rule_id = ANY($1::uuid[]) ORDER BY created_at;`,
    [ruleIds]
  );
  return res.rows;
}

/** K3: pustaka, satu baris per garis versi, dengan versi terbit dan draf atau tinjauan yang terbuka. */
export async function listRuleLines(session: CuratorSession): Promise<RuleLineItem[]> {
  const c = ctx(session);
  return withContext(c, async (tx) => {
    const res = await tx.query<RuleRow>(
      `${RULE_SELECT} ORDER BY nc.sort_order, ar.rule_key, ar.version DESC;`
    );
    const reviews = await loadReviews(tx, res.rows.map((r) => r.id));
    const lines = new Map<string, RuleLineItem>();
    for (const r of res.rows) {
      let line = lines.get(r.rule_key);
      if (!line) {
        line = {
          ruleKey: r.rule_key,
          needCode: r.trigger_need_code,
          needLabel: r.need_label,
          category: r.category,
          categoryLabel: NEED_CATEGORY_LABELS[r.category as keyof typeof NEED_CATEGORY_LABELS] ?? r.category,
          published: null,
          open: null,
          versionCount: 0,
        };
        lines.set(r.rule_key, line);
      }
      line.versionCount += 1;
      const item = mapRule(r, reviews, c.userId);
      if (r.status === "published") line.published = item;
      if (r.status === "draft" || r.status === "in_review") line.open = item;
    }
    return [...lines.values()];
  });
}

/** K4/K5: satu versi aturan beserta suara peninjau. */
export async function getRuleVersion(session: CuratorSession, id: string): Promise<RuleVersionItem | null> {
  const c = ctx(session);
  if (!UUID.test(id)) return null;
  return withContext(c, async (tx) => {
    const res = await tx.query<RuleRow>(`${RULE_SELECT} WHERE ar.id = $1;`, [id]);
    if (!res.rows[0]) return null;
    return mapRule(res.rows[0], await loadReviews(tx, [id]), c.userId);
  });
}

/** K6: semua versi satu garis, terbaru di atas. */
export async function listRuleHistory(
  session: CuratorSession,
  ruleKey: string
): Promise<RuleVersionItem[]> {
  const c = ctx(session);
  if (!UUID.test(ruleKey)) return [];
  return withContext(c, async (tx) => {
    const res = await tx.query<RuleRow>(
      `${RULE_SELECT} WHERE ar.rule_key = $1 ORDER BY ar.version DESC;`,
      [ruleKey]
    );
    const reviews = await loadReviews(tx, res.rows.map((r) => r.id));
    return res.rows.map((r) => mapRule(r, reviews, c.userId));
  });
}

export interface NeedOption {
  code: string;
  label: string;
  categoryLabel: string;
}

export async function listNeedOptions(session: CuratorSession): Promise<NeedOption[]> {
  const c = ctx(session);
  return withContext(c, async (tx) => {
    const res = await tx.query<{ code: string; label: string; category: string }>(
      "SELECT code, label, category FROM needs_catalog ORDER BY sort_order, label;"
    );
    return res.rows.map((n) => ({
      code: n.code,
      label: n.label,
      categoryLabel: NEED_CATEGORY_LABELS[n.category as keyof typeof NEED_CATEGORY_LABELS] ?? n.category,
    }));
  });
}

export interface RuleInput {
  needCode?: unknown;
  actionText?: unknown;
  iconName?: unknown;
  rationale?: unknown;
  changeNote?: unknown;
}

function clean(input: RuleInput) {
  const needCode = String(input.needCode ?? "").trim();
  const actionText = String(input.actionText ?? "").trim();
  const iconName = String(input.iconName ?? "").trim();
  const rationale = String(input.rationale ?? "").trim();
  const changeNote = String(input.changeNote ?? "").trim();
  if (!/^[a-z0-9_]+$/.test(needCode)) throw new CurationError("Pilih kebutuhan pemicu", 400, "INVALID_NEED");
  if (!actionText) throw new CurationError("Saran tindakan wajib diisi", 400, "ACTION_REQUIRED");
  if (actionText.length > RULE_ACTION_MAX_LENGTH) {
    throw new CurationError(`Saran tindakan maksimal ${RULE_ACTION_MAX_LENGTH} karakter`, 400, "ACTION_TOO_LONG");
  }
  if (!RULE_ICONS.some((i) => i.name === iconName)) {
    throw new CurationError("Pilih ikon", 400, "INVALID_ICON");
  }
  if (!rationale) throw new CurationError("Sumber atau alasan wajib diisi", 400, "RATIONALE_REQUIRED");
  if (rationale.length > RULE_RATIONALE_MAX_LENGTH) {
    throw new CurationError(`Sumber atau alasan maksimal ${RULE_RATIONALE_MAX_LENGTH} karakter`, 400, "RATIONALE_TOO_LONG");
  }
  if (changeNote.length > RULE_NOTE_MAX_LENGTH) {
    throw new CurationError(`Catatan perubahan maksimal ${RULE_NOTE_MAX_LENGTH} karakter`, 400, "NOTE_TOO_LONG");
  }
  return { needCode, actionText, iconName, rationale, changeNote };
}

async function myName(tx: TransactionClient, userId: string): Promise<string> {
  const res = await tx.query<{ display_name: string }>(
    "SELECT display_name FROM users WHERE id = $1;",
    [userId]
  );
  return res.rows[0]?.display_name ?? "Kurator";
}

function audit(tx: TransactionClient, userId: string, eventType: "rule_draft_saved" | "rule_submitted" | "rule_reviewed" | "rule_published") {
  return recordAuditEvent(tx, { eventType, actorId: userId, actorRole: "curator" });
}

function mapDbError(err: unknown): never {
  if (err instanceof Error) {
    if (/idx_rules_one_open/.test(err.message)) {
      throw new CurationError("Aturan ini sudah punya draf atau tinjauan yang berjalan", 409, "ALREADY_OPEN");
    }
    if (/violates foreign key constraint/.test(err.message) && /trigger_need_code/.test(err.message)) {
      throw new CurationError("Kebutuhan pemicu tidak dikenal", 400, "INVALID_NEED");
    }
    if ((err as { code?: string }).code === "23514") {
      throw new CurationError(err.message, 409, "RULE_STATE");
    }
  }
  throw err;
}

/** K3 -> K4: aturan baru (garis versi baru, versi 1, draf). */
export async function createRule(session: CuratorSession, input: RuleInput): Promise<{ id: string }> {
  const c = ctx(session);
  const v = clean(input);
  return withContext(c, async (tx) => {
    try {
      const name = await myName(tx, c.userId);
      const res = await tx.query<{ id: string }>(
        `INSERT INTO accommodation_rules
           (trigger_need_code, action_text, icon_name, rationale, version, status, created_by, author_name, change_note)
         VALUES ($1, $2, $3, $4, 1, 'draft', $5, $6, $7) RETURNING id;`,
        [v.needCode, v.actionText, v.iconName, v.rationale, c.userId, name, v.changeNote]
      );
      await audit(tx, c.userId, "rule_draft_saved");
      return { id: res.rows[0].id };
    } catch (err) {
      return mapDbError(err);
    }
  });
}

/** K3 -> K4: versi baru dari aturan terbit; isinya disalin dari versi terbit sebagai draf. */
export async function createNewVersion(session: CuratorSession, ruleKey: string): Promise<{ id: string }> {
  const c = ctx(session);
  assertUuid(ruleKey);
  return withContext(c, async (tx) => {
    const src = await tx.query<RuleRow>(
      `${RULE_SELECT} WHERE ar.rule_key = $1 AND ar.status = 'published';`,
      [ruleKey]
    );
    const base = src.rows[0];
    if (!base) throw new CurationError("Aturan terbit tidak ditemukan", 404, "NOT_FOUND");
    try {
      const max = await tx.query<{ v: number }>(
        "SELECT max(version) AS v FROM accommodation_rules WHERE rule_key = $1;",
        [ruleKey]
      );
      const name = await myName(tx, c.userId);
      const res = await tx.query<{ id: string }>(
        `INSERT INTO accommodation_rules
           (rule_key, trigger_need_code, action_text, icon_name, rationale, version, status, created_by, author_name)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8) RETURNING id;`,
        [ruleKey, base.trigger_need_code, base.action_text, base.icon_name, base.rationale,
         (max.rows[0]?.v ?? base.version) + 1, c.userId, name]
      );
      await audit(tx, c.userId, "rule_draft_saved");
      return { id: res.rows[0].id };
    } catch (err) {
      return mapDbError(err);
    }
  });
}

async function loadOwnDraft(tx: TransactionClient, id: string, userId: string): Promise<RuleRow> {
  const res = await tx.query<RuleRow>(`${RULE_SELECT} WHERE ar.id = $1 FOR UPDATE OF ar;`, [id]);
  const row = res.rows[0];
  if (!row) throw new CurationError("Tidak ditemukan", 404, "NOT_FOUND");
  if (row.status !== "draft") {
    throw new CurationError("Hanya draf yang dapat diubah", 409, "NOT_DRAFT");
  }
  if (row.created_by !== userId) {
    throw new CurationError("Draf ini milik kurator lain", 403, "NOT_AUTHOR");
  }
  return row;
}

/** K4: simpan draf. Draf tidak memengaruhi saran petugas sampai terbit. */
export async function saveDraft(session: CuratorSession, id: string, input: RuleInput): Promise<void> {
  const c = ctx(session);
  assertUuid(id);
  const v = clean(input);
  await withContext(c, async (tx) => {
    const row = await loadOwnDraft(tx, id, c.userId);
    if (row.version > 1 && row.trigger_need_code !== v.needCode) {
      throw new CurationError("Kebutuhan pemicu versi lanjutan tidak dapat diganti", 400, "NEED_LOCKED");
    }
    try {
      await tx.query(
        `UPDATE accommodation_rules
         SET trigger_need_code = $2, action_text = $3, icon_name = $4, rationale = $5,
             change_note = $6, updated_at = now()
         WHERE id = $1;`,
        [id, v.needCode, v.actionText, v.iconName, v.rationale, v.changeNote]
      );
    } catch (err) {
      mapDbError(err);
    }
    await audit(tx, c.userId, "rule_draft_saved");
  });
}

/** K4: buang draf (konfirmasi dilakukan di layar). */
export async function discardDraft(session: CuratorSession, id: string): Promise<void> {
  const c = ctx(session);
  assertUuid(id);
  await withContext(c, async (tx) => {
    await loadOwnDraft(tx, id, c.userId);
    await tx.query("DELETE FROM accommodation_rules WHERE id = $1;", [id]);
    await audit(tx, c.userId, "rule_draft_saved");
  });
}

/** K4 -> K5: ajukan tinjauan. Catatan perubahan wajib untuk versi lanjutan. */
export async function submitForReview(session: CuratorSession, id: string): Promise<void> {
  const c = ctx(session);
  assertUuid(id);
  await withContext(c, async (tx) => {
    const row = await loadOwnDraft(tx, id, c.userId);
    if (row.version > 1 && !row.change_note.trim()) {
      throw new CurationError("Isi catatan perubahan sebelum mengajukan", 400, "CHANGE_NOTE_REQUIRED");
    }
    try {
      await tx.query(
        "UPDATE accommodation_rules SET status = 'in_review', updated_at = now() WHERE id = $1;",
        [id]
      );
    } catch (err) {
      mapDbError(err);
    }
    await audit(tx, c.userId, "rule_submitted");
  });
}

export interface ReviewResult {
  outcome: "approved" | "published" | "revision_requested";
}

/** K5: beri suara. Dua persetujuan berbeda menerbitkan; satu 'revise' mengembalikan ke draf. */
export async function reviewRule(
  session: CuratorSession,
  id: string,
  input: { decision: unknown; note?: unknown }
): Promise<ReviewResult> {
  const c = ctx(session);
  assertUuid(id);
  const decision = String(input.decision ?? "");
  if (decision !== "approve" && decision !== "revise") {
    throw new CurationError("Pilihan tidak valid", 400, "INVALID_DECISION");
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > RULE_NOTE_MAX_LENGTH) {
    throw new CurationError(`Catatan maksimal ${RULE_NOTE_MAX_LENGTH} karakter`, 400, "NOTE_TOO_LONG");
  }
  if (decision === "revise" && !note) {
    throw new CurationError("Tulis alasan permintaan revisi", 400, "NOTE_REQUIRED");
  }
  return withContext(c, async (tx) => {
    const res = await tx.query<RuleRow>(`${RULE_SELECT} WHERE ar.id = $1 FOR UPDATE OF ar;`, [id]);
    const row = res.rows[0];
    if (!row) throw new CurationError("Tidak ditemukan", 404, "NOT_FOUND");
    if (row.status !== "in_review") {
      throw new CurationError("Aturan tidak sedang dalam tinjauan", 409, "NOT_IN_REVIEW");
    }
    if (row.created_by === c.userId) {
      throw new CurationError("Penulis tidak dapat meninjau aturannya sendiri", 403, "OWN_RULE");
    }
    const name = await myName(tx, c.userId);
    try {
      await tx.query(
        `INSERT INTO rule_reviews (rule_id, round, reviewer_id, reviewer_name, decision, note)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [id, row.review_round, c.userId, name, decision, note]
      );
    } catch (err) {
      if (err instanceof Error && /rule_reviews_pkey/.test(err.message)) {
        throw new CurationError("Anda sudah memberi suara pada putaran ini", 409, "ALREADY_VOTED");
      }
      mapDbError(err);
    }
    await audit(tx, c.userId, "rule_reviewed");

    if (decision === "revise") {
      await tx.query(
        "UPDATE accommodation_rules SET status = 'draft', revision_note = $2, updated_at = now() WHERE id = $1;",
        [id, note]
      );
      return { outcome: "revision_requested" as const };
    }
    const count = await tx.query<{ n: string }>(
      `SELECT count(*) AS n FROM rule_reviews
       WHERE rule_id = $1 AND round = $2 AND decision = 'approve' AND reviewer_id <> $3;`,
      [id, row.review_round, row.created_by]
    );
    if (Number(count.rows[0].n) >= RULE_REQUIRED_APPROVALS) {
      try {
        await tx.query(
          "UPDATE accommodation_rules SET status = 'published', updated_at = now() WHERE id = $1;",
          [id]
        );
      } catch (err) {
        mapDbError(err);
      }
      await audit(tx, c.userId, "rule_published");
      return { outcome: "published" as const };
    }
    return { outcome: "approved" as const };
  });
}
