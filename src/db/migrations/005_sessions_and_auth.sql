-- 005_sessions_and_auth.sql
-- Sesi pengguna, RLS sesi per app.user_id, dan fungsi SECURITY DEFINER sempit pra-sesi (login/OTP).

-- 1. Tabel sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id_hash text NOT NULL UNIQUE CHECK (char_length(btrim(session_id_hash)) >= 32),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN ('patient', 'companion', 'staff', 'facility_admin', 'curator')
  ),
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

ALTER TABLE sessions OWNER TO aksespass_owner;

REVOKE ALL ON TABLE sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sessions TO aksespass_app;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY sessions_own_user_all ON sessions
  FOR ALL
  TO aksespass_app
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());

-- 2. Fungsi SECURITY DEFINER sempit untuk pencarian user pra-sesi
-- Milik aksespass_owner, search_path eksplisit, EXECUTE hanya untuk aksespass_app.
CREATE OR REPLACE FUNCTION find_user_by_phone_pre_session(p_phone text)
RETURNS TABLE (
  id uuid,
  role text,
  status text,
  facility_id uuid,
  membership_status text,
  audit_subject_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id,
    u.role,
    u.status,
    sm.facility_id,
    sm.status AS membership_status,
    u.audit_subject_id
  FROM users u
  LEFT JOIN staff_memberships sm ON sm.user_id = u.id
  WHERE u.phone = p_phone
  LIMIT 1;
$$;

ALTER FUNCTION find_user_by_phone_pre_session(text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION find_user_by_phone_pre_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_user_by_phone_pre_session(text) TO aksespass_app;

-- 3. Fungsi SECURITY DEFINER sempit untuk pendaftaran user baru pra-sesi
-- Hanya mengizinkan pendaftaran mandiri peran patient atau companion.
CREATE OR REPLACE FUNCTION register_user_pre_session(
  p_phone text,
  p_role text,
  p_stats_consent boolean DEFAULT false,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  role text,
  status text,
  facility_id uuid,
  membership_status text,
  audit_subject_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id uuid;
  v_subject_id uuid;
  v_display_name text;
BEGIN
  IF p_role NOT IN ('patient', 'companion') THEN
    RAISE EXCEPTION 'Peran tidak diizinkan untuk pendaftaran mandiri: %', p_role;
  END IF;

  v_display_name := coalesce(
    nullif(btrim(p_display_name), ''),
    CASE WHEN p_role = 'companion' THEN 'Pendamping' ELSE 'Pasien' END
  );
  v_subject_id := gen_random_uuid();

  INSERT INTO users (
    role,
    phone,
    display_name,
    status,
    stats_consent,
    audit_subject_id
  ) VALUES (
    p_role,
    p_phone,
    v_display_name,
    'active',
    coalesce(p_stats_consent, false),
    v_subject_id
  )
  RETURNING users.id INTO v_new_id;

  RETURN QUERY
  SELECT
    v_new_id AS id,
    p_role AS role,
    'active'::text AS status,
    NULL::uuid AS facility_id,
    NULL::text AS membership_status,
    v_subject_id AS audit_subject_id;
END;
$$;

ALTER FUNCTION register_user_pre_session(text, text, boolean, text) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION register_user_pre_session(text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_user_pre_session(text, text, boolean, text) TO aksespass_app;
