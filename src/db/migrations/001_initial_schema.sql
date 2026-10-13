-- 001_initial_schema.sql
-- Skema inti AKSESPASS (Bagian 2a: tabel Must + companions)

CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (
    role IN ('patient', 'companion', 'staff', 'facility_admin', 'curator')
  ),
  phone text UNIQUE,
  email text UNIQUE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('pending', 'active', 'inactive')
  ),
  stats_consent boolean NOT NULL DEFAULT false,
  audit_subject_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_required CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  unit text NOT NULL CHECK (char_length(btrim(unit)) > 0),
  status text NOT NULL DEFAULT 'invited' CHECK (
    status IN ('invited', 'active', 'inactive')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_memberships_facility_id ON staff_memberships(facility_id);

CREATE TABLE needs_catalog (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]+$'),
  label text NOT NULL CHECK (char_length(btrim(label)) > 0),
  icon_name text NOT NULL CHECK (char_length(btrim(icon_name)) > 0),
  category text NOT NULL CHECK (
    category IN (
      'komunikasi',
      'penglihatan',
      'pendengaran',
      'mobilitas',
      'sensorik_lingkungan',
      'pendampingan'
    )
  ),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_name text NOT NULL CHECK (
    char_length(btrim(preferred_name)) BETWEEN 1 AND 80
  ),
  patient_note text CHECK (
    patient_note IS NULL OR char_length(patient_note) <= 300
  ),
  last_updated_by_companion_id uuid REFERENCES users(id) ON DELETE SET NULL,
  last_updated_by_companion_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patient_profile_needs (
  profile_id uuid NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  need_code text NOT NULL REFERENCES needs_catalog(code) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, need_code)
);

CREATE INDEX idx_patient_profile_needs_need_code ON patient_profile_needs(need_code);

CREATE TABLE accommodation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_need_code text NOT NULL REFERENCES needs_catalog(code) ON DELETE RESTRICT,
  action_text text NOT NULL CHECK (
    char_length(btrim(action_text)) BETWEEN 1 AND 240
  ),
  icon_name text NOT NULL CHECK (char_length(btrim(icon_name)) > 0),
  rationale text NOT NULL CHECK (char_length(btrim(rationale)) > 0),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'in_review', 'published')
  ),
  published_at timestamptz,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accommodation_rules_published_meta CHECK (
    status <> 'published'
    OR (published_at IS NOT NULL AND approved_by IS NOT NULL AND char_length(btrim(approved_by)) > 0)
  )
);

CREATE INDEX idx_accommodation_rules_trigger_status
  ON accommodation_rules(trigger_need_code, status);

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  shared_fields text[] NOT NULL CHECK (
    coalesce(array_length(shared_fields, 1), 0) >= 1
    AND shared_fields <@ ARRAY[
      'komunikasi',
      'penglihatan',
      'pendengaran',
      'mobilitas',
      'sensorik_lingkungan',
      'pendampingan',
      'catatan_pasien'
    ]::text[]
  ),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consents_valid_window CHECK (valid_until > valid_from)
);

CREATE INDEX idx_consents_patient_user_id ON consents(patient_user_id);
CREATE INDEX idx_consents_facility_id ON consents(facility_id);

CREATE TABLE consent_qr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id uuid NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (char_length(btrim(token_hash)) >= 32),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_qr_consent_id ON consent_qr(consent_id);

CREATE TABLE companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  companion_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'revoked')
  ),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (patient_user_id, companion_user_id),
  CONSTRAINT companions_distinct_users CHECK (patient_user_id <> companion_user_id)
);

CREATE INDEX idx_companions_companion_user_id ON companions(companion_user_id);

CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  staff_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consent_id uuid REFERENCES consents(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('qr', 'kartu')),
  recorded_need_codes text[] NOT NULL DEFAULT '{}'::text[],
  staff_note text CHECK (
    staff_note IS NULL OR char_length(staff_note) <= 280
  ),
  client_id text NOT NULL UNIQUE CHECK (
    char_length(btrim(client_id)) BETWEEN 1 AND 128
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

CREATE INDEX idx_visits_facility_created_at ON visits(facility_id, created_at DESC);
CREATE INDEX idx_visits_patient_user_id ON visits(patient_user_id);

CREATE TABLE visit_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('terpenuhi', 'sebagian', 'belum')),
  unmet_need_codes text[] NOT NULL DEFAULT '{}'::text[],
  confirmed_by text NOT NULL CHECK (
    confirmed_by IN ('patient', 'companion', 'on_site')
  ),
  confirmed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_confirmations_terpenuhi_no_unmet CHECK (
    status <> 'terpenuhi' OR coalesce(array_length(unmet_need_codes, 1), 0) = 0
  )
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL CHECK (
    event_type IN (
      'qr_created',
      'qr_revoked',
      'qr_scanned',
      'profile_read',
      'brief_sent',
      'brief_opened',
      'qr_scan_rejected',
      'visit_recorded',
      'visit_synced',
      'visit_confirmed',
      'companion_link_requested',
      'companion_linked',
      'companion_unlinked',
      'profile_changed_by_companion',
      'delegation_signed_off',
      'access_reported',
      'account_deleted'
    )
  ),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role text CHECK (
    actor_role IS NULL
    OR actor_role IN (
      'patient',
      'companion',
      'staff',
      'facility_admin',
      'curator',
      'system'
    )
  ),
  subject_ref uuid,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  fields text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    fields <@ ARRAY[
      'komunikasi',
      'penglihatan',
      'pendengaran',
      'mobilitas',
      'sensorik_lingkungan',
      'pendampingan',
      'catatan_pasien',
      'preferred_name'
    ]::text[]
  ),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_subject_occurred
  ON audit_events(subject_ref, occurred_at DESC);
CREATE INDEX idx_audit_events_facility_occurred
  ON audit_events(facility_id, occurred_at DESC);
