# Tes fungsional (end-to-end) dengan Playwright

Tes ini menjalankan aplikasi sungguhan (server `next dev` di port **3100**) terhadap **database tes**, lalu meniru pengguna: login OTP, QR, pindai, kunjungan, kurasi aturan, dan seterusnya, termasuk **percobaan yang melanggar aturan** (peran salah, data pasien lain, OTP salah, id ngawur, dan sebagainya).

## Isi

| File | Yang diuji |
| :--- | :--- |
| `e2e/01-auth.spec.ts` | Login OTP per peran, OTP salah/hangus/sekali pakai, batas permintaan (429), portal salah, petugas nonaktif, logout, cookie rusak, peran salah di halaman dan API, Origin asing |
| `e2e/02-pasien-consent.spec.ts` | Paspor (tanpa diagnosis), ConsentQR (buat, daftar, ganda, cabut, kedaluwarsa), isolasi antar pasien, pindai petugas (respons generik, fasilitas lain, batas pindai), audit |
| `e2e/03-petugas-kunjungan.spec.ts` | Saran hanya dari aturan terbit, panggil, catat, selesai, konfirmasi pasien, petugas fasilitas lain, admin tidak boleh memindai |
| `e2e/04-input-ngawur.spec.ts` | Id bukan UUID dan badan JSON aneh di semua rute: tidak boleh 500 dan tidak membocorkan jejak |
| `e2e/05-pendamping.spec.ts` | Kode tautan, persetujuan pasien, QR atas nama pasien, pencabutan, tebak kode (429), tautan tak dikenal |
| `e2e/06-admin.spec.ts` | Kelola petugas, validasi, admin fasilitas lain, tindak lanjut, halaman dashboard tanpa identitas pasien |
| `e2e/07-kurator.spec.ts` | Alur kurasi penuh (2 peninjau berbeda), revisi, versi baru, pelanggaran (tinjau sendiri, suara ganda, edit draft orang lain, trigger database), tab Semua/Terbit/Draft, notifikasi |
| `e2e/08-ui-halaman.spec.ts` | Setiap halaman tiap peran terbuka bersih, ada `main` dan `h1`, tidak melebar horizontal di 320 dan 390 px |
| `e2e/09-ui-alur.spec.ts` | Layar masuk lewat formulir, pindai manual, tautkan pendamping, aksesibilitas dasar (label, nama tombol, fokus, target sentuh) |
| `e2e/10-akun-kartu-komunikasi.spec.ts` | Preferensi, kode akun, hapus akun salah kode, kartu cetak, KomunikaCare, rute tanpa sesi |

Tes tidak mengklaim WCAG 2.2 AA terpenuhi. Pemeriksaan aksesibilitas di sini hanya dasar (lihat `08` dan `09`).

## Langkah di laptop Windows (PowerShell)

Prasyarat: Node, pnpm, dan PostgreSQL yang sama dengan yang Anda pakai untuk `pnpm db:migrate`.

1. **Pasang dependensi dan peramban uji** (sekali saja):
   ```powershell
   pnpm install
   pnpm exec playwright install chromium
   ```
2. **Siapkan database tes.** `.env.local` harus memuat `DATABASE_URL_TEST` dan `DATABASE_ADMIN_URL_TEST` (database terpisah dari `DATABASE_URL`, supaya data dev aman). Bila database tes belum ada, buat kosong dulu lewat psql atau pgAdmin. Migrasi dan seed dijalankan otomatis oleh tes.
3. **Pastikan port 3100 kosong.** Server dev biasa di port 3000 tidak terganggu.
4. **Jalankan semua tes:**
   ```powershell
   pnpm test:e2e
   ```
   Proses: migrasi dan seed database tes, server uji menyala, ±140 tes berjalan (±3 menit), lalu database tes dibersihkan dari batas permintaan.
5. **Jalankan sebagian saja:**
   ```powershell
   pnpm exec playwright test 07-kurator
   pnpm exec playwright test -g "cabut QR"
   pnpm exec playwright test 09-ui --headed
   ```
   `--headed` menampilkan peramban; `pnpm test:e2e:ui` membuka mode interaktif (bisa memutar ulang tiap langkah).
6. **Lihat laporan dan jejak kegagalan:**
   ```powershell
   pnpm test:e2e:report
   ```
   Tiap tes gagal menyimpan tangkapan layar dan trace di `test-results/`. Buka trace dengan `pnpm exec playwright show-trace <file trace.zip>`.
7. **Lewati seed ulang** (lebih cepat saat mengulang satu tes, asal data masih bersih): `$env:E2E_SKIP_SEED = "1"; pnpm test:e2e` lalu `Remove-Item Env:E2E_SKIP_SEED`.

### Bila ada tes gagal
- Baca pesan di terminal: nama tes menjelaskan aturan yang dilanggar. Banyak tes menyebut isi respons server.
- Gagal di `globalSetup`: variabel `DATABASE_*_TEST` belum ada atau database tes belum terjangkau.
- Gagal login (429): jalankan ulang; `resetRateLimits` membersihkannya di tiap login. Bila masih gagal, hapus isi tabel `rate_limit_hits` di database tes.
- Gagal `Origin tidak diizinkan`: pastikan tidak ada `APP_ORIGIN` yang dipaksa ke nilai lain di terminal Anda (config mengaturnya ke `http://localhost:3100`).
- Peringatan font Google di log server boleh diabaikan (tidak ada internet saat uji).

## Catatan
- Tes memakai **satu worker** dan mengubah data (QR, kunjungan, aturan). Jangan jalankan bersamaan dengan `pnpm test` (Vitest) pada database tes yang sama.
- `pnpm test` (Vitest) tidak menjalankan folder `e2e/`.
- Tes `07` membuat aturan uji; seed ulang membersihkannya.
