-- 019_komunikacare_messages.sql
-- KomunikaCare dua perangkat (P15 <-> T7): pesan singkat antara HP pasien dan
-- layar petugas selama satu kunjungan. Pesan bersifat sementara:
--   * dihapus saat petugas menyelesaikan pelayanan (completeVisit), dan
--   * tidak dibaca lagi setelah 12 jam.
-- Isi pesan tidak masuk audit, log, atau analitik. Suara tidak pernah dikirim:
-- hanya teks yang diketik atau gambar yang dipilih.

CREATE TABLE IF NOT EXISTS komunikacare_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('patient', 'staff')),
  kind text NOT NULL CHECK (kind IN ('icon', 'text')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_komunikacare_visit_created
  ON komunikacare_messages(visit_id, created_at);

ALTER TABLE komunikacare_messages OWNER TO aksespass_owner;
ALTER TABLE komunikacare_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE komunikacare_messages FROM PUBLIC, aksespass_app;
GRANT SELECT, INSERT, DELETE ON TABLE komunikacare_messages TO aksespass_app;

-- Terlihat hanya bila kunjungan induknya terlihat (pasien pemilik atau petugas
-- fasilitas yang sama). Pendamping tidak ikut percakapan di layar petugas.
DROP POLICY IF EXISTS komunikacare_select_policy ON komunikacare_messages;
CREATE POLICY komunikacare_select_policy ON komunikacare_messages
  FOR SELECT TO aksespass_app
  USING (
    app_role() IN ('patient', 'staff')
    AND EXISTS (SELECT 1 FROM visits v WHERE v.id = komunikacare_messages.visit_id)
  );

-- Pengirim harus sesuai peran pemanggil.
DROP POLICY IF EXISTS komunikacare_insert_policy ON komunikacare_messages;
CREATE POLICY komunikacare_insert_policy ON komunikacare_messages
  FOR INSERT TO aksespass_app
  WITH CHECK (
    sender = app_role()
    AND sender IN ('patient', 'staff')
    AND EXISTS (SELECT 1 FROM visits v WHERE v.id = komunikacare_messages.visit_id)
  );

-- Hanya petugas fasilitas yang sama yang menghapus (saat pelayanan selesai).
DROP POLICY IF EXISTS komunikacare_delete_policy ON komunikacare_messages;
CREATE POLICY komunikacare_delete_policy ON komunikacare_messages
  FOR DELETE TO aksespass_app
  USING (
    app_role() = 'staff'
    AND EXISTS (SELECT 1 FROM visits v WHERE v.id = komunikacare_messages.visit_id)
  );
