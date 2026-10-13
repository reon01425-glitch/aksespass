-- 010_companion_links.sql
-- Tautan pendamping, kode tautan, dan pengamanan akses (Prompt 16 / Bagian 10A):
-- 1. Tabel companion_link_codes: pasien, code_hash, expires_at, used_at.
--    Kode 8 karakter Crockford Base32, berlaku 10 menit, sekali pakai, disimpan sebagai HMAC dengan HASH_PEPPER.
-- 2. companions.patient_subject_ref (pseudonim pasien) agar audit tindakan pendamping
--    dapat mencatat identitas pasien tanpa membaca tabel users.
-- 3. Fungsi SECURITY DEFINER:
--    - redeem_companion_link_code(code_hash): validasi kode -> used_at -> upsert companions -> audit companion_link_requested.
--    - get_patient_companions(): daftar pendamping milik pasien (id, display_name, status, requested_at, approved_at, revoked_at).
--    - get_patient_companion_name(companion_id): nama display pendamping untuk label paspor P4/P5.
-- 4. Penguatan RLS companions & companion_link_codes:
--    - companion_link_codes hanya diakses pasien pemilik; pendamping hanya lewat fungsi redeem.
--    - companions hanya bisa di-UPDATE oleh pasien pemilik (pendamping tidak bisa mengaktifkan tautan sendiri).

-- ============================================================================
-- 1. companion_link_codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS companion_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE CHECK (char_length(btrim(code_hash)) >= 32),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companion_link_codes OWNER TO aksespass_owner;

CREATE INDEX IF NOT EXISTS idx_companion_link_codes_patient ON companion_link_codes(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_companion_link_codes_hash ON companion_link_codes(code_hash);

-- ============================================================================
-- 2. companions.patient_subject_ref
-- ============================================================================
ALTER TABLE companions ADD COLUMN IF NOT EXISTS patient_subject_ref uuid REFERENCES users(audit_subject_id);

-- Backfill baris lama bila ada
UPDATE companions c
SET patient_subject_ref = u.audit_subject_id
FROM users u
WHERE c.patient_user_id = u.id AND c.patient_subject_ref IS NULL;

-- Trigger pengisian otomatis patient_subject_ref saat INSERT / UPDATE bila NULL
CREATE OR REPLACE FUNCTION set_companion_patient_subject_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.patient_subject_ref IS NULL THEN
    SELECT audit_subject_id INTO NEW.patient_subject_ref
    FROM users
    WHERE id = NEW.patient_user_id;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION set_companion_patient_subject_ref() OWNER TO aksespass_owner;

DROP TRIGGER IF EXISTS trg_set_companion_patient_subject_ref ON companions;
CREATE TRIGGER trg_set_companion_patient_subject_ref
  BEFORE INSERT OR UPDATE ON companions
  FOR EACH ROW
  EXECUTE FUNCTION set_companion_patient_subject_ref();

-- ============================================================================
-- 3. RLS pada companion_link_codes
-- ============================================================================
ALTER TABLE companion_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY companion_link_codes_patient_policy ON companion_link_codes
  FOR ALL
  TO aksespass_app
  USING (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  )
  WITH CHECK (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON companion_link_codes TO aksespass_app;

-- ============================================================================
-- 4. Penguatan RLS pada tabel companions
-- ============================================================================
-- Drop kebijakan lama yang memberi hak FOR ALL ke pendamping
DROP POLICY IF EXISTS companions_access_policy ON companions;
DROP POLICY IF EXISTS companions_select_policy ON companions;
DROP POLICY IF EXISTS companions_insert_policy ON companions;
DROP POLICY IF EXISTS companions_update_policy ON companions;
DROP POLICY IF EXISTS companions_delete_policy ON companions;

-- SELECT: pasien dan pendamping yang bersangkutan boleh membaca
CREATE POLICY companions_select_policy ON companions
  FOR SELECT
  TO aksespass_app
  USING (
    app_user_id() IS NOT NULL
    AND (
      (app_role() = 'patient' AND patient_user_id = app_user_id())
      OR (app_role() = 'companion' AND companion_user_id = app_user_id())
    )
  );

-- INSERT: hanya pasien (pendamping wajib lewat fungsi redeem_companion_link_code)
CREATE POLICY companions_insert_policy ON companions
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  );

-- UPDATE: HANYA pasien pemilik yang dapat mengubah status (approve / reject / revoke).
-- Pendamping TIDAK DAPAT meng-UPDATE baris companions secara langsung sehingga tidak bisa menyetujui sendiri.
CREATE POLICY companions_update_policy ON companions
  FOR UPDATE
  TO aksespass_app
  USING (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  )
  WITH CHECK (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  );

-- DELETE: hanya pasien pemilik
CREATE POLICY companions_delete_policy ON companions
  FOR DELETE
  TO aksespass_app
  USING (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND patient_user_id = app_user_id()
  );

-- ============================================================================
-- 5. Fungsi SECURITY DEFINER
-- ============================================================================

-- 5a. redeem_companion_link_code: hanya dipanggil oleh pendamping aktif
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

-- 5b. get_patient_companions: daftar pendamping milik pasien sendiri (tanpa telepon / email)
CREATE OR REPLACE FUNCTION get_patient_companions()
RETURNS TABLE (
  id uuid,
  companion_user_id uuid,
  display_name text,
  status text,
  requested_at timestamptz,
  approved_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := app_user_id();
  v_caller_role text := app_role();
BEGIN
  IF v_caller_role <> 'patient' OR v_caller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.companion_user_id,
    coalesce(u.display_name, 'Pendamping')::text AS display_name,
    c.status,
    c.requested_at,
    c.approved_at,
    c.revoked_at
  FROM companions c
  JOIN users u ON u.id = c.companion_user_id
  WHERE c.patient_user_id = v_caller_id
  ORDER BY
    CASE c.status
      WHEN 'pending' THEN 1
      WHEN 'active' THEN 2
      ELSE 3
    END,
    c.requested_at DESC;
END;
$$;

ALTER FUNCTION get_patient_companions() OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_patient_companions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_patient_companions() TO aksespass_app;

-- 5c. get_patient_companion_name: ambil nama display pendamping untuk label P4/P5
CREATE OR REPLACE FUNCTION get_patient_companion_name(p_companion_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := app_user_id();
  v_caller_role text := app_role();
  v_name text;
BEGIN
  IF v_caller_role <> 'patient' OR v_caller_id IS NULL OR p_companion_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(u.display_name, 'Pendamping') INTO v_name
  FROM companions c
  JOIN users u ON u.id = c.companion_user_id
  WHERE c.patient_user_id = v_caller_id
    AND c.companion_user_id = p_companion_id
  LIMIT 1;

  RETURN v_name;
END;
$$;

ALTER FUNCTION get_patient_companion_name(uuid) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_patient_companion_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_patient_companion_name(uuid) TO aksespass_app;
