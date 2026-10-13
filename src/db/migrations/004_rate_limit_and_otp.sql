-- 004_rate_limit_and_otp.sql
-- Tabel state operasional di PostgreSQL (bukan di memori proses, siap serverless).
-- Tidak menyimpan data pasien atau kode OTP asli.

CREATE TABLE rate_limit_hits (
  key text NOT NULL CHECK (char_length(btrim(key)) BETWEEN 1 AND 255),
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (key, window_start)
);

CREATE TABLE otp_codes (
  phone_hash text NOT NULL CHECK (char_length(btrim(phone_hash)) >= 32),
  code_hash text NOT NULL CHECK (char_length(btrim(code_hash)) >= 32),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  consumed_at timestamptz,
  PRIMARY KEY (phone_hash)
);

ALTER TABLE rate_limit_hits OWNER TO aksespass_owner;
ALTER TABLE otp_codes OWNER TO aksespass_owner;

REVOKE ALL ON TABLE rate_limit_hits, otp_codes FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  rate_limit_hits,
  otp_codes
TO aksespass_app;
