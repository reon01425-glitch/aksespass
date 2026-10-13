-- 007_access_history.sql
-- Fungsi SECURITY DEFINER untuk membaca riwayat akses pasien (P19).
-- Alasan: RLS melarang pasien membaca tabel users petugas, padahal P19 menampilkan nama petugas.
-- Milik aksespass_owner, SET search_path eksplisit, EXECUTE hanya untuk aksespass_app.
-- Hanya berjalan bila app.role = 'patient'; mengambil audit_subject_id pemanggil dari app.user_id;
-- mengembalikan HANYA event dengan subject_ref itu.
-- Kolom: waktu, jenis event, label pelaku, nama fasilitas, daftar field.
-- Parameter filter opsional: rentang tanggal dan fasilitas.

CREATE OR REPLACE FUNCTION get_patient_access_history(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_facility_id uuid DEFAULT NULL
)
RETURNS TABLE (
  occurred_at timestamptz,
  event_type text,
  actor_label text,
  facility_name text,
  fields text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_user_id uuid := app_user_id();
  v_caller_role text := app_role();
  v_subject_id uuid;
BEGIN
  -- Hanya berjalan bila app.role = 'patient' dan app.user_id tersedia
  IF v_caller_role <> 'patient' OR v_caller_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Mengambil audit_subject_id pemanggil dari app.user_id
  SELECT audit_subject_id INTO v_subject_id
  FROM users
  WHERE id = v_caller_user_id;

  IF v_subject_id IS NULL THEN
    RETURN;
  END IF;

  -- Mengembalikan HANYA event audit yang terkait subject_ref pasien pemanggil
  RETURN QUERY
  SELECT
    ae.occurred_at,
    ae.event_type,
    CASE
      WHEN ae.actor_id = v_caller_user_id THEN 'Anda'
      WHEN u.display_name IS NOT NULL AND btrim(u.display_name) <> '' THEN u.display_name
      WHEN ae.actor_role = 'staff' THEN 'Petugas'
      WHEN ae.actor_role = 'companion' THEN 'Pendamping'
      WHEN ae.actor_role = 'facility_admin' THEN 'Admin Fasilitas'
      WHEN ae.actor_role = 'curator' THEN 'Kurator'
      WHEN ae.actor_role = 'system' THEN 'Sistem'
      ELSE 'Sistem'
    END AS actor_label,
    coalesce(f.name, '') AS facility_name,
    ae.fields
  FROM audit_events ae
  LEFT JOIN users u ON u.id = ae.actor_id
  LEFT JOIN facilities f ON f.id = ae.facility_id
  WHERE ae.subject_ref = v_subject_id
    AND (p_from IS NULL OR ae.occurred_at >= p_from)
    AND (p_to IS NULL OR ae.occurred_at <= p_to)
    AND (p_facility_id IS NULL OR ae.facility_id = p_facility_id)
  ORDER BY ae.occurred_at DESC, ae.id DESC;
END;
$$;

ALTER FUNCTION get_patient_access_history(timestamptz, timestamptz, uuid) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_patient_access_history(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_patient_access_history(timestamptz, timestamptz, uuid) TO aksespass_app;
