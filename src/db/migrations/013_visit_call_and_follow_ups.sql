-- 013_visit_call_and_follow_ups.sql
-- 1. Status panggilan kunjungan (P13/P14): petugas menekan "Panggil Pasien".
--    Hanya waktu dan label ruangan; tanpa isi data pasien.
-- 2. Tabel follow_ups (P17): status tindak lanjut kebutuhan yang belum terpenuhi.
--    Aplikasi hanya boleh SELECT/INSERT/DELETE. Perubahan status dilakukan di luar
--    aplikasi (layar admin A8 belum dibangun), sehingga tidak ada grant UPDATE.

-- 1. Panggilan
ALTER TABLE visits ADD COLUMN IF NOT EXISTS called_at timestamptz;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS call_room text;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_call_room_length;
ALTER TABLE visits ADD CONSTRAINT visits_call_room_length CHECK (
  call_room IS NULL OR char_length(btrim(call_room)) BETWEEN 1 AND 40
);

-- 2. Tindak lanjut
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  need_code text NOT NULL REFERENCES needs_catalog(code),
  status text NOT NULL DEFAULT 'diterima' CHECK (
    status IN ('diterima', 'ditindaklanjuti', 'selesai')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, need_code)
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_visit_id ON follow_ups(visit_id);

ALTER TABLE follow_ups OWNER TO aksespass_owner;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE follow_ups FROM PUBLIC, aksespass_app;
GRANT SELECT, INSERT, DELETE ON TABLE follow_ups TO aksespass_app;

-- Baris hanya terlihat bila kunjungan induknya terlihat oleh pemanggil
-- (pasien pemilik, pendamping aktif, atau petugas fasilitas yang sama).
-- Admin fasilitas tidak punya akses baris (hanya agregat anonim di kemudian hari).
DROP POLICY IF EXISTS follow_ups_select_policy ON follow_ups;
CREATE POLICY follow_ups_select_policy ON follow_ups
  FOR SELECT TO aksespass_app
  USING (EXISTS (SELECT 1 FROM visits v WHERE v.id = follow_ups.visit_id));

DROP POLICY IF EXISTS follow_ups_insert_policy ON follow_ups;
CREATE POLICY follow_ups_insert_policy ON follow_ups
  FOR INSERT TO aksespass_app
  WITH CHECK (EXISTS (SELECT 1 FROM visits v WHERE v.id = follow_ups.visit_id));

DROP POLICY IF EXISTS follow_ups_delete_policy ON follow_ups;
CREATE POLICY follow_ups_delete_policy ON follow_ups
  FOR DELETE TO aksespass_app
  USING (
    status = 'diterima'
    AND EXISTS (SELECT 1 FROM visits v WHERE v.id = follow_ups.visit_id)
  );
