-- 020_admin_staff_management.sql
-- Kelola akun petugas oleh admin fasilitas (A4/A5) dan aktivasi login pertama (A2).
--   * Petugas dibuat admin: users.status='pending' + staff_memberships.status='invited'.
--   * Login pertama dengan nomor HP terdaftar (HP + kode) mengaktifkan akun.
--   * Nonaktifkan/aktifkan kembali dan ubah nama/unit memakai RLS yang sudah ada
--     (admin hanya menjangkau petugas fasilitasnya sendiri).
--   * Jenis audit baru tanpa isi data pasien.

-- 1. Jenis peristiwa audit baru
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_event_type_check;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_event_type_check CHECK (
  event_type IN (
    'qr_created', 'qr_revoked', 'qr_scanned', 'profile_read', 'brief_sent',
    'brief_opened', 'qr_scan_rejected', 'visit_recorded', 'visit_synced',
    'visit_confirmed', 'companion_link_requested', 'companion_linked',
    'companion_unlinked', 'profile_changed_by_companion', 'delegation_signed_off',
    'access_reported', 'account_deleted',
    'staff_invited', 'staff_activated', 'staff_updated',
    'staff_deactivated', 'staff_reactivated'
  )
);

-- 2. Admin membuat petugas (user + keanggotaan) di fasilitasnya sendiri.
--    INSERT users lewat RLS tidak mungkin karena keanggotaan belum ada, maka fungsi sempit ini.
CREATE OR REPLACE FUNCTION admin_create_staff(
  p_name text,
  p_phone text,
  p_unit text
)
RETURNS TABLE (user_id uuid, audit_subject_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_subject uuid := gen_random_uuid();
BEGIN
  IF app_role() IS DISTINCT FROM 'facility_admin'
     OR app_user_id() IS NULL
     OR app_facility_id() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 80
     OR char_length(btrim(coalesce(p_unit, ''))) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'INVALID_INPUT';
  END IF;
  IF EXISTS (SELECT 1 FROM users u WHERE u.phone = p_phone) THEN
    RAISE EXCEPTION 'PHONE_TAKEN';
  END IF;

  INSERT INTO users (role, phone, display_name, status, audit_subject_id)
  VALUES ('staff', p_phone, btrim(p_name), 'pending', v_subject)
  RETURNING users.id INTO v_id;

  INSERT INTO staff_memberships (user_id, facility_id, unit, status)
  VALUES (v_id, app_facility_id(), btrim(p_unit), 'invited');

  RETURN QUERY SELECT v_id, v_subject;
END;
$$;
ALTER FUNCTION admin_create_staff(text, text, text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION admin_create_staff(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_create_staff(text, text, text) TO aksespass_app;

-- 3. Aktivasi login pertama: dipanggil setelah OTP valid (pra-sesi).
--    Hanya mengubah akun staf yang masih 'invited'; akun nonaktif tidak pernah dihidupkan.
CREATE OR REPLACE FUNCTION activate_invited_staff_pre_session(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE staff_memberships sm
     SET status = 'active', updated_at = now()
   WHERE sm.user_id = p_user_id
     AND sm.status = 'invited'
     AND EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id
                 AND u.role = 'staff' AND u.status = 'pending');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RETURN false;
  END IF;
  UPDATE users SET status = 'active', updated_at = now() WHERE id = p_user_id;
  RETURN true;
END;
$$;
ALTER FUNCTION activate_invited_staff_pre_session(uuid) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION activate_invited_staff_pre_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_invited_staff_pre_session(uuid) TO aksespass_app;
