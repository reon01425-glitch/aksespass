-- Tambahkan lima pilihan aksesibilitas yang ditampilkan pada editor paspor.
INSERT INTO needs_catalog (code, label, icon_name, category, sort_order)
VALUES
  (
    'pengguna_kursi_roda',
    'Pengguna Kursi Roda',
    'Accessibility',
    'mobilitas',
    13
  ),
  (
    'komunikasi_tertulis_jbi',
    'Komunikasi Tertulis / Juru Bahasa Isyarat',
    'Hand',
    'komunikasi',
    14
  ),
  (
    'sensitivitas_suara_cahaya',
    'Sensitivitas Suara / Cahaya (Sensory Room)',
    'VolumeX',
    'sensorik_lingkungan',
    15
  ),
  (
    'panduan_fisik_tunanetra',
    'Panduan Fisik / Tongkat Tunanetra',
    'Accessibility',
    'penglihatan',
    16
  ),
  (
    'pemandu_asisten_pribadi',
    'Didampingi Pemandu / Asisten Pribadi',
    'HeartHandshake',
    'pendampingan',
    17
  )
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    icon_name = EXCLUDED.icon_name,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;
