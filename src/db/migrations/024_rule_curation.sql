-- 024_rule_curation.sql
-- Kurasi aturan akomodasi (K3-K6). Satu baris accommodation_rules = satu VERSI aturan.
-- Versi dikelompokkan oleh rule_key. Kunjungan menyimpan id baris (recorded_rule_ids), jadi
-- versi yang dipakai petugas tetap terlacak walau aturan diganti.
--
-- Alur status: draft -> in_review -> published -> superseded.
--   * Hanya status 'published' yang dipakai Smart Accommodation Engine (T6).
--   * Terbit butuh 2 peninjau kurator berbeda yang menyetujui putaran peninjauan saat ini,
--     keduanya bukan penulis draft. Satu suara 'revise' mengembalikan aturan ke draft.
--   * Versi terbit tidak dapat diubah; hanya bisa menjadi 'superseded' saat versi barunya terbit.
-- Semua aturan di atas ditegakkan di trigger database, bukan hanya di aplikasi.

ALTER TABLE accommodation_rules
  ADD COLUMN IF NOT EXISTS rule_key uuid,
  ADD COLUMN IF NOT EXISTS change_note text NOT NULL DEFAULT '' CHECK (char_length(change_note) <= 280),
  ADD COLUMN IF NOT EXISTS revision_note text NOT NULL DEFAULT '' CHECK (char_length(revision_note) <= 280),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_round integer NOT NULL DEFAULT 0 CHECK (review_round >= 0);

UPDATE accommodation_rules SET rule_key = id WHERE rule_key IS NULL;

-- Draf atau tinjauan lama yang kode kebutuhannya punya tepat satu aturan terbit masuk garis versi itu.
UPDATE accommodation_rules d
SET rule_key = p.rule_key
FROM accommodation_rules p
WHERE d.status IN ('draft', 'in_review')
  AND p.status = 'published'
  AND p.trigger_need_code = d.trigger_need_code
  AND (SELECT count(*) FROM accommodation_rules x
       WHERE x.status = 'published' AND x.trigger_need_code = d.trigger_need_code) = 1
  AND d.version > p.version;

ALTER TABLE accommodation_rules ALTER COLUMN rule_key SET NOT NULL;

ALTER TABLE accommodation_rules DROP CONSTRAINT IF EXISTS accommodation_rules_status_check;
ALTER TABLE accommodation_rules ADD CONSTRAINT accommodation_rules_status_check
  CHECK (status IN ('draft', 'in_review', 'published', 'superseded'));

ALTER TABLE accommodation_rules DROP CONSTRAINT IF EXISTS accommodation_rules_published_meta;
ALTER TABLE accommodation_rules ADD CONSTRAINT accommodation_rules_published_meta CHECK (
  status NOT IN ('published', 'superseded')
  OR (published_at IS NOT NULL AND approved_by IS NOT NULL AND char_length(btrim(approved_by)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_key_version
  ON accommodation_rules (rule_key, version);
-- Satu draf atau tinjauan terbuka per garis versi.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_one_open
  ON accommodation_rules (rule_key) WHERE status IN ('draft', 'in_review');
CREATE INDEX IF NOT EXISTS idx_rules_key_status ON accommodation_rules (rule_key, status);

-- rule_key bawaan = id (aturan baru membuka garis versi baru).
CREATE OR REPLACE FUNCTION rules_default_key() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rule_key IS NULL THEN
    NEW.rule_key := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION rules_default_key() OWNER TO aksespass_owner;
DROP TRIGGER IF EXISTS trg_rules_default_key ON accommodation_rules;
CREATE TRIGGER trg_rules_default_key BEFORE INSERT ON accommodation_rules
  FOR EACH ROW EXECUTE FUNCTION rules_default_key();

-- Suara peninjau per putaran.
CREATE TABLE IF NOT EXISTS rule_reviews (
  rule_id uuid NOT NULL REFERENCES accommodation_rules(id) ON DELETE CASCADE,
  round integer NOT NULL CHECK (round >= 1),
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewer_name text NOT NULL CHECK (char_length(btrim(reviewer_name)) > 0),
  decision text NOT NULL CHECK (decision IN ('approve', 'revise')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, round, reviewer_id)
);
ALTER TABLE rule_reviews OWNER TO aksespass_owner;

-- Penegakan aturan di database.
CREATE OR REPLACE FUNCTION rules_enforce_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_approvals integer;
  v_revisions integer;
  v_names text;
BEGIN
  IF OLD.status = 'superseded' THEN
    RAISE EXCEPTION 'Versi aturan yang sudah digantikan tidak dapat diubah' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'published' THEN
    IF NEW.status <> 'superseded'
       OR NEW.action_text <> OLD.action_text OR NEW.icon_name <> OLD.icon_name
       OR NEW.rationale <> OLD.rationale OR NEW.trigger_need_code <> OLD.trigger_need_code
       OR NEW.version <> OLD.version OR NEW.rule_key <> OLD.rule_key THEN
      RAISE EXCEPTION 'Aturan terbit tidak dapat diubah; buat versi baru' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_review' AND NEW.status = 'in_review'
     AND (NEW.action_text <> OLD.action_text OR NEW.icon_name <> OLD.icon_name
          OR NEW.rationale <> OLD.rationale OR NEW.trigger_need_code <> OLD.trigger_need_code
          OR NEW.change_note <> OLD.change_note) THEN
    RAISE EXCEPTION 'Aturan dalam tinjauan tidak dapat diubah' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'Status digantikan hanya diatur saat versi baru terbit' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'in_review' AND OLD.status = 'draft' THEN
    NEW.review_round := OLD.review_round + 1;
    NEW.submitted_at := now();
    NEW.revision_note := '';
  END IF;

  IF NEW.status = 'published' THEN
    IF OLD.status <> 'in_review' THEN
      RAISE EXCEPTION 'Hanya aturan dalam tinjauan yang dapat terbit' USING ERRCODE = '23514';
    END IF;
    SELECT count(*) FILTER (WHERE decision = 'approve'),
           count(*) FILTER (WHERE decision = 'revise'),
           string_agg(reviewer_name, ', ' ORDER BY created_at) FILTER (WHERE decision = 'approve')
      INTO v_approvals, v_revisions, v_names
    FROM rule_reviews
    WHERE rule_id = OLD.id AND round = OLD.review_round
      AND reviewer_id IS DISTINCT FROM OLD.created_by;
    IF v_revisions > 0 OR v_approvals < 2 THEN
      RAISE EXCEPTION 'Terbit butuh persetujuan 2 peninjau berbeda selain penulis' USING ERRCODE = '23514';
    END IF;
    NEW.published_at := now();
    NEW.approved_by := v_names;
    UPDATE accommodation_rules
       SET status = 'superseded', updated_at = now()
     WHERE rule_key = OLD.rule_key AND status = 'published' AND id <> OLD.id;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION rules_enforce_transition() OWNER TO aksespass_owner;
DROP TRIGGER IF EXISTS trg_rules_enforce_transition ON accommodation_rules;
CREATE TRIGGER trg_rules_enforce_transition BEFORE UPDATE ON accommodation_rules
  FOR EACH ROW EXECUTE FUNCTION rules_enforce_transition();

-- Suara hanya sah dari kurator lain pada aturan dalam tinjauan putaran berjalan.
CREATE OR REPLACE FUNCTION rule_reviews_enforce() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r accommodation_rules%ROWTYPE;
BEGIN
  SELECT * INTO r FROM accommodation_rules WHERE id = NEW.rule_id;
  IF r.id IS NULL OR r.status <> 'in_review' OR r.review_round <> NEW.round THEN
    RAISE EXCEPTION 'Aturan tidak sedang dalam tinjauan' USING ERRCODE = '23514';
  END IF;
  IF r.created_by IS NOT DISTINCT FROM NEW.reviewer_id THEN
    RAISE EXCEPTION 'Penulis tidak dapat meninjau aturannya sendiri' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION rule_reviews_enforce() OWNER TO aksespass_owner;
DROP TRIGGER IF EXISTS trg_rule_reviews_enforce ON rule_reviews;
CREATE TRIGGER trg_rule_reviews_enforce BEFORE INSERT ON rule_reviews
  FOR EACH ROW EXECUTE FUNCTION rule_reviews_enforce();

-- Hak akses dan RLS. Sebelumnya aplikasi hanya SELECT tanpa RLS; kini tulis dibatasi ke kurator.
ALTER TABLE accommodation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rule_reviews FROM PUBLIC, aksespass_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE accommodation_rules TO aksespass_app;
GRANT SELECT, INSERT ON TABLE rule_reviews TO aksespass_app;

DROP POLICY IF EXISTS rules_select_all ON accommodation_rules;
CREATE POLICY rules_select_all ON accommodation_rules
  FOR SELECT TO aksespass_app USING (true);

DROP POLICY IF EXISTS rules_curator_insert ON accommodation_rules;
CREATE POLICY rules_curator_insert ON accommodation_rules
  FOR INSERT TO aksespass_app
  WITH CHECK (
    app_role() = 'curator' AND app_user_id() IS NOT NULL
    AND created_by = app_user_id() AND status = 'draft'
  );

DROP POLICY IF EXISTS rules_curator_update ON accommodation_rules;
CREATE POLICY rules_curator_update ON accommodation_rules
  FOR UPDATE TO aksespass_app
  USING (app_role() = 'curator')
  WITH CHECK (app_role() = 'curator');

DROP POLICY IF EXISTS rules_curator_delete ON accommodation_rules;
CREATE POLICY rules_curator_delete ON accommodation_rules
  FOR DELETE TO aksespass_app
  USING (app_role() = 'curator' AND status = 'draft' AND created_by = app_user_id());

DROP POLICY IF EXISTS rule_reviews_curator_select ON rule_reviews;
CREATE POLICY rule_reviews_curator_select ON rule_reviews
  FOR SELECT TO aksespass_app USING (app_role() = 'curator');

DROP POLICY IF EXISTS rule_reviews_curator_insert ON rule_reviews;
CREATE POLICY rule_reviews_curator_insert ON rule_reviews
  FOR INSERT TO aksespass_app
  WITH CHECK (app_role() = 'curator' AND reviewer_id = app_user_id());

-- Jenis audit baru
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_event_type_check;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_event_type_check CHECK (
  event_type IN (
    'qr_created', 'qr_revoked', 'qr_scanned', 'profile_read', 'brief_sent',
    'brief_opened', 'qr_scan_rejected', 'visit_recorded', 'visit_synced',
    'visit_confirmed', 'companion_link_requested', 'companion_linked',
    'companion_unlinked', 'profile_changed_by_companion', 'delegation_signed_off',
    'access_reported', 'account_deleted',
    'staff_invited', 'staff_activated', 'staff_updated',
    'staff_deactivated', 'staff_reactivated',
    'facility_action_created', 'facility_action_updated',
    'recovery_requested', 'recovery_cancelled', 'recovery_completed',
    'rule_draft_saved', 'rule_submitted', 'rule_reviewed', 'rule_published'
  )
);
