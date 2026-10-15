-- 015_account_deletion_and_contact.sql
-- P22 (ubah kontak) dan P23 (hapus data dan akun pasien).
--
-- Penghapusan akun memakai pola campuran:
--  * Data pribadi dihapus permanen: paspor, kebutuhan, ConsentQR, tautan pendamping, sesi,
--    dan catatan kunjungan beserta tindak lanjutnya.
--  * Baris users TIDAK dihapus, melainkan menjadi "nisan" tanpa identitas (nomor, email, dan
--    nama dikosongkan, status inactive, deleted_at terisi). Baris ini menjaga kunci
--    audit_subject_id yang dipakai audit_events dan agregat fasilitas, sehingga identitas
--    pasien terpisah dari audit log tanpa memutus integritas referensial.
--  * Kunjungan hanya dipertahankan (tanpa catatan petugas, tanpa tindak lanjut) bila pasien
--    menyetujui statistik anonim (users.stats_consent = true), agar angka agregat fasilitas
--    tetap benar. Selain itu kunjungan dihapus.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_required;
ALTER TABLE users ADD CONSTRAINT users_contact_required CHECK (
  deleted_at IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL
);

-- 1. Hapus akun milik pasien yang sedang login
CREATE OR REPLACE FUNCTION delete_own_patient_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := app_user_id();
  v_role text := app_role();
  v_subject uuid;
  v_stats boolean;
  v_deleted timestamptz;
BEGIN
  IF v_user_id IS NULL OR v_role IS DISTINCT FROM 'patient' THEN
    RETURN false;
  END IF;

  SELECT audit_subject_id, stats_consent, deleted_at
    INTO v_subject, v_stats, v_deleted
  FROM users
  WHERE id = v_user_id AND role = 'patient'
  FOR UPDATE;

  IF v_subject IS NULL OR v_deleted IS NOT NULL THEN
    RETURN false;
  END IF;

  -- Catat audit sebelum identitas dilepas (tanpa isi data pasien)
  INSERT INTO audit_events (event_type, actor_id, actor_role, subject_ref)
  VALUES ('account_deleted', v_user_id, 'patient', v_subject);

  -- Tindak lanjut selalu dihapus
  DELETE FROM follow_ups
  WHERE visit_id IN (SELECT id FROM visits WHERE patient_user_id = v_user_id);

  IF v_stats THEN
    -- Pasien menyetujui statistik anonim: kunjungan tetap dihitung, tanpa data pribadi
    UPDATE visit_confirmations
    SET confirmed_by_user_id = NULL
    WHERE visit_id IN (SELECT id FROM visits WHERE patient_user_id = v_user_id);

    UPDATE visits
    SET staff_note = NULL,
        consent_id = NULL,
        call_room = NULL
    WHERE patient_user_id = v_user_id;
  ELSE
    DELETE FROM visits WHERE patient_user_id = v_user_id;
  END IF;

  DELETE FROM consents WHERE patient_user_id = v_user_id;
  DELETE FROM companion_link_codes WHERE patient_user_id = v_user_id;
  DELETE FROM companions WHERE patient_user_id = v_user_id;
  DELETE FROM patient_profiles WHERE user_id = v_user_id;
  DELETE FROM sessions WHERE user_id = v_user_id;

  UPDATE users
  SET phone = NULL,
      email = NULL,
      display_name = 'Akun dihapus',
      status = 'inactive',
      deleted_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

ALTER FUNCTION delete_own_patient_account() OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION delete_own_patient_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_patient_account() TO aksespass_app;

-- 2. Ganti nomor HP akun yang sedang login (kode verifikasi diperiksa di lapisan aplikasi)
CREATE OR REPLACE FUNCTION change_own_phone(p_new_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := app_user_id();
  v_role text := app_role();
BEGIN
  IF v_user_id IS NULL OR v_role NOT IN ('patient', 'companion') THEN
    RETURN false;
  END IF;

  IF p_new_phone IS NULL OR btrim(p_new_phone) = '' THEN
    RETURN false;
  END IF;

  -- Nomor yang sudah dipakai akun lain ditolak tanpa membedakan alasan
  IF EXISTS (SELECT 1 FROM users WHERE phone = p_new_phone AND id <> v_user_id) THEN
    RETURN false;
  END IF;

  UPDATE users
  SET phone = p_new_phone, updated_at = now()
  WHERE id = v_user_id AND deleted_at IS NULL AND status = 'active';

  RETURN FOUND;
END;
$$;

ALTER FUNCTION change_own_phone(text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION change_own_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_own_phone(text) TO aksespass_app;

-- 3. Baca nomor HP sendiri (untuk dimasking di P22 dan mengirim kode verifikasi P23)
CREATE OR REPLACE FUNCTION get_own_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT phone FROM users
  WHERE id = app_user_id() AND deleted_at IS NULL;
$$;

ALTER FUNCTION get_own_phone() OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_own_phone() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_own_phone() TO aksespass_app;
