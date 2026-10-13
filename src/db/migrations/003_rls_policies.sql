-- 003_rls_policies.sql
-- Kebijakan Row-Level Security (RLS) berbasis konteks per transaksi (current_setting(..., true)).
-- Catatan: Jalur login sebelum sesi ada tidak dibuat di sini; Prompt 6 akan memakai fungsi SECURITY DEFINER yang sempit.
-- Catatan: Agregat dashboard admin fasilitas akan memakai fungsi SECURITY DEFINER di Prompt 15.

-- Fungsi pembaca konteks transaksi (STABLE, SECURITY INVOKER)
CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(current_setting('app.user_id', true), '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN current_setting('app.user_id', true)::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(btrim(coalesce(current_setting('app.role', true), '')), '');
$$;

CREATE OR REPLACE FUNCTION app_facility_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(current_setting('app.facility_id', true), '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN current_setting('app.facility_id', true)::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION app_scan_token_hash()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(btrim(coalesce(current_setting('app.scan_token_hash', true), '')), '');
$$;

ALTER FUNCTION app_user_id() OWNER TO aksespass_owner;
ALTER FUNCTION app_role() OWNER TO aksespass_owner;
ALTER FUNCTION app_facility_id() OWNER TO aksespass_owner;
ALTER FUNCTION app_scan_token_hash() OWNER TO aksespass_owner;

-- Fungsi bantu pemeriksaan relasi lintas tabel (SECURITY DEFINER milik aksespass_owner)
CREATE OR REPLACE FUNCTION app_is_active_companion_of(target_patient_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT app_role() = 'companion'
    AND app_user_id() IS NOT NULL
    AND target_patient_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM companions comp
      WHERE comp.patient_user_id = target_patient_user_id
        AND comp.companion_user_id = app_user_id()
        AND comp.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION app_can_manage_consent(target_consent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_consent_id IS NOT NULL
    AND app_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM consents c
      WHERE c.id = target_consent_id
        AND (
          (app_role() = 'patient' AND c.patient_user_id = app_user_id())
          OR app_is_active_companion_of(c.patient_user_id)
        )
    );
$$;

CREATE OR REPLACE FUNCTION app_consent_matches_scan_token(target_consent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT app_role() = 'staff'
    AND app_user_id() IS NOT NULL
    AND app_scan_token_hash() IS NOT NULL
    AND target_consent_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM consent_qr cq
      WHERE cq.consent_id = target_consent_id
        AND cq.token_hash = app_scan_token_hash()
    );
$$;

CREATE OR REPLACE FUNCTION app_staff_has_valid_scan_for_patient(target_patient_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT app_role() = 'staff'
    AND app_user_id() IS NOT NULL
    AND app_facility_id() IS NOT NULL
    AND app_scan_token_hash() IS NOT NULL
    AND target_patient_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM consent_qr cq
      JOIN consents c ON c.id = cq.consent_id
      WHERE cq.token_hash = app_scan_token_hash()
        AND cq.revoked_at IS NULL
        AND cq.expires_at > now()
        AND c.patient_user_id = target_patient_user_id
        AND c.facility_id = app_facility_id()
        AND c.valid_from <= now()
        AND c.valid_until > now()
    );
$$;

ALTER FUNCTION app_is_active_companion_of(uuid) OWNER TO aksespass_owner;
ALTER FUNCTION app_can_manage_consent(uuid) OWNER TO aksespass_owner;
ALTER FUNCTION app_consent_matches_scan_token(uuid) OWNER TO aksespass_owner;
ALTER FUNCTION app_staff_has_valid_scan_for_patient(uuid) OWNER TO aksespass_owner;

REVOKE ALL ON FUNCTION
  app_user_id(),
  app_role(),
  app_facility_id(),
  app_scan_token_hash(),
  app_is_active_companion_of(uuid),
  app_can_manage_consent(uuid),
  app_consent_matches_scan_token(uuid),
  app_staff_has_valid_scan_for_patient(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  app_user_id(),
  app_role(),
  app_facility_id(),
  app_scan_token_hash(),
  app_is_active_companion_of(uuid),
  app_can_manage_consent(uuid),
  app_consent_matches_scan_token(uuid),
  app_staff_has_valid_scan_for_patient(uuid)
TO aksespass_owner, aksespass_app;

-- Aktifkan RLS pada seluruh tabel berisi data pengguna.
-- aksespass_app bukan pemilik tabel dan tanpa BYPASSRLS sehingga wajib tunduk pada RLS,
-- sedangkan fungsi SECURITY DEFINER milik aksespass_owner dapat bekerja tanpa siklus.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profile_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. users: baris sendiri; admin fasilitas melihat user petugas di fasilitasnya
-- ============================================================================
CREATE POLICY users_access_policy ON users
  FOR ALL
  TO aksespass_app
  USING (
    app_user_id() IS NOT NULL
    AND app_role() IS NOT NULL
    AND (
      id = app_user_id()
      OR (
        app_role() = 'facility_admin'
        AND app_facility_id() IS NOT NULL
        AND role = 'staff'
        AND EXISTS (
          SELECT 1
          FROM staff_memberships sm
          WHERE sm.user_id = users.id
            AND sm.facility_id = app_facility_id()
        )
      )
    )
  )
  WITH CHECK (
    app_user_id() IS NOT NULL
    AND app_role() IS NOT NULL
    AND (
      id = app_user_id()
      OR (
        app_role() = 'facility_admin'
        AND app_facility_id() IS NOT NULL
        AND role = 'staff'
        AND EXISTS (
          SELECT 1
          FROM staff_memberships sm
          WHERE sm.user_id = users.id
            AND sm.facility_id = app_facility_id()
        )
      )
    )
  );

-- ============================================================================
-- 2. staff_memberships: baris sendiri; admin fasilitas yang sama
-- ============================================================================
CREATE POLICY staff_memberships_access_policy ON staff_memberships
  FOR ALL
  TO aksespass_app
  USING (
    app_user_id() IS NOT NULL
    AND app_role() IS NOT NULL
    AND (
      user_id = app_user_id()
      OR (
        app_role() = 'facility_admin'
        AND app_facility_id() IS NOT NULL
        AND facility_id = app_facility_id()
      )
    )
  )
  WITH CHECK (
    app_user_id() IS NOT NULL
    AND app_role() IS NOT NULL
    AND (
      user_id = app_user_id()
      OR (
        app_role() = 'facility_admin'
        AND app_facility_id() IS NOT NULL
        AND facility_id = app_facility_id()
      )
    )
  );

-- ============================================================================
-- 3. patient_profiles: pasien pemilik; pendamping aktif; petugas hanya bila
--    app.scan_token_hash cocok dengan consent_qr valid untuk app.facility_id
-- ============================================================================
CREATE POLICY patient_profiles_select_policy ON patient_profiles
  FOR SELECT
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND user_id = app_user_id())
    OR app_is_active_companion_of(user_id)
    OR app_staff_has_valid_scan_for_patient(user_id)
  );

CREATE POLICY patient_profiles_insert_policy ON patient_profiles
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND user_id = app_user_id())
    OR app_is_active_companion_of(user_id)
  );

CREATE POLICY patient_profiles_update_policy ON patient_profiles
  FOR UPDATE
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND user_id = app_user_id())
    OR app_is_active_companion_of(user_id)
  )
  WITH CHECK (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND user_id = app_user_id())
    OR app_is_active_companion_of(user_id)
  );

CREATE POLICY patient_profiles_delete_policy ON patient_profiles
  FOR DELETE
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND user_id = app_user_id())
    OR app_is_active_companion_of(user_id)
  );

-- ============================================================================
-- 4. patient_profile_needs: mengikuti visibilitas dan hak tulis patient_profiles
-- ============================================================================
CREATE POLICY patient_profile_needs_select_policy ON patient_profile_needs
  FOR SELECT
  TO aksespass_app
  USING (
    EXISTS (
      SELECT 1
      FROM patient_profiles pp
      WHERE pp.id = patient_profile_needs.profile_id
    )
  );

CREATE POLICY patient_profile_needs_insert_policy ON patient_profile_needs
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM patient_profiles pp
      WHERE pp.id = patient_profile_needs.profile_id
        AND (
          (app_role() = 'patient' AND app_user_id() IS NOT NULL AND pp.user_id = app_user_id())
          OR app_is_active_companion_of(pp.user_id)
        )
    )
  );

CREATE POLICY patient_profile_needs_update_policy ON patient_profile_needs
  FOR UPDATE
  TO aksespass_app
  USING (
    EXISTS (
      SELECT 1
      FROM patient_profiles pp
      WHERE pp.id = patient_profile_needs.profile_id
        AND (
          (app_role() = 'patient' AND app_user_id() IS NOT NULL AND pp.user_id = app_user_id())
          OR app_is_active_companion_of(pp.user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM patient_profiles pp
      WHERE pp.id = patient_profile_needs.profile_id
        AND (
          (app_role() = 'patient' AND app_user_id() IS NOT NULL AND pp.user_id = app_user_id())
          OR app_is_active_companion_of(pp.user_id)
        )
    )
  );

CREATE POLICY patient_profile_needs_delete_policy ON patient_profile_needs
  FOR DELETE
  TO aksespass_app
  USING (
    EXISTS (
      SELECT 1
      FROM patient_profiles pp
      WHERE pp.id = patient_profile_needs.profile_id
        AND (
          (app_role() = 'patient' AND app_user_id() IS NOT NULL AND pp.user_id = app_user_id())
          OR app_is_active_companion_of(pp.user_id)
        )
    )
  );

-- ============================================================================
-- 5. consents: pasien pemilik dan pendamping aktif; petugas hanya saat
--    scan_token_hash cocok dengan consent_qr terkait
-- ============================================================================
CREATE POLICY consents_select_policy ON consents
  FOR SELECT
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND patient_user_id = app_user_id())
    OR app_is_active_companion_of(patient_user_id)
    OR app_consent_matches_scan_token(id)
  );

CREATE POLICY consents_insert_policy ON consents
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND patient_user_id = app_user_id())
    OR app_is_active_companion_of(patient_user_id)
  );

CREATE POLICY consents_update_policy ON consents
  FOR UPDATE
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND patient_user_id = app_user_id())
    OR app_is_active_companion_of(patient_user_id)
  )
  WITH CHECK (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND patient_user_id = app_user_id())
    OR app_is_active_companion_of(patient_user_id)
  );

CREATE POLICY consents_delete_policy ON consents
  FOR DELETE
  TO aksespass_app
  USING (
    (app_role() = 'patient' AND app_user_id() IS NOT NULL AND patient_user_id = app_user_id())
    OR app_is_active_companion_of(patient_user_id)
  );

-- ============================================================================
-- 6. consent_qr: pasien pemilik dan pendamping aktif; petugas hanya baris
--    consent_qr yang token_hash = app.scan_token_hash
-- ============================================================================
CREATE POLICY consent_qr_select_policy ON consent_qr
  FOR SELECT
  TO aksespass_app
  USING (
    app_can_manage_consent(consent_id)
    OR (
      app_role() = 'staff'
      AND app_user_id() IS NOT NULL
      AND app_scan_token_hash() IS NOT NULL
      AND token_hash = app_scan_token_hash()
    )
  );

CREATE POLICY consent_qr_insert_policy ON consent_qr
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    app_can_manage_consent(consent_id)
  );

CREATE POLICY consent_qr_update_policy ON consent_qr
  FOR UPDATE
  TO aksespass_app
  USING (
    app_can_manage_consent(consent_id)
  )
  WITH CHECK (
    app_can_manage_consent(consent_id)
  );

CREATE POLICY consent_qr_delete_policy ON consent_qr
  FOR DELETE
  TO aksespass_app
  USING (
    app_can_manage_consent(consent_id)
  );

-- ============================================================================
-- 7. companions: pasien dan pendamping yang bersangkutan
-- ============================================================================
CREATE POLICY companions_access_policy ON companions
  FOR ALL
  TO aksespass_app
  USING (
    app_user_id() IS NOT NULL
    AND (
      (app_role() = 'patient' AND patient_user_id = app_user_id())
      OR (app_role() = 'companion' AND companion_user_id = app_user_id())
    )
  )
  WITH CHECK (
    app_user_id() IS NOT NULL
    AND (
      (app_role() = 'patient' AND patient_user_id = app_user_id())
      OR (app_role() = 'companion' AND companion_user_id = app_user_id())
    )
  );

-- ============================================================================
-- 8. visits: petugas fasilitas yang sama; pasien pemilik; pendamping aktif.
--    Admin fasilitas TIDAK punya akses baris.
-- ============================================================================
CREATE POLICY visits_select_policy ON visits
  FOR SELECT
  TO aksespass_app
  USING (
    (
      app_role() = 'staff'
      AND app_user_id() IS NOT NULL
      AND app_facility_id() IS NOT NULL
      AND facility_id = app_facility_id()
    )
    OR (
      app_role() = 'patient'
      AND app_user_id() IS NOT NULL
      AND patient_user_id = app_user_id()
    )
    OR app_is_active_companion_of(patient_user_id)
  );

CREATE POLICY visits_insert_policy ON visits
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    app_role() = 'staff'
    AND app_user_id() IS NOT NULL
    AND app_facility_id() IS NOT NULL
    AND facility_id = app_facility_id()
  );

CREATE POLICY visits_update_policy ON visits
  FOR UPDATE
  TO aksespass_app
  USING (
    app_role() = 'staff'
    AND app_user_id() IS NOT NULL
    AND app_facility_id() IS NOT NULL
    AND facility_id = app_facility_id()
  )
  WITH CHECK (
    app_role() = 'staff'
    AND app_user_id() IS NOT NULL
    AND app_facility_id() IS NOT NULL
    AND facility_id = app_facility_id()
  );

-- ============================================================================
-- 9. visit_confirmations: petugas fasilitas yang sama; pasien pemilik;
--    pendamping aktif. Admin fasilitas TIDAK punya akses baris.
-- ============================================================================
CREATE POLICY visit_confirmations_access_policy ON visit_confirmations
  FOR ALL
  TO aksespass_app
  USING (
    EXISTS (
      SELECT 1
      FROM visits v
      WHERE v.id = visit_confirmations.visit_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM visits v
      WHERE v.id = visit_confirmations.visit_id
    )
  );

-- ============================================================================
-- 10. audit_events: INSERT bila ada konteks; SELECT hanya pasien untuk
--     subject_ref = audit_subject_id miliknya
-- ============================================================================
CREATE POLICY audit_events_insert_policy ON audit_events
  FOR INSERT
  TO aksespass_app
  WITH CHECK (
    app_role() IS NOT NULL
    AND (
      app_user_id() IS NOT NULL
      OR app_role() = 'system'
    )
  );

CREATE POLICY audit_events_select_policy ON audit_events
  FOR SELECT
  TO aksespass_app
  USING (
    app_role() = 'patient'
    AND app_user_id() IS NOT NULL
    AND subject_ref IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = app_user_id()
        AND u.audit_subject_id = audit_events.subject_ref
    )
  );
