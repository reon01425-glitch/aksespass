-- 022_facility_actions.sql
-- Tindak lanjut fasilitas per kategori kebutuhan (A7/A8). Berbeda dari follow_ups (permintaan
-- per pasien, P17): ini tindakan fasilitas yang bersifat agregat dan tidak memuat identitas pasien.
-- Pasien hanya melihat status dan catatan langkah lewat P17 untuk kebutuhan mereka sendiri
-- (fasilitas dan kategori yang sama dengan laporan mereka).

CREATE TABLE IF NOT EXISTS facility_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  need_category text NOT NULL CHECK (
    need_category IN ('komunikasi', 'penglihatan', 'pendengaran', 'mobilitas',
                      'sensorik_lingkungan', 'pendampingan')
  ),
  status text NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikerjakan', 'selesai')),
  step_note text NOT NULL DEFAULT '' CHECK (char_length(step_note) <= 280),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Satu tindak lanjut berjalan per fasilitas per kategori.
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_actions_open
  ON facility_actions (facility_id, need_category) WHERE status <> 'selesai';
CREATE INDEX IF NOT EXISTS idx_facility_actions_facility
  ON facility_actions (facility_id, updated_at DESC);

ALTER TABLE facility_actions OWNER TO aksespass_owner;
ALTER TABLE facility_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE facility_actions FROM PUBLIC, aksespass_app;
GRANT SELECT, INSERT, UPDATE ON TABLE facility_actions TO aksespass_app;

-- Admin fasilitas yang sama: baca, buat, ubah.
DROP POLICY IF EXISTS facility_actions_admin_select ON facility_actions;
CREATE POLICY facility_actions_admin_select ON facility_actions
  FOR SELECT TO aksespass_app
  USING (app_role() = 'facility_admin' AND facility_id = app_facility_id());

DROP POLICY IF EXISTS facility_actions_admin_insert ON facility_actions;
CREATE POLICY facility_actions_admin_insert ON facility_actions
  FOR INSERT TO aksespass_app
  WITH CHECK (
    app_role() = 'facility_admin' AND app_user_id() IS NOT NULL
    AND facility_id = app_facility_id()
  );

DROP POLICY IF EXISTS facility_actions_admin_update ON facility_actions;
CREATE POLICY facility_actions_admin_update ON facility_actions
  FOR UPDATE TO aksespass_app
  USING (app_role() = 'facility_admin' AND facility_id = app_facility_id())
  WITH CHECK (app_role() = 'facility_admin' AND facility_id = app_facility_id());

-- Pasien: hanya tindakan di fasilitas dan kategori yang sama dengan tindak lanjut milik mereka
-- (follow_ups dan visits sudah dibatasi RLS ke pemilik).
DROP POLICY IF EXISTS facility_actions_patient_select ON facility_actions;
CREATE POLICY facility_actions_patient_select ON facility_actions
  FOR SELECT TO aksespass_app
  USING (
    app_role() = 'patient'
    AND EXISTS (
      SELECT 1
      FROM follow_ups fu
      JOIN visits v ON v.id = fu.visit_id
      JOIN needs_catalog nc ON nc.code = fu.need_code
      WHERE v.facility_id = facility_actions.facility_id
        AND v.patient_user_id = app_user_id()
        AND nc.category = facility_actions.need_category
    )
  );

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
    'facility_action_created', 'facility_action_updated'
  )
);
