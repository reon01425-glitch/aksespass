-- 002_roles_and_grants.sql
-- Peran database terpisah:
-- aksespass_owner (pemilik tabel, NOLOGIN)
-- aksespass_app (aplikasi, LOGIN, NOBYPASSRLS)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'aksespass_owner'
  ) THEN
    CREATE ROLE aksespass_owner
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE aksespass_owner
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'aksespass_app'
  ) THEN
    CREATE ROLE aksespass_app
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE aksespass_app
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

-- Berikan role owner kepada role migrasi saat ini.
DO $$
BEGIN
  EXECUTE format('GRANT aksespass_owner TO %I', current_user);
END
$$;

-- Berikan privilege schema sebelum mengubah pemilik objek.
GRANT USAGE, CREATE ON SCHEMA public TO aksespass_owner;

-- Alihkan kepemilikan tabel dan sequence aplikasi.
ALTER TABLE IF EXISTS schema_migrations OWNER TO aksespass_owner;
ALTER TABLE facilities OWNER TO aksespass_owner;
ALTER TABLE users OWNER TO aksespass_owner;
ALTER TABLE staff_memberships OWNER TO aksespass_owner;
ALTER TABLE needs_catalog OWNER TO aksespass_owner;
ALTER TABLE patient_profiles OWNER TO aksespass_owner;
ALTER TABLE patient_profile_needs OWNER TO aksespass_owner;
ALTER TABLE accommodation_rules OWNER TO aksespass_owner;
ALTER TABLE consents OWNER TO aksespass_owner;
ALTER TABLE consent_qr OWNER TO aksespass_owner;
ALTER TABLE companions OWNER TO aksespass_owner;
ALTER TABLE visits OWNER TO aksespass_owner;
ALTER TABLE visit_confirmations OWNER TO aksespass_owner;
ALTER TABLE audit_events OWNER TO aksespass_owner;
ALTER SEQUENCE audit_events_id_seq OWNER TO aksespass_owner;

-- Cabut hak bawaan PUBLIC dan aksespass_app.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, aksespass_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, aksespass_app;

-- Hak minimum pada schema.
GRANT USAGE ON SCHEMA public TO aksespass_owner, aksespass_app;

-- Katalog, aturan akomodasi, dan fasilitas: hanya SELECT.
GRANT SELECT ON TABLE
  facilities,
  needs_catalog,
  accommodation_rules
TO aksespass_app;

-- Audit events: SELECT dan INSERT saja.
GRANT SELECT, INSERT ON TABLE audit_events TO aksespass_app;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO aksespass_app;

-- Tabel operasional dan data pengguna.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users,
  staff_memberships,
  patient_profiles,
  patient_profile_needs,
  consents,
  consent_qr,
  companions,
  visits,
  visit_confirmations
TO aksespass_app;