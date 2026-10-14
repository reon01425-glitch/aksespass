-- Ganti kode dan label opsi bantuan pendamping tanpa kehilangan referensi lama.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM needs_catalog WHERE code = 'anjing_pemandu_asisten_pribadi'
  ) THEN
    INSERT INTO needs_catalog (code, label, icon_name, category, sort_order)
    SELECT
      'pemandu_asisten_pribadi',
      'Didampingi Pemandu / Asisten Pribadi',
      icon_name,
      category,
      sort_order
    FROM needs_catalog
    WHERE code = 'anjing_pemandu_asisten_pribadi'
    ON CONFLICT (code) DO UPDATE
    SET label = EXCLUDED.label,
        icon_name = EXCLUDED.icon_name,
        category = EXCLUDED.category,
        sort_order = EXCLUDED.sort_order;

    INSERT INTO patient_profile_needs (profile_id, need_code, created_at)
    SELECT profile_id, 'pemandu_asisten_pribadi', created_at
    FROM patient_profile_needs
    WHERE need_code = 'anjing_pemandu_asisten_pribadi'
    ON CONFLICT (profile_id, need_code) DO NOTHING;

    DELETE FROM patient_profile_needs
    WHERE need_code = 'anjing_pemandu_asisten_pribadi';

    UPDATE accommodation_rules
    SET trigger_need_code = 'pemandu_asisten_pribadi'
    WHERE trigger_need_code = 'anjing_pemandu_asisten_pribadi';

    UPDATE visits
    SET recorded_need_codes = array_replace(
      recorded_need_codes,
      'anjing_pemandu_asisten_pribadi',
      'pemandu_asisten_pribadi'
    )
    WHERE 'anjing_pemandu_asisten_pribadi' = ANY(recorded_need_codes);

    UPDATE visit_confirmations
    SET unmet_need_codes = array_replace(
      unmet_need_codes,
      'anjing_pemandu_asisten_pribadi',
      'pemandu_asisten_pribadi'
    )
    WHERE 'anjing_pemandu_asisten_pribadi' = ANY(unmet_need_codes);

    DELETE FROM needs_catalog
    WHERE code = 'anjing_pemandu_asisten_pribadi';
  END IF;

  UPDATE needs_catalog
  SET label = 'Didampingi Pemandu / Asisten Pribadi'
  WHERE code = 'pemandu_asisten_pribadi';
END;
$$;
