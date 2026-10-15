-- 018_card_code_and_card_visits.sql
-- T4b: kunjungan dari kartu cetak. Pasien punya Kode Kartu statis (8 karakter Crockford Base32)
-- yang tercetak di kartu (P7). Kode tidak berisi data dan hanya dipakai petugas untuk mencatat
-- kunjungan; tidak membuka profil. Pasien dapat membuat kode baru (kode lama langsung mati).

ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS card_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_profiles_card_code_check'
  ) THEN
    ALTER TABLE patient_profiles
      ADD CONSTRAINT patient_profiles_card_code_check
      CHECK (card_code IS NULL OR card_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_profiles_card_code
  ON patient_profiles (card_code) WHERE card_code IS NOT NULL;

-- Petugas aktif mencari pasien dari kode kartu. Hanya mengembalikan pengenal internal
-- yang dibutuhkan untuk menulis kunjungan; tidak ada nama atau isi profil.
CREATE OR REPLACE FUNCTION find_patient_by_card_code(p_code text)
RETURNS TABLE (patient_user_id uuid, subject_ref uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF app_role() IS DISTINCT FROM 'staff'
     OR app_user_id() IS NULL
     OR app_facility_id() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pp.user_id, u.audit_subject_id
  FROM patient_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE pp.card_code = upper(btrim(p_code))
    AND u.role = 'patient'
    AND u.status = 'active'
    AND u.deleted_at IS NULL
  LIMIT 1;
END;
$$;

ALTER FUNCTION find_patient_by_card_code(text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION find_patient_by_card_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_patient_by_card_code(text) TO aksespass_app;
