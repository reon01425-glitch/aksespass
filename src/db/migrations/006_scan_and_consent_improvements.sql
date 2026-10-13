-- 006_scan_and_consent_improvements.sql
-- Menambal celah alur pemindaian dan persetujuan (Bagian 3c):
-- 1. Menambahkan kolom subject_ref pada consents untuk memutus ketergantungan petugas pada tabel users pasien saat audit.
-- 2. Menambahkan kolom recorded_at pada visits untuk membedakan kunjungan yang baru dibuka vs kunjungan yang sudah dicatat bantuannya.
-- 3. Memastikan kolom recorded_need_codes pada visits dapat kosong saat kunjungan baru dibuka.

-- 1. consents.subject_ref
ALTER TABLE consents ADD COLUMN IF NOT EXISTS subject_ref uuid REFERENCES users(audit_subject_id);

UPDATE consents c
SET subject_ref = u.audit_subject_id
FROM users u
WHERE c.patient_user_id = u.id AND c.subject_ref IS NULL;

ALTER TABLE consents ALTER COLUMN subject_ref SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_subject_ref ON consents(subject_ref);

-- 2. visits.recorded_at dan recorded_need_codes
ALTER TABLE visits ADD COLUMN IF NOT EXISTS recorded_at timestamptz;

-- Mengizinkan recorded_need_codes kosong/null sebelum bantuan dicatat di T8
ALTER TABLE visits ALTER COLUMN recorded_need_codes DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN recorded_need_codes SET DEFAULT NULL;

-- Backfill data historis: kunjungan lampau dianggap sudah selesai dicatat saat dibuat
UPDATE visits
SET recorded_at = created_at
WHERE recorded_at IS NULL;
