-- 016_companion_relink_guard.sql
-- Menautkan ulang pendamping yang sudah aktif/menunggu ditolak; hanya tautan dicabut yang boleh diajukan lagi.

CREATE OR REPLACE FUNCTION redeem_companion_link_code(p_code_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := app_user_id();
  v_caller_role text := app_role();
  v_code_id uuid;
  v_patient_id uuid;
  v_patient_subject_ref uuid;
  v_link_id uuid;
  v_existing_status text;
BEGIN
  -- 1. Validasi pemanggil: harus peran companion
  IF v_caller_role <> 'companion' OR v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: hanya pendamping yang dapat menukar kode tautan.';
  END IF;

  -- 2. Validasi kode: harus ada, belum digunakan, dan belum kedaluwarsa
  SELECT id, patient_user_id
  INTO v_code_id, v_patient_id
  FROM companion_link_codes
  WHERE code_hash = p_code_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Tidak boleh menautkan akun ke diri sendiri
  IF v_patient_id = v_caller_id THEN
    RETURN NULL;
  END IF;

  -- 2b. Pendamping yang sudah aktif atau masih menunggu persetujuan tidak boleh menautkan lagi
  -- (sebelumnya baris aktif tertimpa menjadi pending sehingga akses hilang). Kode tidak dihanguskan.
  SELECT status INTO v_existing_status
  FROM companions
  WHERE patient_user_id = v_patient_id AND companion_user_id = v_caller_id;

  IF v_existing_status = 'active' THEN
    RAISE EXCEPTION 'ALREADY_LINKED_ACTIVE';
  ELSIF v_existing_status = 'pending' THEN
    RAISE EXCEPTION 'ALREADY_LINKED_PENDING';
  END IF;

  -- 3. Ambil subject_ref pasien
  SELECT audit_subject_id INTO v_patient_subject_ref
  FROM users
  WHERE id = v_patient_id;

  -- 4. Tandai kode terpakai (sekali pakai)
  UPDATE companion_link_codes
  SET used_at = now()
  WHERE id = v_code_id;

  -- 5. Upsert ke tabel companions: status pending.
  -- Ingat UNIQUE (patient_user_id, companion_user_id): baris revoked diaktifkan ulang menjadi pending.
  INSERT INTO companions (
    patient_user_id,
    companion_user_id,
    patient_subject_ref,
    status,
    requested_at,
    approved_at,
    revoked_at
  ) VALUES (
    v_patient_id,
    v_caller_id,
    v_patient_subject_ref,
    'pending',
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (patient_user_id, companion_user_id)
  DO UPDATE SET
    status = 'pending',
    patient_subject_ref = coalesce(EXCLUDED.patient_subject_ref, companions.patient_subject_ref),
    requested_at = now(),
    approved_at = NULL,
    revoked_at = NULL
  RETURNING id INTO v_link_id;

  -- 6. Audit companion_link_requested
  INSERT INTO audit_events (
    event_type,
    actor_id,
    actor_role,
    subject_ref,
    facility_id,
    fields,
    occurred_at
  ) VALUES (
    'companion_link_requested',
    v_caller_id,
    'companion',
    v_patient_subject_ref,
    NULL,
    '{}'::text[],
    now()
  );

  RETURN v_link_id;
END;
$$;

ALTER FUNCTION redeem_companion_link_code(text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION redeem_companion_link_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_companion_link_code(text) TO aksespass_app;
