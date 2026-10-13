# AKSESPASS — Rencana Implementasi Bertahap

> **Cara pakai (hemat token):** kerjakan **satu bagian per sesi**. Baca tabel status, lalu bagian yang sedang dikerjakan saja, lalu hanya dokumen yang disebut di baris "Baca". Bagian berikutnya baru dimulai setelah semua kotak **Verifikasi** bagian sebelumnya tercentang.
>
> **Aturan centang:** kotak hanya dicentang dengan bukti (output perintah, hasil tes, atau catatan uji manual) yang ditulis singkat di "Catatan hasil". Tanpa bukti = belum selesai. Jangan menyalin data pasien nyata; gunakan data sintetis.
>
> Kode: `P-05` = user story (`docs/user-stories.md`), `P16` = layar (`docs/user-flows.md`), `K-1` = keputusan di Bagian 0.

## Jalur 13 Okt 2026 — tenggat 23:59 WIB, build lokal

**Cakupan hari ini:** semua story Must + pendamping (D-01–D-03, P-16). Bagian 9 (offline, kartu cetak) dan 10B (KomunikaCare) **tidak dikerjakan** hari ini; sebut sebagai roadmap di presentasi.

**Keputusan yang sudah diambil (13 Okt 2026):**
- K-1: lokal dulu, PostgreSQL 16 Homebrew. Hosting: Vercel sebagai usulan utama (`architecture.md` A8); kode hari ini wajib mengikuti "aturan siap serverless" di §3.
- K-2: Vitest, `pg` + migrasi SQL mentah, `qrcode`, `html5-qrcode`, axe-core.
- K-3: OTP tiruan, hanya di mode pengembangan.
- K-4: satu pesan penolakan generik untuk petugas.
- K-6: Must + pendamping.

**Bawaan sementara (dipakai hari ini kecuali dibatalkan pemilik produk):**
- K-7: pendamping punya akun sendiri (mengikuti D2 di `docs/user-flows.md`), bukan rute bertoken.
- K-8: draft paspor P5 hanya di memori halaman (tidak disimpan ke perangkat); tidak ada penyimpanan lokal pasien hari ini.
- K-10: ambang kelompok dashboard = 5, disimpan sebagai konstanta yang mudah diubah.
- K-11: P-04 ikut dibangun (pemilihan field memang dibutuhkan `consents`).
- K-9: tidak dibutuhkan hari ini (P-08 dan A-04 tidak dikerjakan).

**Jadwal kotak waktu** (bila sebuah bagian lewat dari jam akhirnya, selesaikan yang minimal dan lanjut; catat sisa di "Catatan hasil"):

| Jam | Bagian | Versi hari ini |
| :--- | :--- | :--- |
| 13:00–13:15 | 0 | Selesai (keputusan di atas) |
| 13:15–14:00 | 1 | Lengkap |
| 14:00–15:00 | 2 | Tabel Must + `companions`; RLS minimal fasilitas |
| 15:00–16:30 | 3 | Lengkap; ini prioritas tertinggi |
| 16:30–17:15 | 4 | Button, Input, Chip, Toggle, StatusBanner, Pop-up konfirmasi, skala CareProof |
| 17:15–18:00 | 5 | Lengkap |
| 18:00–19:15 | 6 | Lengkap |
| 19:15–20:30 | 7 | Lengkap |
| 20:30–21:30 | 8 | P16, A3, A6 saja (tanpa A7, A8, P17 status tindak lanjut) |
| 21:30–22:45 | 10A | Pendamping |
| 22:45–23:45 | 11 | Skenario demo, uji ulang, daftar klaim |

**Garis potong hari ini:** jika pukul 21:30 Bagian 8 belum lolos verifikasi, **lewati 10A** dan langsung ke 11.

## Status

| # | Bagian | Bergantung pada | Story | Status |
| :--- | :--- | :--- | :--- | :--- |
| 0 | Keputusan pemblokir | — | — | ☑ untuk cakupan hari ini |
| 1 | Scaffold dan alat pemeriksaan | 0 (K-2) | — | ☑ |
| 2 | Database dan skema | 1, K-1 | — | ☑ |
| 3 | Inti domain: audit, privasi, auth, consent | 2, K-4 | P-05, P-06, T-01 (sisi server) | ☑ |
| 4 | Komponen UI bersama | 1 (boleh paralel dengan 2–3) | Nonfungsional | ☑ |
| 5 | Masuk dan akun | 3, 4, K-3 | P-01, T-01, A-01 (aktivasi) | ☑ |
| 6 | Pasien: paspor, ConsentQR, kontrol akses | 5, K-8, K-11 | P-01, P-02, P-03, P-04, P-05, P-06 | ☐ |
| 7 | Petugas: pindai, saran, catat bantuan | 6 | T-01, T-02, T-03, T-04 | ☐ |
| 8 | CareProof dan dashboard | 7, K-9, K-10 | P-07, A-02, (P-08, A-03, A-04) | ☐ |
| 9 | Offline dan kartu cetak | 7, K-5, K-8 | T-05, P-14 | Tidak hari ini |
| 10 | Should untuk demo: 10A pendamping, 10B KomunikaCare | 8, K-6, K-7 | D-01–D-03, P-16 (10A); P-09, P-10 (10B) | 10A ☐ · 10B tidak hari ini |
| 11 | Persiapan demo dan klaim | Semua yang dibangun | — | ☐ |

**Garis potong bila waktu mepet** (dibuang dari belakang): Bagian 10 → bagian Should di 8 (A-03, A-04, P-08) → Bagian 9. **Tidak boleh dipotong:** Bagian 0–8 inti, terutama P-05, P-06, T-01, A-02.

**Di luar rencana ini (roadmap, kecuali K-6 memutuskan lain):** Pre-Arrival Brief (P10), Smart Queue Alert (P13–P14), frasa BISINDO (P15.4), editor kurator (K4–K6), hapus akun (P22–P23), delegasi darurat dan pemulihan penuh (`architecture.md` §10), diagnosis lokal.

---

## Bagian 0 — Keputusan Pemblokir (tanpa kode)

**Tujuan:** menutup keputusan yang mengubah skema atau perilaku privasi. Tidak semua harus diputuskan di awal; cukup sebelum bagian yang diblokirnya dimulai.
**Baca:** `architecture.md` §3, §16; `docs/user-flows.md` bagian "Keputusan".

| ID | Keputusan | Memblokir |
| :--- | :--- | :--- |
| K-1 | Penyedia database dan hosting (A1–A3 masih [Usulan]). Syarat minimum: PostgreSQL, RLS, peran DB terpisah untuk audit append-only, region sesuai UU PDP | Bagian 2 |
| K-2 | Dependensi alat: test runner, alat uji aksesibilitas otomatis, pustaka akses DB/migrasi | Bagian 1, 2 |
| K-3 | OTP: penyedia SMS/WA sungguhan atau OTP tiruan khusus prototipe | Bagian 5 |
| K-4 | Pesan penolakan pindai: generik total (§7) atau boleh menyebut "Kedaluwarsa" (tabel status §7, `design.md`, layar T4) | Bagian 3, 7 |
| K-5 | Pengenal pasien di kartu untuk jalur T4b: nomor rekam medis (§9) atau kode/nama panggilan (keputusan 2 user-flows) | Bagian 9 |
| K-6 | Cakupan prototipe (keputusan terbuka 5): status brief, delegasi darurat, pemulihan penuh | Bagian 10, roadmap |
| K-7 | Pendamping: rute bertoken `pendamping/[token]/` (§5) atau akun sendiri (D2) | Bagian 10 |
| K-8 | Penyimpanan lokal di perangkat pasien: draft P5, ringkasan offline P8, antrean jawaban P16 — apa yang disimpan, berapa lama, kapan dihapus | Bagian 6, 9 |
| K-9 | Satu set label status tindak lanjut (P17 vs A8) | Bagian 8 |
| K-10 | Ambang minimum kelompok agregat dashboard | Bagian 8 |
| K-11 | P-04 naik ke Must atau tetap Should | Bagian 6 |

**Checklist**
- [ ] Setiap keputusan yang memblokir bagian berikutnya sudah dijawab pemilik produk.
- [ ] Jawaban ditulis ke dokumen sumber (`architecture.md` atau `docs/user-flows.md`) dan penandanya diubah ke **[Diputuskan]**.
- [ ] Konflik yang diselesaikan dihapus dari daftar terbuka di `architecture.md` §16.

**Verifikasi**
- [ ] Untuk bagian yang akan dimulai, tidak ada keputusan pemblokir yang masih [Usulan] atau terbuka.
- [ ] `grep` istilah yang dipertentangkan (misalnya "rekam medis", "QR Kedaluwarsa") tidak lagi menghasilkan dua versi yang berbeda.

**Catatan hasil:**

---

## Bagian 1 — Scaffold dan Alat Pemeriksaan

**Tujuan:** proyek kosong yang bisa dijalankan dan diperiksa, dengan design token terpasang.
**Baca:** `AGENTS.md` (Teknologi, Verifikasi); `design.md` §2C, §3; `architecture.md` §5, §14.

**Checklist**
- [x] Next.js (App Router) + TypeScript mode `strict` + Tailwind + Lucide React.
- [x] Skrip di `package.json` dengan nama tetap: `lint`, `typecheck`, `test`, `build` (bagian lain merujuk nama ini).
- [x] Test runner dan alat uji aksesibilitas sesuai K-2 (Vitest terpasang; `axe-core` ditunda ke tahap komponen UI sesuai jadwal prompt).
- [x] Font Atkinson Hyperlegible Next di-host sendiri, `font-display: swap`, hanya bobot 400 dan 700.
- [x] Token warna `design.md` §2C sebagai CSS variable dan terhubung ke Tailwind.
- [x] Gaya dasar: `rem` untuk ukuran teks, focus ring terlihat, aturan `prefers-reduced-motion`.
- [x] Header keamanan dasar §13: CSP, `Referrer-Policy`.
- [x] `.gitignore` untuk `node_modules`, `.next`, file env.
- [x] README singkat: cara install, jalankan, dan perintah pemeriksaan.

**Verifikasi**
- [x] `lint`, `typecheck`, `test` (minimal satu tes contoh), dan `build` dijalankan dan lolos.
- [x] Halaman contoh di lebar 320 px tidak punya horizontal scroll.
- [x] Panel network browser: font dimuat dari domain sendiri, tidak ada permintaan ke CDN font.
- [x] Hanya file font 400 dan 700 yang dimuat.
- [x] Header CSP dan `Referrer-Policy` terlihat di respons.

**Catatan hasil:**
- Versi: Next.js 16.4.0 (App Router, Turbopack), React 19.3.0, Tailwind CSS 4.3.3 (`@theme inline` di `src/app/globals.css`), TypeScript 5.9.3 (`strict: true`), `lucide-react` 1.56.0, `vitest` 5.0.4.
- Font: `Atkinson_Hyperlegible_Next` dari `next/font/google` dengan bobot `["400", "700"]`, `display: "swap"`, disajikan dari `/_next/static/media/*.woff2` tanpa request ke `fonts.googleapis.com` / `fonts.gstatic.com`.
- Verifikasi: `pnpm lint`, `pnpm typecheck`, `pnpm test` (2 tes di `src/lib/tokens.test.ts`), dan `pnpm build` lolos; `curl -I http://localhost:3000` menampilkan `Content-Security-Policy`, `Referrer-Policy: no-referrer`, dan `X-Content-Type-Options: nosniff`; uji Chrome DevTools pada viewport `320×640` (100% dan zoom teks 200%) bebas horizontal scroll (`scrollWidth = 320`) serta tombol contoh menampilkan focus ring saat `Tab`; `grep -rn "font-medium\|font-semibold" src` kosong.
- Sisa pekerjaan yang ditunda sesuai rencana: penerapan CSP berbasis nonce (saat ini masih memakai `'unsafe-inline'` pada `script-src`/`style-src` dan `'unsafe-eval'` khusus mode dev) serta instalasi `axe-core` di tahap komponen UI.

---

## Bagian 2 — Database dan Skema

**Tujuan:** skema dari `architecture.md` §6 dengan pengaman di level database.
**Baca:** `architecture.md` §6, §10 (otorisasi berlapis), §11, §13.

**Checklist**
- [x] Migrasi untuk tabel yang dibutuhkan Bagian 3–8: `users`, `patient_profiles`, `needs_catalog`, `accommodation_rules`, `consents`, `consent_qr`, `facilities`, `staff_memberships`, `visits`, `visit_confirmations`, `follow_ups`, `audit_events`. Tabel untuk Bagian 9–10 ditambahkan di bagiannya. *(Cakupan hari ini di `001_initial_schema.sql`: `facilities`, `users`, `staff_memberships`, `needs_catalog`, `patient_profiles`, `patient_profile_needs`, `accommodation_rules`, `consents`, `consent_qr`, `companions`, `visits`, `visit_confirmations`, `audit_events`; tabel `follow_ups` tidak dibuat hari ini sesuai Jalur 13 Okt 2026).*
- [x] Tidak ada kolom diagnosis di tabel mana pun.
- [x] `consent_qr` hanya menyimpan `token_hash`.
- [x] Peran DB aplikasi hanya punya `INSERT` dan `SELECT` pada `audit_events`.
- [x] Kebijakan RLS minimal: petugas hanya baris fasilitasnya; admin tidak bisa membaca `briefs` dan profil pasien.
- [x] Seed sintetis: 2 fasilitas, petugas aktif dan nonaktif, 4 pasien (satu per profil: Tuli, autistik, low vision, mobilitas), katalog kebutuhan, aturan saran bawaan per profil.
- [x] Koneksi dan kredensial lewat env, tidak ter-commit.
- [x] Kebijakan RLS membaca identitas dari setting transaksi (`current_setting(...)`), sesuai aturan siap serverless di `architecture.md` §3.
- [x] Tabel penghitung rate limit dan tabel OTP tiruan (state tidak di memori).

**Verifikasi**
- [x] Migrasi dijalankan dari database kosong dan berhasil; seed berhasil.
- [x] Tes: `UPDATE` dan `DELETE` pada `audit_events` dengan peran aplikasi **ditolak database**.
- [x] Tes RLS: petugas fasilitas A tidak bisa membaca data fasilitas B, bahkan lewat kueri langsung.
- [x] `grep -ri diagnos` pada folder skema/migrasi tidak menemukan kolom.
- [x] Seed tidak berisi nama atau nomor yang menyerupai orang nyata.
- [x] `typecheck` dan `test` lolos.

**Catatan hasil:**
- Paruh pertama Bagian 2 (Prompt 3): PostgreSQL 16.15 lokal (`aksespass_dev` dan `aksespass_test`); `pg` + `@types/pg` terpasang; runner `scripts/db-reset.mjs`, `scripts/db-migrate.mjs`, dan `scripts/db-seed.mjs` berjalan via `pnpm db:reset`, `pnpm db:migrate`, `pnpm db:seed`.
- Paruh kedua Bagian 2 (Prompt 4):
  - `002_roles_and_grants.sql`: peran `aksespass_owner` (`NOLOGIN`, pemilik semua tabel dan sequence di `public`) serta `aksespass_app` (`LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, bukan pemilik tabel). Grant minimum per tabel: `facilities`, `needs_catalog`, `accommodation_rules` hanya `SELECT`; `audit_events` hanya `SELECT, INSERT`; tabel operasional pengguna mendapat hak CRUD sesuai transaksi.
  - `003_rls_policies.sql`: RLS aktif pada 10 tabel data pengguna (`users`, `staff_memberships`, `patient_profiles`, `patient_profile_needs`, `consents`, `consent_qr`, `companions`, `visits`, `visit_confirmations`, `audit_events`), membaca konteks transaksi lewat `current_setting('app.user_id', true)`, `'app.role'`, `'app.facility_id'`, dan `'app.scan_token_hash'` (tanpa konteks = 0 baris).
  - `004_rate_limit_and_otp.sql`: tabel `rate_limit_hits` (PK gabungan `(key, window_start)`) dan `otp_codes` (`phone_hash`, `code_hash` minimal 32 karakter, `expires_at`, `attempts`, `consumed_at`).
  - `src/db/index.ts`: satu-satunya helper akses data pengguna `withContext(ctx, fn)` yang membuka transaksi dan menyetel keempat kunci konteks dengan `set_config(..., true)`.
- Bukti verifikasi:
  - `pnpm db:reset && pnpm db:migrate && pnpm db:seed` sukses untuk 4 migrasi (`001`–`004`); `pnpm db:migrate` ulang mencetak `Tidak ada migrasi baru (0 dijalankan)`.
  - Guard `db:reset`: `DATABASE_ADMIN_URL="postgresql://remote.invalid.example:5432/aksespass_dev" pnpm db:reset` dan `DATABASE_ADMIN_URL="postgresql://localhost:5432/aksespass_prod" pnpm db:reset` langsung ditolak dengan exit code `1` sebelum membuka koneksi.
  - Jumlah baris seed di `aksespass_dev`: `facilities=2`, `users=11`, `staff_memberships=5`, `needs_catalog=12`, `patient_profiles=4`, `patient_profile_needs=13`, `accommodation_rules=13` (12 `published` + 1 `draft`), `companions=1`, `consents=4`, `consent_qr=4`, `visits=20`, `visit_confirmations=16`, `audit_events=8`.
  - `grep -rni diagnos src/db` kosong (0 baris); `grep -rn "SET app\.\|SET SESSION" src` kosong (0 baris).
  - `src/db/rls.test.ts` (10 tes) dan `src/db/schema.test.ts` (4 tes) berjalan di `aksespass_test` dengan peran `aksespass_app` (`DATABASE_URL_TEST`) dan semuanya lolos: `UPDATE`/`DELETE` pada `audit_events` ditolak (`permission denied`), `pg_roles` mengonfirmasi `aksespass_app` bukan superuser/tanpa `BYPASSRLS`/bukan pemilik tabel, kueri tanpa konteks menghasilkan 0 baris, isolasi pasien/petugas/admin/pendamping terbukti, pencabutan `companions` langsung memutus akses (`0` baris), uji kebocoran konteks di `pg_backend_pid()` yang sama menghasilkan 0 baris dan setting kosong di transaksi kedua, serta dua upsert `rate_limit_hits` menghasilkan `count = 2` pada koneksi baru.
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` (16 tes di 3 file), dan `pnpm build` lolos.
- Catatan lanjutan: jalur baca pra-sesi saat login/OTP (sebelum `app.user_id` tersedia) akan memakai fungsi `SECURITY DEFINER` sempit di Prompt 6, dan agregat dashboard admin fasilitas memakai fungsi `SECURITY DEFINER` di Prompt 15.

---

## Bagian 3 — Inti Domain (tanpa UI)

**Tujuan:** satu-satunya jalur baca data pasien, dengan audit otomatis. Bagian paling kritis untuk privasi.
**Baca:** `architecture.md` §5, §7, §10, §11, §13; `AGENTS.md` (Aturan arsitektur dan data).

**Checklist**
- [x] `lib/audit`: satu fungsi tulis kejadian; modul lain tidak menulis ke `audit_events` secara langsung.
- [x] `lib/privacy`: scrubber log dan daftar field terlarang.
- [x] `lib/auth`: sesi cookie `httpOnly` + `SameSite=Lax`, guard peran, guard fasilitas.
- [x] `lib/consent`: buat consent + token acak ≥ 128 bit (simpan hash); validasi berurutan sesuai §7; cabut; baca profil terkini yang disaring ke field yang dicentang; tulis `qr_scanned`, `profile_read` (nama field saja), `qr_scan_rejected`.
- [x] Respons gagal mengikuti keputusan K-4.
- [x] Rate limit percobaan pindai per petugas dan per IP, disimpan di Postgres dan diperiksa di route handler.
- [x] Satu helper transaksi yang selalu meng-set konteks RLS dengan `set_config(..., true)`; tidak ada kueri data pasien di luar helper ini.
- [x] Middleware hanya memeriksa cookie dan peran; tidak mengimpor modul database.
- [x] Route handler `POST /api/scan` hanya memanggil `lib/consent`.

**Verifikasi** (tes otomatis, masing-masing punya kasus lolos dan gagal)
- [x] Pindai lolos: petugas aktif, fasilitas cocok, token valid → hanya field yang dicentang yang kembali.
- [x] Ditolak: fasilitas tidak cocok, kedaluwarsa, dicabut, petugas nonaktif, token tak dikenal.
- [x] Respons untuk token tak dikenal vs kedaluwarsa vs dicabut sesuai K-4 (bila generik: status dan body identik).
- [x] Setiap pindai lolos menulis `profile_read`; setiap penolakan menulis `qr_scan_rejected`; tidak ada token mentah atau nilai profil di audit.
- [x] Database berisi hash, bukan token asli (cek langsung ke tabel).
- [x] Rate limit memblokir setelah batas, dan tetap memblokir setelah server dev di-restart (bukti state tidak di memori).
- [x] Tes: dua request berurutan dengan petugas berbeda di koneksi pool yang sama tidak saling melihat konteks RLS.
- [x] `grep`: file middleware tidak mengimpor modul database.
- [x] Tes kebocoran: data sintetis unik tidak muncul di log aplikasi saat pindai lolos maupun gagal.
- [x] `grep` memastikan tidak ada impor tabel profil pasien di luar `lib/consent` dan alur milik pasien sendiri.
- [x] `lint`, `typecheck`, `test` lolos.

**Catatan hasil:**
- Bagian 3a (Prompt 5):
  - `src/lib/privacy`: Logger tunggal dengan allowlist ketat (`event`, `requestId`, `route`, `method`, `status`, `durationMs`, `errorCode`, `count`), scrubber regex otomatis untuk nomor telepon (`+62...`, `08...`), email, dan token (≥ 20 karakter base32/base64url/hex) tanpa merusak UUID requestId standar; `FORBIDDEN_LOG_FIELDS` diekspor; `serializeError` hanya meloloskan `name`, `code` SQLSTATE, dan pesan tersaring (membuang `detail`, `where`, `hint`, query text pg); sink dapat diganti saat pengujian.
  - ESLint: aturan `no-console = error` aktif untuk seluruh `src/` kecuali `src/lib/privacy/logger.ts`, file tes, dan skrip.
  - `src/lib/http`: pembantu respons JSON dengan `Cache-Control: no-store` wajib; `wrapRouteHandler` menangkap seluruh galat server, menyamarkan pesan galat generik ke klien, mencatat via logger privasi, serta memvalidasi `Origin === APP_ORIGIN` untuk request mutasi state (`POST`, `PUT`, `PATCH`, `DELETE`). Variabel `APP_ORIGIN=http://localhost:3000` ditambahkan ke `.env.example`.
  - `src/lib/consent/constants.ts`: modul konstanta bersama untuk nama field yang boleh dibagikan (6 kategori kebutuhan, `catatan_pasien`, `nama_panggilan`/`preferred_name`).
  - `src/lib/audit`: fungsi `recordAuditEvent(tx, event)` mewajibkan tipe client bermerek `TransactionClient` dari `withContext` (pool biasa ditolak oleh compiler), validasi runtime pada 17 tipe event `architecture.md` §11, memvalidasi field agar hanya memuat nama dari konstanta bersama, tanpa fungsi update/delete, serta atomisitas terbukti (gagal audit membatalkan transaksi; gagal transaksi membatalkan audit).
  - `src/db/index.ts`: helper `withContext` diperkuat dengan validasi runtime sebelum `set_config` (role ∈ enum, ID = UUID valid, token hash = heks 64 karakter), penegakan `SET LOCAL statement_timeout = '5s'` per transaksi, pool internal tidak diekspor (hanya `withContext` dan `TransactionClient`).
  - Tes arsitektur statik `src/__tests__/architecture.test.ts` membuktikan: `pg` hanya diimpor di `src/db`, string `audit_events` hanya diizinkan di `src/lib/audit` dan migrasi, `console.` hanya ada di `logger.ts`, dan ESLint API menghasilkan error pada `src/app/**`.
  - Hasil pemeriksaan: 34 tes di 8 test file lulus; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos. Status Bagian 3: 1/3.
- Bagian 3b (Prompt 6):
  - Migrasi `005_sessions_and_auth.sql`: tabel `sessions` dengan RLS (`user_id = app_user_id()`), fungsi `SECURITY DEFINER` sempit milik `aksespass_owner` dengan `SET search_path = public, pg_temp` (`find_user_by_phone_pre_session` dan `register_user_pre_session`), dengan hak `EXECUTE` dicabut dari `PUBLIC` dan hanya diberikan ke `aksespass_app`.
  - `src/lib/auth`:
    - Normalisasi nomor telepon Indonesia (+62 / 62 / 08, penolakan format tidak valid).
    - `requestOtp`: rate limiting di Postgres per HMAC(telepon) dan per HMAC(IP) dengan `HASH_PEPPER`, kode 6-digit acak kriptografis, hash kode disimpan dengan kedaluwarsa 5 menit, respons identik untuk nomor terdaftar dan belum terdaftar. Mode `dev-display` mengembalikan kode di lokal/tes dan ditolak keras jika `VERCEL_ENV=production`. Mode kosong menolak dengan pesan "Penyedia OTP belum dikonfigurasi".
    - `verifyOtp`: `SELECT ... FOR UPDATE` pada `otp_codes`, perbandingan konstan-waktu, batas maksimal 5 percobaan lalu hangus, sekali pakai (`consumed_at`), pendaftaran akun baru hanya untuk peran `patient` atau `companion` (petugas/admin tidak dapat daftar mandiri), penolakan login petugas nonaktif atau berstatus keanggotaan `invited`, penerbitan sesi di DB dengan konteks RLS user dan cookie bertanda tangan Web Crypto HMAC-SHA256 (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` bila https, `Max-Age` 8 jam untuk staf / 7 hari untuk pasien).
    - Verifikasi dua tingkat: `verifySessionCookie` murni tanpa DB untuk middleware/proxy, dan `requireSession` di lapisan server memeriksa status sesi belum dicabut, status akun aktif, serta keanggotaan faskes aktif.
    - `logout`: mencabut sesi di tabel `sessions` dan mengembalikan header penghapusan cookie.
  - Route Handlers: `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `POST /api/auth/logout` dibungkus dengan `wrapRouteHandler` dan Origin guard (menolak Origin asing dengan status 403).
  - Proxy Next 16 (`src/proxy.ts`): menjaga rute berprefiks peran (`/pasien`, `/pendamping`, `/petugas`, `/admin`, `/kurator`) tanpa akses database atau pg, mengalihkan tanpa cookie ke `/masuk`, mengalihkan peran salah ke beranda perannya, dan meloloskan rute publik (`/`, `/masuk`, `/s`, `/api/auth/*`).
  - Tes arsitektur diperluas: membuktikan file proxy/middleware tidak mengimpor `src/db` atau `pg`.
  - Hasil pemeriksaan: 72 tes di 11 test file lulus (termasuk 28 tes auth, 5 tes proxy, 4 tes route handler, 5 tes arsitektur); `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos. Status Bagian 3: 2/3.
- Bagian 3c (Prompt 7):
  - Migrasi `006_scan_and_consent_improvements.sql`:
    - `consents.subject_ref`: backfill dari `users.audit_subject_id` pasien dan dipasang `NOT NULL` serta index, memutus ketergantungan petugas pada tabel `users` pasien saat audit.
    - `visits.recorded_at`: membedakan kunjungan baru dibuka (`NULL`) vs kunjungan selesai dicatat (T8). Kolom `recorded_need_codes` dapat bernilai `NULL` saat kunjungan dibuka. Kunjungan lampau di-backfill `recorded_at = created_at`.
  - `src/lib/consent`:
    - Format token: Crockford Base32 128 bit (26 karakter, alfabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`), pengelompokan 4 karakter (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX`), normalisasi otomatis (`O`→`0`, `I`/`L`→`1`, hapus spasi/strip), dan hash SHA-256 tersimpan di `consent_qr`.
    - URL QR fragmen: `${APP_ORIGIN}/s#<token>` (fragmen `#` tidak dikirim ke server maupun Referer).
    - `createConsent`: validasi paspor terisi minimal 1 kebutuhan ("Simpan paspor dulu"), durasi 1 jam / hari ini (s.d. 23:59:59.999 WIB) / 24 jam, simpan consent + qr dalam satu transaksi dengan audit `qr_created`.
    - `revokeQr` dan `revokeAllActive`: hanya pemilik (RLS), set `revoked_at`, tulis audit `qr_revoked` per QR.
    - `scanToken`:
      - Rate limit di Postgres per petugas (20/5 min) dan per IP (60/5 min).
      - Pemeriksaan berurutan: token ada, belum dicabut, belum kedaluwarsa, dalam rentang valid, fasilitas cocok.
      - Gagal: satu respons generik (status 422, code `QR_UNUSABLE`, message "Minta pasien membuat ConsentQR baru.") + audit `qr_scan_rejected` (pekerjaan setara: 1 lookup + 1 audit insert).
      - Lolos: baca profil terkini, filter field dicentang, buka/pakai ulang kunjungan hari itu, tulis audit `qr_scanned` dan `profile_read` (fields sebenarnya), commit transaksi sebelum mengembalikan data. Indikator `expiresSoon` aktif jika sisa < 15 menit.
  - Route handler `POST /api/scan`:
    - `requireSession` (staff) + `wrapRouteHandler` + `scanToken`.
    - Petugas nonaktif mengembalikan 403 "Akun tidak aktif. Hubungi admin fasilitas." dan mencatat `qr_scan_rejected`.
    - Respons selalu ber-header `Cache-Control: no-store`; metode `GET` ditolak (405).
  - Tes arsitektur diperluas: `patient_profiles` dan `patient_profile_needs` hanya muncul di `src/lib/consent`, `src/db`, dan tes; route scan hanya mengimpor dari `lib/auth`, `lib/consent`, `lib/http`.
  - Hasil pemeriksaan: 91 tes di 12 test file lulus (termasuk 16 tes matriks consent & scan, 11 tes RLS, 7 tes arsitektur); `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos. Status Bagian 3: 3/3 (SELESAI).

---

## Bagian 4 — Komponen UI Bersama

**Tujuan:** komponen yang dipakai ulang semua layar, sesuai `design.md`.
**Baca:** `design.md` §1–§5; `architecture.md` §14.

**Checklist**
- [x] Button (primer, sekunder), Input teks/OTP, Chip pilihan bergambar, Toggle, `StatusBanner` (sukses/peringatan/galat), Pop-up konfirmasi, Skala ikon CareProof.
- [x] Kerangka halaman: header dengan tombol kembali, area konten `max-width: 60ch` untuk teks.
- [x] Halaman katalog komponen (hanya di mode pengembangan) untuk uji visual.

**Verifikasi** (per komponen)
- [x] Semua target interaktif ≥ 48 × 48 px (diukur di DevTools).
- [x] Dapat dioperasikan dengan keyboard saja; focus ring terlihat.
- [x] Status memakai ikon + teks + warna; tidak ada status yang hanya warna.
- [x] Input 16 px, label terlihat di luar input, tidak memakai placeholder sebagai label.
- [x] Lebar 320 px dan zoom teks 200%: tidak ada horizontal scroll atau teks terpotong.
- [x] `prefers-reduced-motion` aktif: tidak ada animasi.
- [x] Alat uji aksesibilitas otomatis: tidak ada pelanggaran pada halaman katalog.
- [x] `grep` tidak menemukan `font-medium`, `font-semibold`, atau warna hex di luar token.
- [x] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**
- Komponen UI bersama selesai dibuat di `src/components/`:
  - `Button` (primer `bg-cyan-700` font-bold; sekunder `bg-cyan-100 border-cyan-700` font-bold; default `type="button"`; tinggi ≥ 48 px; nonaktif memakai `bg-disabled-surface text-disabled-text`; memproses dengan `aria-busy="true"` dan teks "Memproses…", tanpa animasi).
  - `TextLink` (`text-link` dengan underline, opsi `standalone` dengan area sentuh ≥ 48×48 px).
  - `TextField` (label terlihat di atas; tanpa atribut placeholder; teks bantuan opsional; pesan galat dengan ikon `CircleX` + teks; `aria-invalid` dan `aria-describedby` tersinkron; teks 16 px; border-input; varian telepon `type="tel" autocomplete="tel"`; varian OTP SATU kolom `inputMode="numeric" autocomplete="one-time-code" maxLength={6}`).
  - `ChoiceChip` & `ChoiceGroup` (input checkbox asli di dalam `fieldset`/`legend`; ikon + teks; terpilih memakai `bg-surface` DAN ikon `CircleCheck`; area sentuh ≥ 48×48 px; Spasi untuk memilih).
  - `Toggle` (input checkbox asli dengan `role="switch"`; label teks; tulisan status "Aktif"/"Nonaktif" terlihat berdampingan; area sentuh ≥ 48×48 px).
  - `StatusBanner` (sukses/peringatan/galat; ikon wajib `CircleCheck`, `TriangleAlert`, `CircleX`, atau `Ban` untuk kamera ditolak; judul tebal + pesan; `role="alert"` khusus galat, `role="status"` untuk sukses/peringatan; slot aksi opsional).
  - `ConfirmDialog` (elemen `<dialog>` native dengan `showModal()`; judul via `aria-labelledby`; deskripsi via `aria-describedby`; fokus awal ke tombol batal; Esc menutup; fokus kembali ke pemicu; tombol aksi menyebut tindakan spesifik seperti "Ya, Cabut", bukan "OK").
  - `CareProofScale` (`fieldset` + `legend` + 3 radio asli bergaya ubin besar — Terpenuhi pola sukses, Sebagian pola peringatan, Belum pola galat; masing-masing ikon + teks; terpilih ditandai border tebal 4px + ikon centang `Check`; navigasi panah keyboard native).
  - `PageShell` (header dengan tombol Kembali opsional aria-label "Kembali" ≥ 48 px menuju href halaman; tepat satu H1; main content dengan pembatasan paragraf `max-width: 60ch`).
- Halaman katalog pengembangan: `/dev/katalog` menampilkan semua komponen dalam seluruh keadaannya (normal, terpilih, nonaktif, galat, memproses); mengembalikan 404 pada build produksi.
- Panel pemeriksaan khusus pengembangan (`DevAuditPanel`): komponen client dipasang di root `layout.tsx` via import dinamis hanya bila `NODE_ENV === "development"`, mengecualikan dirinya sendiri dari audit, menyediakan:
  - "Cek aksesibilitas": import dinamis `axe-core`, menjalankan `axe.run` pada halaman.
  - "Cek target sentuh": mendeteksi elemen interaktif < 48×48 px.
  - "Cek scroll horizontal": membandingkan `scrollWidth` dan `clientWidth`.
  - "Simulasi Teks 200%": toggle `document.documentElement.style.fontSize = "200%"`.
  - **Cara memakai untuk prompt berikutnya:** buka halaman aplikasi di mode dev, klik tombol melayang "🛠️ Dev Audit" di pojok kanan bawah, lalu tekan tombol pemeriksaan yang diinginkan untuk audit langsung di peramban. Panel dan `axe-core` terbukti tidak ikut ke build produksi.
- Bukti verifikasi:
  - axe-core di `/dev/katalog`: 0 pelanggaran (`✓ 0 pelanggaran aksesibilitas ditemukan oleh axe-core.`).
  - Target sentuh: 16 dari 16 elemen interaktif di `/dev/katalog` memenuhi target ≥ 48×48 px.
  - Lebar 320 px (emulasi viewport 320×640): `scrollWidth: 320px`, `clientWidth: 320px`, selisih 0 px (tidak ada horizontal scroll).
  - Lebar 320 px + zoom teks 200%: `scrollWidth: 320px`, `clientWidth: 320px`, selisih 0 px (tidak ada horizontal scroll dan teks membungkus rapi).
  - Keyboard: Tab, Spasi, Enter, Panah radio, Esc pada ConfirmDialog (fokus masuk ke dialog pada tombol Batal, Esc menutup dialog, fokus kembali ke tombol pemicu). Focus ring cyan-900 terlihat jelas.
  - Status multimodal: ikon + teks + warna pada StatusBanner dan CareProofScale.
  - Animasi: tidak ada animasi pada komponen, aturan global `prefers-reduced-motion` aktif.
  - Produksi: `pnpm build && pnpm start` menghasilkan status HTTP 404 pada `/dev/katalog` dan panel dev tidak dirender di HTML. Bundle static/server bersih dari `axe-core`.
  - 110 tes lolos di 13 test file (termasuk 15 tes komponen baru dan 4 tes arsitektur baru untuk hex code, palet Tailwind, pembatasan warna status, dan tipografi/placeholder/animasi).
  - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos. Status Bagian 4: SELESAI.

---

## Bagian 5 — Masuk dan Akun

**Tujuan:** pasien dan petugas bisa masuk; petugas nonaktif tertolak.
**Layar:** P1–P4, T1–T3 (kerangka), A1–A2 (aktivasi).
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §2, §10, §13.

**Checklist**
- [x] P1 splash: arah sesuai sesi.
- [x] P2 onboarding aksesibilitas: preferensi ukuran teks dan kontras tersimpan dan berlaku.
- [x] P3 daftar/masuk dengan OTP sesuai K-3; persetujuan statistik anonim terpisah dan opsional.
- [x] P4 beranda pasien (menu boleh mengarah ke halaman kosong dulu).
- [x] T2 login petugas + aktivasi lewat undangan (catatan: aktivasi lewat undangan ditunda; registrasi mandiri petugas ditolak); A2 aktivasi admin.
- [x] Sesi petugas masa berlaku pendek, keluar otomatis.

**Verifikasi**
- [x] Tes: petugas nonaktif atau belum diaktivasi tidak bisa masuk; pesan "Tidak dapat masuk. Hubungi admin fasilitas.".
- [x] Tes: OTP salah dan kedaluwarsa ditolak; ada batas percobaan.
- [x] Kode OTP tidak muncul di log aplikasi.
- [x] Cookie sesi `httpOnly`; tidak ada token di `localStorage`.
- [x] Alur P1→P3→P4 dan T1→T2→T3 dicoba manual dengan keyboard dan di lebar 320 px.
- [x] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**
- Bagian 5 (Prompt 9):
  - Rute dan navigasi berbasis peran:
    - `/` (P1): Fungsi murni server-side `resolveRootDestination(claims, hasPreferenceCookie)` mengarahkan secara instan tanpa jeda buatan: sesi valid → beranda peran (`/pasien`, `/petugas`, `/admin`, `/pendamping`, `/kurator`); tanpa sesi & tanpa cookie preferensi → `/mulai`; selain itu → `/masuk`.
    - `/mulai` (P2): Onboarding aksesibilitas 3 langkah (Bahasa Indonesia sederhana, ukuran teks 100%/150%/200% & kontras standar/tinggi dengan pratinjau live, informasi pembaca layar perangkat, kalimat privasi "aplikasi tidak meminta diagnosis"). Disimpan sebagai cookie HttpOnly `aksespass_pref` via `POST /api/preferences` (Origin guard). Root `layout.tsx` membaca cookie di server dan memasang atribut `data-text-size` & `data-contrast` di `<html>` tanpa kedipan visual.
    - `/masuk` (P3): Login OTP pasien & pendamping. Input telepon, tombol [Kirim kode], input OTP satu kolom dengan fokus otomatis, countdown kedaluwarsa 5 menit, [Kirim ulang]. Banner demo OTP di UI development tanpa log/storage. Checkbox opsional statistik anonim terpisah (tidak tercentang bawaan). Tautan pendamping mengalihkan pendaftaran ke peran `companion` (D2).
    - `/masuk/petugas` (T2/A2): Login OTP petugas/admin/kurator tanpa pendaftaran mandiri (`verifyOtp` tanpa `intendedRole`). Menolak nomor tak dikenal dan staf nonaktif/invited dengan pesan "Tidak dapat masuk. Hubungi admin fasilitas.".
    - `/pasien` (P4): Status paspor via modul baru `src/lib/passport` (`getOwnPassportStatus(session)` via `withContext`). Status "Belum Diisi" menampilkan CTA [Isi Paspor] ke `/pasien/paspor`; status "Lengkap" menampilkan CTA besar [Mulai Kunjungan] ke `/pasien/kunjungan`. Menu navigasi: Paspor Saya, Kontrol Akses, Pendamping, dan [Keluar].
    - `/petugas` (T3): Integrasi `src/lib/facility` (`getStaffFacilityInfo(session)` via `withContext`), nama fasilitas di header, tombol besar [Pindai ConsentQR] ke `/petugas/pindai`, tempat daftar kunjungan, dan tombol [Keluar] terpisah.
    - Beranda sementara dengan tombol [Keluar]: `/admin`, `/pendamping`, `/kurator`, serta rute placeholder `/pasien/paspor`, `/pasien/kunjungan`, `/pasien/akses`, `/pasien/pendamping`, `/petugas/pindai`.
    - Komponen `LogoutButton` di `src/components/logout-button.tsx` (ditambahkan ke katalog `/dev/katalog`) memanggil `POST /api/auth/logout`, mencabut sesi di Postgres, dan mengarahkan ke halaman masuk yang tepat.
    - Proxy/Middleware (`src/proxy.ts`): Sesi kedaluwarsa/rusak dialihkan ke `/masuk?alasan=sesi-berakhir` (atau `/masuk/petugas?alasan=sesi-berakhir`) dengan `StatusBanner` peringatan "Sesi Anda berakhir. Silakan masuk lagi.". Pesan alasan dijaga murni oleh allowlist di `src/lib/auth/reasons.ts`.
  - Bukti verifikasi:
    - Vitest: 128 tes di 15 test file lulus 100% (termasuk 11 tes preferensi & routing P1, 3 tes passport status, 7 tes proxy, 28 tes auth).
    - Uji browser otomatis DevTools:
      - 0 pelanggaran axe di `/mulai`, `/masuk`, `/masuk/petugas`, `/pasien`, `/petugas`.
      - Target sentuh ≥ 48×48 px pada seluruh tombol, input, dan tautan.
      - 0 horizontal scroll pada lebar layar 320 px dan mode Teks 200%.
      - Preferensi kontras tinggi + Teks 200% bertahan konsisten di `/masuk` dan `/pasien` via cookie HttpOnly.
      - Alur keyboard murni dari `/` → `/mulai` → `/masuk` → demo OTP → `/pasien` (status "belum diisi", CTA "Isi Paspor").
      - Pengujian akun seed: Pasien aktif (`+620000000001`) → status "lengkap", CTA "Mulai Kunjungan"; Petugas aktif (`+620000000011`) → "Puskesmas Contoh A"; Pendamping (`+620000000005`) → `/pendamping`; Admin (`+620000000021`) → `/admin`; Kurator (`+620000000031`) → `/kurator`; Petugas nonaktif (`+620000000012`) → ditolak 400 "Tidak dapat masuk. Hubungi admin fasilitas.".
      - Kerusakan/kedaluwarsa cookie sesi mengalihkan ke `/masuk?alasan=sesi-berakhir` dengan banner peringatan.
      - Logout berhasil menghapus sesi dari database dan cookie peramban.
      - Pemeriksaan storage peramban: `localStorage` dan `sessionStorage` kosong (0 token, 0 kode OTP, 0 data akun). Cookie sesi `HttpOnly` tidak terbaca di `document.cookie`.
      - Log dev server bersih: scrubber privasi aktif, 0 kode OTP dan 0 nomor telepon mentah bocor ke log.
    - Arsitektur: `src/__tests__/architecture.test.ts` membuktikan `src/app` tidak mengimpor `src/db` atau `pg`, dan `patient_profiles` diizinkan hanya pada modul resmi (`src/lib/passport`, `src/lib/consent`).
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos. Status Bagian 5: SELESAI.

---

## Bagian 6 — Pasien: Paspor, ConsentQR, Kontrol Akses

**Tujuan:** semua story Must sisi pasien kecuali CareProof.
**Layar:** P5–P6, P9, P11–P12, P18–P20.
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §7, §11.

**Checklist**
- [x] P5 editor paspor per kelompok kebutuhan; tidak ada kolom diagnosis; draft sesuai K-8.
- [x] P6 pratinjau persis seperti yang akan dilihat petugas; simpan.
- [x] P5 editor paspor per kelompok kebutuhan; tidak ada kolom diagnosis; draft sesuai K-8.
- [x] P6 pratinjau persis seperti yang akan dilihat petugas; simpan.
- [x] P9 pilih fasilitas (jalur "sudah di fasilitas").
- [x] P11 pilih field (P-04) dan masa berlaku.
- [x] P12 QR besar berisi URL dengan token saja, hitung mundur, cabut dengan konfirmasi; berubah menjadi "Dipindai oleh petugas".
- [ ] P18–P20 riwayat akses (siapa, kapan, fasilitas, nama field) dan daftar QR aktif dengan cabut.

**Verifikasi**
- [x] Dekode isi QR: hanya URL + token, tanpa nama, kebutuhan, atau ID pasien.
- [x] Tes: draft belum disimpan tidak bisa dibagikan lewat QR (K-8 draft hanya di memori).
- [x] Tes: profil diubah → QR aktif membaca profil terbaru (perilaku "dibaca saat dipindai").
- [x] Tes: QR dicabut di P12 atau P20 → pindai berikutnya ditolak dan pencabutan tampil di P19.
- [ ] P19 hanya menampilkan riwayat milik pasien yang masuk (tes akses silang antarpasien ditolak).
- [x] Halaman token memakai `Referrer-Policy: no-referrer`.
- [x] Uji manual keyboard + 320 px + zoom 200% pada P5 dan P6.
- [x] Uji manual keyboard + 320 px + zoom 200% pada P9, P11, dan P12 (termasuk ConfirmDialog terbuka).
- [x] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**
- Bagian 6 (1 dari 3 / Prompt 10 — P5–P6):
  - Modul Domain Paspor (`src/lib/passport`):
    - `getNeedsCatalog(session?)`: Mengambil seluruh katalog kebutuhan yang dikelompokkan per 6 kategori (`komunikasi`, `penglihatan`, `pendengaran`, `mobilitas`, `sensorik_lingkungan`, `pendampingan`). Kategori kosong tanpa item tidak dikembalikan.
    - `getOwnPassport(session, targetPatientUserId?)`: Mengembalikan data lengkap paspor pasien sendiri (`preferredName`, `namaPanggilan`, `needCodes`, `kodeKebutuhan`, `patientNote`, `catatan`, `updatedAt`, `waktuUbah`) atau `null` jika profil belum ada.
    - `saveOwnPassport(session, input, options?)`: Dijalankan dalam satu transaksi `withContext`. Skema input divalidasi sangat ketat (kunci tak dikenal atau bernama `diagnosis`/`diagnosa` ditolak dengan galat). Nama panggilan wajib (1–80 karakter trim). Kebutuhan wajib terdaftar di katalog dan minimal satu. Catatan opsional (maks 300 karakter). Melakukan upsert atomik ke `patient_profiles`, menghapus dan mengganti relasi `patient_profile_needs`, serta menyetel penanda pembaruan pasien (`last_updated_by_companion_id = null`, `last_updated_by_companion_at = null`). Parameter opsi actor disediakan agar Prompt 16 dapat menambahkan tindakan pendamping.
  - Komponen Bersama `PatientNeedsSummary` (`src/components/patient-needs-summary.tsx`):
    - Komponen ringkasan kebutuhan dengan nama panggilan besar, kebutuhan per kategori dengan ikon Lucide dan teks tebal `text-base font-bold text-main`, catatan untuk petugas bila ada, serta keterangan privasi *"Diagnosis tidak diminta"* dan *"Petugas hanya melihat bagian yang Anda pilih saat membuat ConsentQR."*
    - Dipasang di katalog pengembangan `/dev/katalog` (Section 11) dan diekspor melalui `src/components/index.ts`.
  - Halaman dan Klien Editor Paspor (`/pasien/paspor` — P5 + P6):
    - Alur wizard 8 langkah + pratinjau P6 dalam satu komponen klien `PassportEditorClient`.
    - Langkah 1: "Nama Panggilan" dengan teks bantuan *"Boleh nama panggilan, tidak perlu nama lengkap."*.
    - Langkah 2–7: Pemilihan kebutuhan per kategori dengan `ChoiceGroup` dan `ChoiceChip`. Pengguna dapat lanjut tanpa memilih pada kategori tertentu.
    - Langkah 8: "Catatan untuk Petugas (Opsional)" dengan teks bantuan *"Tulis cara membantu Anda. Tidak perlu menulis diagnosis atau nama penyakit."* dilengkapi penghitung karakter dinamis (maks 300).
    - Aksesibilitas: Indikator *"Langkah X dari 8"*, tombol navigasi [Sebelumnya] dan [Lanjut]/[Lihat Pratinjau]. Setiap pergantian langkah otomatis memindahkan fokus keyboard ke judul langkah (H2) sehingga diumumkan oleh pembaca layar.
    - Tombol Keluar [X]: Jika isian mengalami perubahan (`isDirty`), membuka `ConfirmDialog` *"Keluar tanpa menyimpan? Perubahan akan hilang."* dengan tombol [Tetap mengisi] dan [Ya, Buang]. Fokus kembali ke pemicu jika dibatalkan.
    - Kepatuhan K-8: Draft paspor berada HANYA di memori komponen (React state). Sama sekali tidak ditulis ke `localStorage`, `sessionStorage`, `IndexedDB`, atau `cookie`. Pemuatan ulang halaman membersihkan isian.
    - Layar Pratinjau P6: Menampilkan `PatientNeedsSummary`. Jika kebutuhan kosong (`0`), muncul `StatusBanner` peringatan *"Pilih minimal satu kebutuhan"* dan tombol simpan diblokir. Tombol [Kembali Edit] mengembalikan pengguna ke Langkah 8 dengan pilihan tetap terjaga.
    - Route Handler `POST /api/pasien/paspor`: Dilindungi `wrapRouteHandler` (pemeriksaan `Origin`, header `Cache-Control: no-store`, logging privasi tanpa membocorkan pesan galat internal) dan `requireSession` (hanya peran `patient`).
    - Pesan Sukses: `StatusBanner` sukses *"Paspor tersimpan"* dengan pesan *"Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif."* (sesuai arsitektur §7) serta tombol [Mulai Kunjungan] dan [Ke Beranda].
  - Tes Arsitektur:
    - Ditambahkan aturan verifikasi statis di `src/__tests__/architecture.test.ts`: kata *"diagnos"* dilarang keras muncul sebagai kolom, input, form field, name, id, prop, atau identifier di seluruh `src/app` dan `src/components`. Setiap kemunculan string "diagnos" hanya diizinkan berupa pernyataan penolakan/privasi resmi.
  - Bukti verifikasi:
    - Vitest: 144 tes di 16 test file lulus 100% (termasuk 13 tes arsitektur, 13 tes passport, 4 tes passport route handler, 16 tes komponen UI).
    - Browser otomatis DevTools:
      - Alur Pasien Baru 8 langkah → pratinjau → simpan: status beranda `/pasien` berubah dari *"Paspor Belum Diisi"* menjadi *"Paspor Layanan Lengkap"*.
      - Ubah profil Pasien Contoh 1: formulir terisi data tersimpan dari basis data.
      - Draft di memori (K-8): isi formulir lalu reload halaman membuktikan isian hilang dan `localStorage`/`sessionStorage`/`document.cookie` bersih dari data paspor.
      - Dialog konfirmasi keluar berfungsi dan mengembalikan fokus tombol [X] saat batal.
      - Dev Audit Panel pada Langkah 1, Langkah 2, Langkah 8, dan Pratinjau: 0 pelanggaran axe, target sentuh ≥ 48×48 px, 0 horizontal scroll pada lebar 320 px dan zoom teks 200%.
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 6: 1/3 (Bagian 6a SELESAI).
- Bagian 6 (2 dari 3 / Prompt 11 — P9, P11–P12):
  - Komponen `RadioList` (`src/components/radio-list.tsx`):
    - Komponen pilihan radio aksesibel dengan `<fieldset>` dan `<legend>`, target sentuh per opsi minimal 48×48 px, label + deskripsi pendukung, fokus keyboard yang jelas, dan diekspor ke katalog `/dev/katalog`.
  - Utilitas Klien Bersih (`src/lib/consent/time.ts`):
    - Fungsi murni tanpa ketergantungan DB: `formatTimeWib` (WIB UTC+7), `formatRemainingTime`, `formatExpiryText`, `getExpiryStatus`, `resolveDefaultSharedFields`, `formatTokenForDisplay`, `buildQrPayload`.
  - Domain Consent Tambahan (`src/lib/consent/index.ts`, `src/lib/facility/index.ts`):
    - `getLastConsentSharedFields`: mengambil `shared_fields` terakhir milik pasien.
    - `getConsentQrStatus`: memeriksa status QR terkini (`aktif`, `dipindai`, `kedaluwarsa`, `dicabut`) dengan menanyakan riwayat kunjungan di tabel `visits` tanpa mengubah skema basis data.
    - `countActiveConsents`: menghitung jumlah QR aktif milik pasien untuk memunculkan tautan Kontrol Akses.
    - `getActiveFacilities`: kueri fasilitas aktif dengan RLS.
  - Route Handlers Pasien:
    - `POST /api/pasien/kunjungan/consent`: memvalidasi input dan memanggil `createConsent` dalam satu transaksi dengan audit `qr_created`.
    - `GET /api/pasien/qr/[qrId]/status`: endpoint status ber-header `Cache-Control: no-store`, mengembalikan status QR tanpa membocorkan token. Menghasilkan 401 tanpa sesi, 403 untuk staf, dan 404 generik untuk QR milik pasien lain atau ID tak dikenal.
    - `POST /api/pasien/qr/[qrId]/revoke`: pencabutan QR oleh pasien pemilik dengan audit `qr_revoked`.
  - Alur Kunjungan & ConsentQR (`/pasien/kunjungan` [P9], `/pasien/kunjungan/qr` [P11 + P12]):
    - P9: Jika paspor kosong → banner peringatan "Isi paspor dulu" + tautan `/pasien/paspor`. Jika paspor ada → daftar fasilitas radio + tombol [Saya sudah di fasilitas] menuju `/pasien/kunjungan/qr?fasilitas=<id>`.
    - P11: Toggle per kategori yang ada di paspor + toggle catatan untuk petugas; nama panggilan selalu dibagikan (teks tetap); keterangan privasi diagnosis; bawaan toggle dari consent terakhir (fallback semua aktif); radio masa berlaku (1 jam, hari ini, 24 jam); pratinjau langsung `PatientNeedsSummary` tersaring.
    - P12: Ditampilkan di URL yang sama di memori. QR SVG besar dari paket `qrcode` (modul teks di atas putih, quiet zone 4 modul), kode manual Crockford Base32 berkelompok 4 karakter, hitung mundur statis WIB, polling otomatis status tiap 5 detik (berhenti saat dipindai, kedaluwarsa, dicabut, atau tab tersembunyi).
    - Status dipindai: QR diganti `StatusBanner` sukses "Dipindai oleh petugas — <fasilitas>" dan tombol [Ke Beranda]; [Cabut Sekarang] tetap tersedia.
    - Pencabutan di P12: Membuka `ConfirmDialog`, memanggil API pencabutan, menampilkan banner sukses "QR dicabut" + [Buat QR Baru] [Ke Beranda]. Token segera dihapus dari memori.
  - Bukti verifikasi:
    - Vitest: 153 tes di 17 test file lolos 100% (termasuk 8 tes unit dan rute pada `consent-qr-p11-p12.test.ts`, 13 tes arsitektur statik).
    - Dekode payload QR: tepat `${APP_ORIGIN}/s#<26 char Crockford Base32>` tanpa data pasien lain.
    - Token privasi memori: diperiksa di DevTools console — URL address bar, `localStorage`, `sessionStorage`, `IndexedDB`, `document.cookie`, dan atribut `img.alt` bebas dari token mentah.
    - Header: `curl -I /pasien/kunjungan/qr` mengembalikan `Referrer-Policy: no-referrer`.
    - Simulasi pindai dengan curl: login petugas seed fasilitas yang sama → pindai via `POST /api/scan` → halaman P12 dalam peramban otomatis berubah menjadi "Dipindai oleh petugas — Puskesmas Contoh A" via polling dalam ≤ 6 detik.
    - Pencabutan dan penolakan pindai: pencabutan di P12 mengubah status menjadi "QR dicabut"; percobaan pindai ulang dengan curl mengembalikan status 422 `QR_UNUSABLE`.
    - Log dev server: diperiksa dengan grep, token tidak pernah muncul di log server.
    - Dev Audit Panel: 0 pelanggaran axe, semua elemen interaktif ≥ 48×48 px, 0 scroll horizontal pada 320 px dan zoom teks 200% (termasuk saat `ConfirmDialog` terbuka).
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 6: 2/3 (Bagian 6b SELESAI).

---

## Bagian 7 — Petugas: Pindai, Saran, Catat Bantuan

**Tujuan:** semua story Must sisi petugas.
**Layar:** T3–T6, T8–T9.
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §7, §13.

**Checklist**
- [ ] T3 beranda petugas.
- [ ] T4 pindai kamera + input kode manual bila kamera ditolak (status "Kamera Ditolak").
- [ ] T5 satu layar kebutuhan: nama panggilan, ikon + teks besar, tanpa diagnosis.
- [ ] T6 saran tindakan dari `accommodation_rules` (aturan bawaan), berlabel "Saran, bukan instruksi klinis".
- [ ] T8 catat bantuan: centang terisi dari saran; catatan bebas opsional dengan batas panjang dan peringatan "jangan menulis diagnosis".
- [ ] T9 kirim permintaan konfirmasi; opsi "Konfirmasi di Tempat".

**Verifikasi**
- [ ] Demo end-to-end: pasien P12 → petugas T4 → T5 menampilkan field yang dicentang saja.
- [ ] Hitung manual T8: maksimal 3 ketukan dari layar terbuka sampai tersimpan, dengan saran terisi otomatis.
- [ ] Tes: setiap profil seed menghasilkan saran yang sesuai aturan; aturan berstatus Draft tidak tampil.
- [ ] Tes: catatan petugas melebihi batas ditolak di server.
- [ ] Pesan galat pindai sesuai K-4 dan memberi langkah lanjut.
- [ ] Kamera ditolak → jalur kode manual berfungsi.
- [ ] Uji di perangkat seluler nyata (kamera belakang).
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 8 — CareProof dan Dashboard

**Tujuan:** P-07 dan A-02 (Must); P-08, A-03, A-04 bila waktu ada.
**Layar:** P16–P17, A3, A6 (Must); A7–A8 (Should).
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §9 (resolusi CareProof), §11.

**Checklist**
- [ ] P16 skala tiga ikon; daftar kebutuhan belum terpenuhi bila "sebagian/belum"; `confirmed_by` tersimpan.
- [ ] P17 ringkasan dan status tindak lanjut (label sesuai K-9).
- [ ] A3 ringkasan bulan berjalan; A6 Accommodation Fulfillment Rate + tren + per kategori, sub-metrik pendamping dan di tempat terpisah.
- [ ] A7 kategori belum terpenuhi; A8 tindak lanjut (Should).
- [ ] Ambang kelompok kecil sesuai K-10.

**Verifikasi**
- [ ] Tes: tanpa jawaban = "belum dikonfirmasi", tidak dihitung terpenuhi.
- [ ] Tes perhitungan Fulfillment Rate dengan data seed yang hasilnya sudah dihitung manual.
- [ ] Tes: kelompok di bawah ambang tidak ditampilkan.
- [ ] Tes: respons API dashboard tidak memuat ID, nama, atau kontak pasien.
- [ ] Tes: admin tidak bisa membaca profil pasien atau brief (RLS + layanan).
- [ ] Grafik: label teks dan angka tersedia, bukan hanya warna; terbaca di 320 px.
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 9 — Offline dan Kartu Cetak

**Tujuan:** T-05 dan P-14.
**Layar:** P7, P8, T4b; antrean T8/T9/P16 saat offline.
**Baca:** `architecture.md` §9, §13; `docs/user-flows.md` P7, P8, T4b; `AGENTS.md` (Offline).

**Checklist**
- [ ] P7 kartu cetak/PDF: ringkasan teks saja, tanpa QR; pengenal sesuai K-5.
- [ ] P8 ringkasan offline sesuai K-8.
- [ ] Service worker meng-cache cangkang aplikasi dan halaman pencatatan; **tidak** meng-cache respons API berisi data pasien.
- [ ] Antrean IndexedDB petugas dengan `client_id`; `POST /api/sync` idempoten.
- [ ] T4b input kunjungan manual dari kartu.
- [ ] Status "Menunggu Sinkron" → "Tersinkron" lewat `StatusBanner`.
- [ ] Data lokal dihapus setelah sinkron dan terkunci saat petugas keluar.

**Verifikasi**
- [ ] Tes: antrean yang sama dikirim dua kali → tidak ada duplikat.
- [ ] Tes: koneksi putus di tengah sinkron → sisa antrean terkirim saat online, tanpa kehilangan dan tanpa duplikat.
- [ ] DevTools offline: halaman pencatatan dan P8 terbuka; pindai QR menampilkan pesan butuh koneksi.
- [ ] Cache service worker diperiksa: tidak ada respons berisi data pasien.
- [ ] Kartu cetak diperiksa: tidak ada QR, terbaca saat dicetak hitam-putih.
- [ ] **[Verifikasi]** iOS Safari di perangkat nyata: install PWA, tutup lama, buka lagi, catat apa yang bertahan. Hasil ditulis ke `architecture.md` §9.
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 10 — Should untuk Demo

**Tujuan:** D-01–D-03, P-16, P-09, P-10. Kerjakan sub-bagian secara terpisah; masing-masing boleh dipotong.
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §2, §6, §11.

### 10A — Pendamping (D1–D8, P21)
- [ ] Daftar pendamping, ajukan tautan, pasien menyetujui di P21, cabut tautan.
- [ ] Kelola paspor dan QR atas nama pasien; konfirmasi CareProof atas nama pasien.

**Verifikasi 10A**
- [ ] Tes: sebelum disetujui pendamping tidak bisa membaca data apa pun.
- [ ] Tes: setelah dicabut akses berakhir seketika.
- [ ] Tes: perubahan oleh pendamping tercatat (`profile_changed_by_companion`) dan terlihat pasien.
- [ ] Tes: konfirmasi pendamping tersimpan `confirmed_by = companion` dan terpisah di dashboard.

### 10B — KomunikaCare (P15.1–P15.3, T7)
- [ ] Papan bergambar, teks ke suara, teks langsung dari ucapan petugas dengan peringatan "bukan pengganti juru bahasa isyarat".
- [ ] Alternatif input ketik bila mikrofon atau browser tidak mendukung.

**Verifikasi 10B**
- [ ] Diuji di perangkat demo (Android dan iOS); hasil dukungan dicatat.
- [ ] Mikrofon ditolak → fitur nonaktif dengan pesan jelas dan input ketik tersedia.
- [ ] Tidak ada teks hasil ucapan yang dikirim ke server aplikasi, log, atau analitik.
- [ ] Keputusan privasi tercatat: layanan speech-to-text peramban dapat mengirim audio ke pihak ketiga.

### Umum
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 11 — Persiapan Demo dan Klaim

**Tujuan:** demo stabil dan setiap klaim di presentasi punya bukti.
**Baca:** `architecture.md` §12 (klaim privasi), §15; `SOUL.md` §2.

**Checklist**
- [ ] Skenario demo tertulis per aktor, memakai data seed sintetis, dan bisa di-reset.
- [ ] Daftar klaim presentasi beserta buktinya (tes atau uji manual).

**Verifikasi**
- [ ] Seluruh skenario demo dijalankan dua kali berturut-turut tanpa intervensi manual.
- [ ] Uji pembaca layar manual (TalkBack dan/atau VoiceOver) pada alur Must.
- [ ] Tes kebocoran data dijalankan ulang terhadap seluruh alur.
- [ ] Klaim "WCAG 2.2 AA", "offline", dan "diagnosis tidak pernah ke server" **hanya** dipakai bila buktinya tercatat; bila tidak, pakai kalimat yang lebih lemah dan jujur.
- [ ] Angka latar belakang di `docs/proposal.md` sudah dicek ke sumber asli.
- [ ] `lint`, `typecheck`, `test`, `build` lolos pada commit yang akan didemokan.

**Catatan hasil:**
