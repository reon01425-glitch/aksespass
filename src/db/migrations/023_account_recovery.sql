-- 023_account_recovery.sql
-- Pemulihan akun penuh lewat pendamping tertaut (architecture.md bagian 10, diubah 16 Okt 2026):
-- pasien kehilangan nomor lama; pendamping aktif mengajukan pemindahan akun ke nomor baru.
--   * Kode verifikasi dikirim ke nomor BARU (membuktikan nomor itu memang bisa dipakai).
--   * Jeda keselamatan (bawaan 24 jam, diatur aplikasi) sebelum nomor diganti.
--   * Selama jeda, pasien (bila masih bisa masuk) atau pendamping aktif mana pun dapat membatalkan.
--   * Nomor diganti saat seseorang berhasil masuk dengan nomor baru setelah jeda berakhir;
--     seluruh riwayat tetap karena yang berganti hanya users.phone akun yang sama.
-- Tabel tidak dapat diakses langsung oleh aplikasi; hanya lewat fungsi SECURITY DEFINER di bawah.

CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_phone text NOT NULL CHECK (char_length(btrim(new_phone)) >= 8),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  eligible_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE account_recovery_requests OWNER TO aksespass_owner;
ALTER TABLE account_recovery_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_recovery_requests FROM PUBLIC;
REVOKE ALL ON account_recovery_requests FROM aksespass_app;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recovery_pending_patient
  ON account_recovery_requests (patient_user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_recovery_pending_phone
  ON account_recovery_requests (new_phone) WHERE status = 'pending';

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
    'recovery_requested', 'recovery_cancelled', 'recovery_completed'
  )
);

-- 1. Pendamping aktif mengajukan pemulihan. Mengembalikan 0 baris bila ditolak (alasan tidak dibedakan).
CREATE OR REPLACE FUNCTION request_account_recovery(
  p_link_id uuid,
  p_new_phone text,
  p_delay_minutes integer
)
RETURNS TABLE (id uuid, eligible_at timestamptz, patient_subject_ref uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := app_user_id();
  v_patient uuid;
  v_subject uuid;
  v_eligible timestamptz;
  v_id uuid;
BEGIN
  IF v_caller IS NULL OR app_role() <> 'companion' THEN
    RETURN;
  END IF;
  IF p_new_phone IS NULL OR btrim(p_new_phone) = '' OR p_delay_minutes IS NULL OR p_delay_minutes < 0 THEN
    RETURN;
  END IF;

  SELECT c.patient_user_id, c.patient_subject_ref INTO v_patient, v_subject
  FROM companions c
  WHERE c.id = p_link_id AND c.companion_user_id = v_caller AND c.status = 'active';
  IF v_patient IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM users u WHERE u.phone = p_new_phone) THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM account_recovery_requests r
    WHERE r.status = 'pending' AND (r.patient_user_id = v_patient OR r.new_phone = p_new_phone)
  ) THEN
    RETURN;
  END IF;

  v_eligible := now() + make_interval(mins => p_delay_minutes);
  INSERT INTO account_recovery_requests (patient_user_id, initiated_by_user_id, new_phone, eligible_at)
  VALUES (v_patient, v_caller, p_new_phone, v_eligible)
  RETURNING account_recovery_requests.id INTO v_id;

  RETURN QUERY SELECT v_id, v_eligible, v_subject;
END;
$$;

ALTER FUNCTION request_account_recovery(uuid, text, integer) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION request_account_recovery(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_account_recovery(uuid, text, integer) TO aksespass_app;

-- 2. Permintaan tertunda yang terlihat oleh pemanggil (pasien terkait atau pendamping aktifnya).
CREATE OR REPLACE FUNCTION get_recovery_requests()
RETURNS TABLE (
  id uuid,
  link_id uuid,
  new_phone text,
  created_at timestamptz,
  eligible_at timestamptz,
  initiated_by_me boolean,
  initiator_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, c.id AS link_id, r.new_phone, r.created_at, r.eligible_at,
         (r.initiated_by_user_id = app_user_id()) AS initiated_by_me,
         iu.display_name AS initiator_name
  FROM account_recovery_requests r
  JOIN users iu ON iu.id = r.initiated_by_user_id
  LEFT JOIN companions c
    ON c.patient_user_id = r.patient_user_id
   AND c.companion_user_id = app_user_id()
   AND c.status = 'active'
  WHERE app_user_id() IS NOT NULL
    AND r.status = 'pending'
    AND (r.patient_user_id = app_user_id() OR c.id IS NOT NULL)
  ORDER BY r.created_at DESC;
$$;

ALTER FUNCTION get_recovery_requests() OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_recovery_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_recovery_requests() TO aksespass_app;

-- 3. Batalkan: pasien terkait atau pendamping aktif mana pun. Mengembalikan audit_subject_id pasien, atau NULL.
CREATE OR REPLACE FUNCTION cancel_account_recovery(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := app_user_id();
  v_patient uuid;
  v_subject uuid;
BEGIN
  IF v_caller IS NULL OR app_role() NOT IN ('patient', 'companion') THEN
    RETURN NULL;
  END IF;

  SELECT r.patient_user_id INTO v_patient
  FROM account_recovery_requests r
  WHERE r.id = p_id AND r.status = 'pending'
  FOR UPDATE;
  IF v_patient IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_patient <> v_caller AND NOT EXISTS (
    SELECT 1 FROM companions c
    WHERE c.patient_user_id = v_patient AND c.companion_user_id = v_caller AND c.status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  UPDATE account_recovery_requests
  SET status = 'cancelled', resolved_at = now(), resolved_by = v_caller
  WHERE id = p_id;

  SELECT audit_subject_id INTO v_subject FROM users WHERE id = v_patient;
  RETURN v_subject;
END;
$$;

ALTER FUNCTION cancel_account_recovery(uuid) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION cancel_account_recovery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_account_recovery(uuid) TO aksespass_app;

-- 4. Pra-sesi: dipanggil saat OTP nomor baru lolos tetapi belum ada akun dengan nomor itu.
--    outcome: 'waiting' (jeda belum selesai), 'completed' (nomor diganti), 'blocked' (nomor keburu dipakai akun lain).
CREATE OR REPLACE FUNCTION complete_account_recovery_pre_session(p_phone text)
RETURNS TABLE (outcome text, user_id uuid, eligible_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r account_recovery_requests%ROWTYPE;
BEGIN
  SELECT * INTO r
  FROM account_recovery_requests
  WHERE new_phone = p_phone AND status = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF now() < r.eligible_at THEN
    RETURN QUERY SELECT 'waiting'::text, NULL::uuid, r.eligible_at;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM users u WHERE u.phone = p_phone) THEN
    UPDATE account_recovery_requests SET status = 'cancelled', resolved_at = now() WHERE id = r.id;
    RETURN QUERY SELECT 'blocked'::text, NULL::uuid, r.eligible_at;
    RETURN;
  END IF;

  UPDATE users SET phone = p_phone, updated_at = now()
  WHERE id = r.patient_user_id AND deleted_at IS NULL AND status = 'active';
  IF NOT FOUND THEN
    UPDATE account_recovery_requests SET status = 'cancelled', resolved_at = now() WHERE id = r.id;
    RETURN QUERY SELECT 'blocked'::text, NULL::uuid, r.eligible_at;
    RETURN;
  END IF;

  -- Sesi lama pasien tidak berlaku lagi setelah pemindahan nomor.
  DELETE FROM sessions s WHERE s.user_id = r.patient_user_id;
  UPDATE account_recovery_requests
  SET status = 'completed', resolved_at = now(), resolved_by = r.patient_user_id
  WHERE id = r.id;

  RETURN QUERY SELECT 'completed'::text, r.patient_user_id, r.eligible_at;
END;
$$;

ALTER FUNCTION complete_account_recovery_pre_session(text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION complete_account_recovery_pre_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_account_recovery_pre_session(text) TO aksespass_app;
