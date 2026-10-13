-- 009_facility_dashboard.sql
-- Fungsi SECURITY DEFINER tunggal untuk Accessibility Gap Dashboard (A3, A6 — Bagian 8).
-- Alasan: RLS §3 melarang admin fasilitas membaca baris visits/visit_confirmations/patient_profiles
-- sama sekali (lihat 003_rls_policies.sql, kebijakan visits_select_policy dan
-- visit_confirmations_access_policy TIDAK memuat klausa facility_admin). Admin fasilitas HANYA
-- boleh melihat angka agregat lewat fungsi ini.
--
-- Aturan yang diterapkan DI DALAM fungsi (tidak bisa dilewati oleh parameter pemanggil):
-- 1. Hanya berjalan bila app.role = 'facility_admin'; fasilitas SELALU dari app.facility_id
--    (parameter pemanggil TIDAK memuat facility_id, sehingga admin tidak bisa memilih fasilitas lain).
-- 2. Hanya kunjungan recorded_at IS NOT NULL milik pasien users.stats_consent = true dihitung.
-- 3. Periode bulan dihitung di zona Asia/Jakarta.
-- 4. Ambang kelompok K-10 (DASHBOARD_MIN_GROUP_SIZE = 5 di src/db/index.ts, disalin sebagai
--    v_threshold di bawah — ubah DUA tempat ini bersamaan bila ambang berubah) diterapkan pada
--    JUMLAH PASIEN BERBEDA per sel, bukan jumlah kunjungan. Sel dengan 1..4 pasien berbeda
--    dikembalikan sebagai {"hidden": true} tanpa angka apa pun. Sel dengan 0 pasien (benar-benar
--    tidak ada data, bukan kelompok kecil yang berisiko re-identifikasi) ditampilkan sebagai 0.
-- 5. Jawaban "belum dikonfirmasi" (vc.status IS NULL) ikut penyebut (dihitung di totalVisits/AFR)
--    tetapi TIDAK PERNAH dihitung "terpenuhi".
-- 6. Rincian penjawab (confirmed_by: patient/companion/on_site) dipisah, tidak digabung.
-- 7. Rincian kategori memakai needs_catalog.category, dihitung per kunjungan (bukan per kode
--    kebutuhan) agar satu kunjungan dengan dua kode di kategori sama tidak dihitung dobel.
--
-- Keluaran: satu objek JSONB. NULL bila pemanggil bukan facility_admin atau tanpa facility_id
-- (fail-closed, bukan error, agar tidak membocorkan keberadaan data lewat perbedaan pesan galat).
-- Tidak ada kolom/field berisi ID, nama, atau kontak pasien di output mana pun.

CREATE OR REPLACE FUNCTION get_facility_dashboard(
  p_year integer,
  p_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := app_role();
  v_facility_id uuid := app_facility_id();
  v_threshold integer := 5;
  v_facility_name text;
  v_trend jsonb := '[]'::jsonb;
  v_selected jsonb;
  v_offset integer;
  v_cursor_year integer;
  v_cursor_month integer;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_month_label text;
  v_distinct_patients integer;
  v_total_visits integer;
  v_terpenuhi integer;
  v_afr numeric;
  v_status jsonb;
  v_answerer jsonb;
  v_category jsonb;
BEGIN
  IF v_role IS DISTINCT FROM 'facility_admin' OR v_facility_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_facility_name FROM facilities WHERE id = v_facility_id;

  -- 1. Tren 3 bulan: bulan terpilih dan 2 bulan sebelumnya, urut terlama -> terbaru
  FOR v_offset IN REVERSE 2..0 LOOP
    v_cursor_year := p_year;
    v_cursor_month := p_month - v_offset;
    WHILE v_cursor_month < 1 LOOP
      v_cursor_month := v_cursor_month + 12;
      v_cursor_year := v_cursor_year - 1;
    END LOOP;

    v_month_start := (make_date(v_cursor_year, v_cursor_month, 1)::timestamp AT TIME ZONE 'Asia/Jakarta');
    v_month_end := v_month_start + interval '1 month';
    v_month_label := to_char(make_date(v_cursor_year, v_cursor_month, 1), 'YYYY-MM');

    SELECT
      count(DISTINCT v.patient_user_id),
      count(*),
      count(*) FILTER (WHERE vc.status = 'terpenuhi')
    INTO v_distinct_patients, v_total_visits, v_terpenuhi
    FROM visits v
    JOIN users u ON u.id = v.patient_user_id AND u.stats_consent = true
    LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
    WHERE v.facility_id = v_facility_id
      AND v.recorded_at IS NOT NULL
      AND v.recorded_at >= v_month_start
      AND v.recorded_at < v_month_end;

    IF v_distinct_patients > 0 AND v_distinct_patients < v_threshold THEN
      v_trend := v_trend || jsonb_build_array(jsonb_build_object('month', v_month_label, 'hidden', true));
    ELSE
      v_afr := CASE WHEN v_total_visits > 0 THEN round((v_terpenuhi::numeric / v_total_visits) * 100) ELSE NULL END;
      v_trend := v_trend || jsonb_build_array(jsonb_build_object(
        'month', v_month_label,
        'hidden', false,
        'totalVisits', v_total_visits,
        'afr', v_afr
      ));
    END IF;
  END LOOP;

  -- 2. Detail bulan terpilih
  v_month_start := (make_date(p_year, p_month, 1)::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_month_end := v_month_start + interval '1 month';
  v_month_label := to_char(make_date(p_year, p_month, 1), 'YYYY-MM');

  SELECT
    count(DISTINCT v.patient_user_id),
    count(*),
    count(*) FILTER (WHERE vc.status = 'terpenuhi')
  INTO v_distinct_patients, v_total_visits, v_terpenuhi
  FROM visits v
  JOIN users u ON u.id = v.patient_user_id AND u.stats_consent = true
  LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
  WHERE v.facility_id = v_facility_id
    AND v.recorded_at IS NOT NULL
    AND v.recorded_at >= v_month_start
    AND v.recorded_at < v_month_end;

  IF v_distinct_patients > 0 AND v_distinct_patients < v_threshold THEN
    v_selected := jsonb_build_object('month', v_month_label, 'hidden', true);
  ELSE
    v_afr := CASE WHEN v_total_visits > 0 THEN round((v_terpenuhi::numeric / v_total_visits) * 100) ELSE NULL END;

    -- 2a. Rincian status (4 kunci tetap, termasuk 0)
    SELECT jsonb_object_agg(
      key_status,
      CASE
        WHEN coalesce(distinct_patients, 0) > 0 AND distinct_patients < v_threshold
          THEN jsonb_build_object('hidden', true)
        ELSE jsonb_build_object('hidden', false, 'value', coalesce(visit_count, 0))
      END
    )
    INTO v_status
    FROM (VALUES ('terpenuhi'), ('sebagian'), ('belum'), ('belum_dikonfirmasi')) AS keys(key_status)
    LEFT JOIN (
      SELECT
        coalesce(vc.status, 'belum_dikonfirmasi') AS status_key,
        count(DISTINCT v.patient_user_id) AS distinct_patients,
        count(*) AS visit_count
      FROM visits v
      JOIN users u ON u.id = v.patient_user_id AND u.stats_consent = true
      LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
      WHERE v.facility_id = v_facility_id
        AND v.recorded_at IS NOT NULL
        AND v.recorded_at >= v_month_start
        AND v.recorded_at < v_month_end
      GROUP BY coalesce(vc.status, 'belum_dikonfirmasi')
    ) counts ON counts.status_key = keys.key_status;

    -- 2b. Rincian penjawab (hanya kunjungan yang sudah dikonfirmasi; 3 kunci tetap)
    SELECT jsonb_object_agg(
      key_answerer,
      CASE
        WHEN coalesce(distinct_patients, 0) > 0 AND distinct_patients < v_threshold
          THEN jsonb_build_object('hidden', true)
        ELSE jsonb_build_object('hidden', false, 'value', coalesce(visit_count, 0))
      END
    )
    INTO v_answerer
    FROM (VALUES ('patient'), ('companion'), ('on_site')) AS keys(key_answerer)
    LEFT JOIN (
      SELECT
        vc.confirmed_by AS answerer_key,
        count(DISTINCT v.patient_user_id) AS distinct_patients,
        count(*) AS visit_count
      FROM visits v
      JOIN users u ON u.id = v.patient_user_id AND u.stats_consent = true
      JOIN visit_confirmations vc ON vc.visit_id = v.id
      WHERE v.facility_id = v_facility_id
        AND v.recorded_at IS NOT NULL
        AND v.recorded_at >= v_month_start
        AND v.recorded_at < v_month_end
      GROUP BY vc.confirmed_by
    ) counts ON counts.answerer_key = keys.key_answerer;

    -- 2c. Rincian per kategori kebutuhan belum terpenuhi (per kunjungan, bukan per kode)
    SELECT jsonb_object_agg(
      key_category,
      CASE
        WHEN coalesce(distinct_patients, 0) > 0 AND distinct_patients < v_threshold
          THEN jsonb_build_object('hidden', true)
        ELSE jsonb_build_object('hidden', false, 'value', coalesce(visit_count, 0))
      END
    )
    INTO v_category
    FROM (
      VALUES
        ('komunikasi'), ('penglihatan'), ('pendengaran'),
        ('mobilitas'), ('sensorik_lingkungan'), ('pendampingan')
    ) AS keys(key_category)
    LEFT JOIN (
      SELECT category, count(DISTINCT patient_user_id) AS distinct_patients, count(DISTINCT visit_id) AS visit_count
      FROM (
        SELECT DISTINCT v.id AS visit_id, v.patient_user_id, nc.category
        FROM visits v
        JOIN users u ON u.id = v.patient_user_id AND u.stats_consent = true
        JOIN visit_confirmations vc ON vc.visit_id = v.id
        JOIN LATERAL unnest(vc.unmet_need_codes) AS unmet_code(code) ON true
        JOIN needs_catalog nc ON nc.code = unmet_code.code
        WHERE v.facility_id = v_facility_id
          AND v.recorded_at IS NOT NULL
          AND v.recorded_at >= v_month_start
          AND v.recorded_at < v_month_end
      ) unmet_visits
      GROUP BY category
    ) counts ON counts.category = keys.key_category;

    v_selected := jsonb_build_object(
      'month', v_month_label,
      'hidden', false,
      'totalVisits', v_total_visits,
      'afr', v_afr,
      'statusBreakdown', v_status,
      'answererBreakdown', v_answerer,
      'categoryBreakdown', v_category
    );
  END IF;

  RETURN jsonb_build_object(
    'facilityName', coalesce(v_facility_name, ''),
    'trend', v_trend,
    'selected', v_selected
  );
END;
$$;

ALTER FUNCTION get_facility_dashboard(integer, integer) OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION get_facility_dashboard(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_facility_dashboard(integer, integer) TO aksespass_app;
