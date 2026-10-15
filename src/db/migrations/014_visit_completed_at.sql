-- 014_visit_completed_at.sql
-- Penanda "pelayanan selesai": petugas menekan "Selesai dan Kembali ke Beranda"
-- setelah bantuan dicatat. Pasien lalu diarahkan ke konfirmasi kebutuhan (P16).
-- Hanya waktu; tanpa isi data pasien. Kebijakan UPDATE visits untuk petugas sudah ada.
ALTER TABLE visits ADD COLUMN IF NOT EXISTS completed_at timestamptz;
