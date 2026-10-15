-- 021_dashboard_small_cell_fix.sql
-- Perbaikan privasi A6: (1) AFR disembunyikan bila "terpenuhi" atau komplemennya berasal dari
-- 1..4 pasien berbeda (sebelumnya AFR membocorkan sel yang disembunyikan);
-- (2) penekanan komplementer pada rincian status: bila tepat satu sel disembunyikan, sel terlihat
-- terkecil ikut disembunyikan agar tidak bisa dihitung dari total - sel lain.

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
  v_p_ok integer;
  v_p_not integer;
  v_afr_hidden boolean;
  v_hidden_count integer;
  v_smallest_key text;
  v_smallest_val integer;
  v_k text;
  v_c jsonb;
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
      count(*) FILTER (WHERE vc.status = 'terpenuhi'),
      count(DISTINCT v.patient_user_id) FILTER (WHERE vc.status = 'terpenuhi'),
      count(DISTINCT v.patient_user_id) FILTER (WHERE vc.status IS DISTINCT FROM 'terpenuhi')
    INTO v_distinct_patients, v_total_visits, v_terpenuhi, v_p_ok, v_p_not
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
      -- AFR membuka jumlah "terpenuhi" dan komplemennya: sembunyikan bila salah satunya
      -- berasal dari 1..(ambang-1) pasien berbeda (kebocoran sel kecil lewat metrik turunan).
      v_afr_hidden := (v_p_ok BETWEEN 1 AND v_threshold - 1) OR (v_p_not BETWEEN 1 AND v_threshold - 1);
      v_afr := CASE WHEN v_total_visits > 0 AND NOT v_afr_hidden
                    THEN round((v_terpenuhi::numeric / v_total_visits) * 100) ELSE NULL END;
      v_trend := v_trend || jsonb_build_array(jsonb_build_object(
        'month', v_month_label,
        'hidden', false,
        'totalVisits', v_total_visits,
        'afr', v_afr,
        'afrHidden', v_afr_hidden
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
    count(*) FILTER (WHERE vc.status = 'terpenuhi'),
    count(DISTINCT v.patient_user_id) FILTER (WHERE vc.status = 'terpenuhi'),
    count(DISTINCT v.patient_user_id) FILTER (WHERE vc.status IS DISTINCT FROM 'terpenuhi')
  INTO v_distinct_patients, v_total_visits, v_terpenuhi, v_p_ok, v_p_not
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
    v_afr_hidden := (v_p_ok BETWEEN 1 AND v_threshold - 1) OR (v_p_not BETWEEN 1 AND v_threshold - 1);
    v_afr := CASE WHEN v_total_visits > 0 AND NOT v_afr_hidden
                  THEN round((v_terpenuhi::numeric / v_total_visits) * 100) ELSE NULL END;

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

    -- 2a'. Penekanan komplementer: rincian status menjumlah ke totalVisits yang tampil.
    --      Bila tepat satu sel disembunyikan, nilainya bisa dihitung dari total - sel lain,
    --      maka sel terlihat terkecil (nilai > 0) ikut disembunyikan.
    SELECT count(*) INTO v_hidden_count
    FROM jsonb_each(v_status) e WHERE (e.value ->> 'hidden')::boolean;
    IF v_hidden_count = 1 THEN
      v_smallest_key := NULL;
      v_smallest_val := NULL;
      FOR v_k, v_c IN SELECT e.key, e.value FROM jsonb_each(v_status) e LOOP
        IF NOT (v_c ->> 'hidden')::boolean AND (v_c ->> 'value')::integer > 0
           AND (v_smallest_val IS NULL OR (v_c ->> 'value')::integer < v_smallest_val) THEN
          v_smallest_key := v_k;
          v_smallest_val := (v_c ->> 'value')::integer;
        END IF;
      END LOOP;
      IF v_smallest_key IS NOT NULL THEN
        v_status := jsonb_set(v_status, ARRAY[v_smallest_key], jsonb_build_object('hidden', true));
      END IF;
    END IF;

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
      'afrHidden', v_afr_hidden,
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
