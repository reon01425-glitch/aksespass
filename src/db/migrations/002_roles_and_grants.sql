-- 002_roles_and_grants.sql
-- Peran database terpisah: aksespass_owner (pemilik tabel, NOLOGIN) dan aksespass_app (aplikasi, LOGIN, NOBYPASSRLS)
-- Jalur login pra-sesi akan memakai fungsi SECURITY DEFINER yang sempit di Prompt 6.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aksespass_owner') THEN
    CREATE ROLE aksespass_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE aksespass_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aksespass_app') THEN
    CREATE ROLE aksespass_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE aksespass_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

-- Pastikan peran admin migrasi dapat mengalihkan kepemilikan objek ke aksespass_owner
DO $$
BEGIN
  EXECUTE format('GRANT aksespass_owner TO %I', current_user);
END
$$;

-- Pemilik baru suatu tabel atau fungsi wajib punya hak CREATE pada schema-nya. Superuser (Postgres lokal)
-- melewati syarat ini, tetapi peran admin non-superuser (mis. "postgres" di Supabase) tidak.
-- aksespass_owner NOLOGIN, jadi aplikasi tidak pernah bisa memakai hak ini.
GRANT CREATE ON SCHEMA public TO aksespass_owner;

-- Alihkan kepemilikan seluruh tabel dan sequence aplikasi ke aksespass_owner
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

-- Cabut hak bawaan PUBLIC dan aksespass_app sebelum memberikan grant minimum
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, aksespass_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, aksespass_app;

GRANT USAGE ON SCHEMA public TO aksespass_owner, aksespass_app;

-- 1. Tabel katalog, aturan akomodasi, dan fasilitas: aplikasi HANYA SELECT
GRANT SELECT ON TABLE
  facilities,
  needs_catalog,
  accommodation_rules
TO aksespass_app;

-- 2. Tabel audit_events (append-only): aplikasi HANYA SELECT dan INSERT (tanpa UPDATE/DELETE)
GRANT SELECT, INSERT ON TABLE audit_events TO aksespass_app;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO aksespass_app;

-- 3. Tabel operasional / data pengguna: grant minimum sesuai kebutuhan transaksi aplikasi
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
