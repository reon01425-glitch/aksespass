-- 008_visits_subject_and_rules.sql
-- Menambal celah alur pemindaian dan kunjungan (Prompt 14 / Bagian 7b):
-- 1. Menambahkan kolom visits.subject_ref (pseudonim pasien) agar audit visit_recorded
--    dan visit_confirmed dapat mencatat identitas subjek tanpa harus membaca consents/users tanpa token.
-- 2. Menambahkan kolom visits.recorded_rule_ids untuk menyimpan ID aturan akomodasi yang diterapkan di T8.

-- 1. visits.subject_ref
ALTER TABLE visits ADD COLUMN IF NOT EXISTS subject_ref uuid REFERENCES users(audit_subject_id);

-- Backfill subject_ref dari tabel users untuk kunjungan lama
UPDATE visits v
SET subject_ref = u.audit_subject_id
FROM users u
WHERE v.patient_user_id = u.id AND v.subject_ref IS NULL;

-- Trigger pengisian otomatis subject_ref bila tidak disediakan saat INSERT
CREATE OR REPLACE FUNCTION set_visit_subject_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.subject_ref IS NULL THEN
    SELECT audit_subject_id INTO NEW.subject_ref
    FROM users
    WHERE id = NEW.patient_user_id;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION set_visit_subject_ref() OWNER TO aksespass_owner;

DROP TRIGGER IF EXISTS trg_set_visit_subject_ref ON visits;
CREATE TRIGGER trg_set_visit_subject_ref
  BEFORE INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION set_visit_subject_ref();

ALTER TABLE visits ALTER COLUMN subject_ref SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_subject_ref ON visits(subject_ref);

-- 2. visits.recorded_rule_ids
ALTER TABLE visits ADD COLUMN IF NOT EXISTS recorded_rule_ids uuid[] DEFAULT '{}'::uuid[];

-- Backfill recorded_rule_ids dari recorded_need_codes lampau bila ada
UPDATE visits v
SET recorded_rule_ids = ARRAY(
  SELECT ar.id
  FROM accommodation_rules ar
  WHERE ar.trigger_need_code = ANY(v.recorded_need_codes)
    AND ar.status = 'published'
)
WHERE v.recorded_need_codes IS NOT NULL
  AND (v.recorded_rule_ids IS NULL OR v.recorded_rule_ids = '{}'::uuid[]);
