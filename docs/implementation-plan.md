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
| 8 | CareProof dan dashboard | 7, K-9, K-10 | P-07, A-02, (P-08, A-03, A-04) | ☑ Must (P-07, A-02); P-08/A7–A8 tidak hari ini; verifikasi visual tertunda |
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
- [x] P18–P20 riwayat akses (siapa, kapan, fasilitas, nama field) dan daftar QR aktif dengan cabut.

**Verifikasi**
- [x] Dekode isi QR: hanya URL + token, tanpa nama, kebutuhan, atau ID pasien.
- [x] Tes: draft belum disimpan tidak bisa dibagikan lewat QR (K-8 draft hanya di memori).
- [x] Tes: profil diubah → QR aktif membaca profil terbaru (perilaku "dibaca saat dipindai").
- [x] Tes: QR dicabut di P12 atau P20 → pindai berikutnya ditolak dan pencabutan tampil di P19.
- [x] P19 hanya menampilkan riwayat milik pasien yang masuk (tes akses silang antarpasien ditolak).
- [x] Halaman token memakai `Referrer-Policy: no-referrer`.
- [x] Uji manual keyboard + 320 px + zoom 200% pada P5 dan P6.
- [x] Uji manual keyboard + 320 px + zoom 200% pada P9, P11, dan P12 (termasuk ConfirmDialog terbuka).
- [x] Uji manual keyboard + 320 px + zoom 200% pada P18, P19 (berisi & kosong), dan P20 (termasuk ConfirmDialog terbuka).
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
- Bagian 6 (3 dari 3 / Prompt 12 — P18–P20):
  - Migrasi Basis Data 007 (`src/db/migrations/007_access_history.sql`):
    - Fungsi `SECURITY DEFINER` sempit `get_patient_access_history(p_from, p_to, p_facility_id)` milik `aksespass_owner`.
    - `SET search_path = public, pg_temp`, izin `EXECUTE` dicabut dari `PUBLIC` dan diberikan khusus ke `aksespass_app`.
    - Hanya berjalan jika `app.role = 'patient'`, mengambil `audit_subject_id` pasien pemanggil dari `app.user_id`. Mengembalikan HANYA event audit dengan `subject_ref` tersebut.
    - Kolom dikembalikan: `occurred_at`, `event_type`, `actor_label` (`"Anda"` untuk aksi sendiri, `display_name` petugas/pendamping untuk orang lain), `facility_name`, `fields`.
    - Tidak membocorkan token, nomor telepon, ID pasien, atau nilai profil paspor ke hasil riwayat.
  - Modul Audit Domain (`src/lib/audit/index.ts`):
    - `getOwnAccessHistory(session, filter)` memanggil fungsi SECURITY DEFINER via `withContext`.
    - `mapAuditEventToDisplayEntry`: fungsi murni memetakan event ke label bahasa Indonesia yang ramah manusia.
      - `profile_read` → `"Data dibuka oleh <petugas> — <fasilitas>"` + field manusiawi (`Nama panggilan`, `Komunikasi`, `Pendengaran`, `Mobilitas`, `Sensorik Lingkungan`, `Pendampingan`, `Catatan`).
      - `qr_scanned` disaring otomatis (tidak ditampilkan terpisah karena selalu berpasangan dengan `profile_read`).
      - `qr_scan_rejected` → `"Percobaan pindai ditolak — <fasilitas>"`.
      - `qr_created` / `qr_revoked` → `"Anda membuat/mencabut QR untuk <fasilitas>"`.
      - Field tak dikenal tidak pernah dicetak mentah (`mapAuditFieldsToHumanLabels`).
  - Modul Consent Domain (`src/lib/consent/index.ts`):
    - `listOwnActiveQrs(session)`: mengambil QR milik pasien yang belum kedaluwarsa dan belum dicabut (`id`, `facilityName`, sisa waktu / `expiryText`, `sharedFieldLabels`).
  - Layar Pasien (P18–P20):
    - P18 (`/pasien/akses`): dua kartu [Riwayat Akses] dan [QR Aktif]. Kartu QR Aktif menampilkan jumlah QR aktif sebagai teks dinamis (misal `"1 QR aktif"` atau `"Tidak ada QR aktif"`).
    - P19 (`/pasien/akses/riwayat`): daftar kronologis pembukaan data, terbaru di atas (tanggal + jam WIB, pelaku, faskes, data yang dilihat). Bila kosong → `"Belum ada akses"`. Tombol [Cabut Semua QR] membuka `ConfirmDialog` dan memanggil `revokeAllActive` dengan `StatusBanner` sukses. Filter periode (7 hari, 30 hari, semua waktu) dan fasilitas tersedia. Tombol [Laporkan] sengaja tidak dibuat hari ini agar tidak menjanjikan tindak lanjut tanpa layar admin.
    - P20 (`/pasien/akses/qr`): daftar QR aktif. Tiap item memiliki tombol [Cabut] → `ConfirmDialog` `"QR ini tidak akan bisa dipakai lagi."` → `revokeQr` → item hilang dari daftar + `StatusBanner` sukses, fokus keyboard berpindah otomatis ke judul daftar (`<h2>`). Bila kosong → `"Tidak ada QR aktif."`.
  - Route Handlers Pasien:
    - `POST /api/pasien/qr/revoke-all`: mencabut seluruh QR aktif pasien.
    - `GET /api/pasien/akses/riwayat`: endpoint riwayat akses dengan filter.
    - `GET /api/pasien/akses/qr`: endpoint daftar QR aktif.
  - Bukti verifikasi:
    - Vitest: 160 tes di 18 test file lolos 100% (termasuk 7 tes unit, hak akses DB, dan rute di `src/lib/audit/access-history-p18-p20.test.ts`).
    - Database `pg_proc`: `prosecdef = true`, `proconfig = ["search_path=public, pg_temp"]`, `proacl` hanya memberi `EXECUTE` ke `aksespass_app` dan `aksespass_owner`.
    - Isolasi & Akses Silang: Pasien 2 tidak dapat melihat atau mencabut QR maupun riwayat akses Pasien 1 (percobaan cabut via API mengembalikan 404 tanpa kebocoran). Peran petugas/pendamping memanggil riwayat mengembalikan 0 baris.
    - Ujung ke ujung via peramban & curl: Buat QR di P11/P12 → pindai via curl sebagai petugas → P19 menampilkan `"Data dibuka oleh Petugas Contoh Aktif A — Puskesmas Contoh A"` beserta data yang dilihat → cabut di P20 → P19 menampilkan pencabutan → curl pindai lagi mengembalikan 422 `QR_UNUSABLE` → P19 menampilkan `"Percobaan pindai ditolak — Puskesmas Contoh A"`.
    - Dev Audit Panel: 0 pelanggaran axe, semua elemen interaktif ≥ 48×48 px, 0 scroll horizontal pada lebar 320 px dan zoom teks 200% pada P18, P19 (berisi & kosong), dan P20 (termasuk saat `ConfirmDialog` terbuka).
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 6: SELESAI (3/3).


---

## Bagian 7 — Petugas: Pindai, Saran, Catat Bantuan

**Tujuan:** semua story Must sisi petugas.
**Layar:** T3–T6, T8–T9.
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §7, §13.

**Checklist**
- [x] T3 beranda petugas.
- [x] T4 pindai kamera + input kode manual bila kamera ditolak (status "Kamera Ditolak").
- [x] T5 satu layar kebutuhan: nama panggilan, ikon + teks besar, tanpa diagnosis.
- [x] T6 saran tindakan dari `accommodation_rules` (aturan bawaan), berlabel "Saran, bukan instruksi klinis".
- [x] T8 catat bantuan: centang terisi dari saran; catatan bebas opsional dengan batas panjang dan peringatan "jangan menulis diagnosis".
- [x] T9 kirim permintaan konfirmasi; opsi "Konfirmasi di Tempat".

**Verifikasi**
- [x] Demo end-to-end: pasien P12 → petugas T4 → T5 menampilkan field yang dicentang saja.
- [x] Hitung manual T8: maksimal 3 ketukan dari layar terbuka sampai tersimpan, dengan saran terisi otomatis (terbukti: 2 ketukan: hapus 1 centang bantuan + [Simpan]).
- [x] Tes: setiap profil seed menghasilkan saran yang sesuai aturan; aturan berstatus Draft tidak tampil; kebutuhan tanpa aturan dilaporkan terpisah.
- [x] Tes: catatan petugas melebihi batas (280 karakter) ditolak di server.
- [x] Pesan galat pindai sesuai K-4 dan memberi langkah lanjut.
- [x] Kamera ditolak → jalur kode manual berfungsi.
- [ ] Uji di perangkat seluler nyata (kamera belakang) — sisa pekerjaan di perangkat fisik nyata (panduan pengujian tersedia di README.md).
- [x] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**
- Bagian 7a (1 dari 2 / Prompt 13 — T3–T5, Halaman /s, Mode Demo):
  - State Machine Klien (`src/components/petugas-pindai-flow.tsx`):
    - Alur terpadu `memindai` (T4) → `kebutuhan` (T5) → `saran` (placeholder jujur Prompt 14).
    - Aksesibilitas navigasi langkah: `document.title` berubah dinamis pada setiap langkah dan fokus keyboard otomatis dipindahkan ke judul langkah (H1/H2).
    - Privasi perangkat bersama: data hasil pemindaian hanya disimpan di React state memori; tidak disimpan di `localStorage`, `sessionStorage`, cookie, atau URL. Tombol [Selesai] dan [Keluar] membersihkan seluruh data dan bernavigasi menggunakan `window.location.replace` agar tombol Back peramban tidak menampilkan data kembali.
    - Auto-sembunyi: data pasien otomatis disembunyikan jika tidak ada aktivitas (mouse/keyboard/touch/scroll) selama 10 menit dengan banner peringatan dan opsi pulihkan/pindai ulang.
  - T4 Kamera dan Kode Manual:
    - Kamera menggunakan API tingkat rendah `Html5Qrcode` (impor dinamis) tanpa widget pihak ketiga. Kamera tidak menyala otomatis; meminta izin setelah ketukan tombol [Mulai kamera]; kamera belakang (`facingMode: environment`) dengan fallback kamera standar; status peran `status` "Kamera aktif"; tombol [Hentikan kamera]; dan penguncian scanning untuk mencegah request ganda.
    - Ekstraksi token murni (`src/lib/consent/extract-token.ts`): mengekstrak bagian setelah `#` bila ada, atau teks mentah apa adanya, dipotong ke 64 karakter.
    - Input manual selalu tersedia: `TextField` "Kode ConsentQR (26 karakter)" dengan teks bantuan, `autoCapitalize="characters"`, `autoComplete="off"`, `spellCheck=false`.
    - Galat kamera: izin ditolak menampilkan banner galat ikon Ban "Kamera Ditolak" + tombol [Masukkan kode manual]; lingkungan non-secure context atau kamera tak tersedia menampilkan "Kamera Tidak Tersedia".
    - Respons `/api/scan`:
      • 422: StatusBanner galat K-4 generik "QR Tidak Dapat Dipakai" + "Minta pasien membuat ConsentQR baru." + [Pindai lagi] (mengosongkan input dan mengembalikan fokus).
      • 429: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."
      • 403: "Akun tidak aktif. Hubungi admin fasilitas." + [Keluar].
      • 401: dialihkan ke `/masuk/petugas?alasan=sesi-berakhir`.
      • Kegagalan jaringan: banner galat koneksi internet.
  - T5 Kebutuhan Pasien:
    - StatusBanner sukses "QR Valid", atau peringatan "Hampir Kedaluwarsa" (< 15 menit).
    - `PatientNeedsSummary` merender nama panggilan, kebutuhan terkelompok dengan ikon dan teks besar, catatan untuk petugas, dan catatan privasi "Hanya data yang diizinkan pasien. Diagnosis tidak diminta." (heading level h2 dinamis untuk kepatuhan urutan heading WCAG AA).
    - Tombol [Lihat Saran] (navigasi ke langkah saran) dan [Selesai] (membersihkan data dan kembali ke `/petugas`).
  - Halaman `/s` Publik / Petugas (`src/app/s`):
    - Client membaca `location.hash` dan segera memanggil `history.replaceState(null, "", "/s")` sehingga token hilang seketika dari address bar dan riwayat peramban.
    - Sesi petugas: memproses token ke alur pemindaian dan membuka T5 secara otomatis.
    - Tanpa sesi petugas: kartu informasi publik ("Halaman ini untuk petugas fasilitas. Bila Anda pasien, tunjukkan QR ini kepada petugas.") + tautan login petugas, tanpa request ke `/api/scan`.
  - T3 Beranda Petugas & Daftar Kunjungan Hari Ini (`src/lib/visits`):
    - Modul `listTodayVisits(session)`: kueri kunjungan fasilitas hari ini (WIB UTC+7) dengan RLS isolasi fasilitas.
    - Daftar menampilkan jam, rujukan pendek (4 karakter akhir UUID), status sebagai teks netral ("Belum dicatat", "Menunggu konfirmasi", "Dikonfirmasi") tanpa warna token status demi menjaga §14.
    - TANPA nama pasien atau data profil apa pun.
  - Mode Demo Dua Perangkat & Keamanan:
    - `src/lib/http`: pemeriksaan Origin mutasi diperluas membaca daftar `APP_ORIGINS` (dipisahkan koma, bawaan `APP_ORIGIN`).
    - Header `Cache-Control: no-store` dipasang di Next.js config dan middleware proxy untuk rute `/petugas/*` dan `/s`.
    - Panduan lengkap pengujian multi-perangkat (laptop petugas vs ponsel pasien) dan peringatan keamanan Wi-Fi ditulis di `README.md`.
  - Bukti Verifikasi:
    - Vitest: 174 tes di 20 test file lolos 100% (termasuk tes ekstraksi token, isolasi kunjungan faskes, format WIB, APP_ORIGINS).
    - DevTools Browser:
      • Masuk petugas seed A (`+620000000011` / OTP dev `611965`) → T3 menampilkan fasilitas "Puskesmas Contoh A" dan daftar kunjungan tanpa nama pasien.
      • Pindai kode manual Pasien Contoh 1 (`GWG7-RPQH-DZVS-FXDX-6AYQ-EYDN-0M`) → T5 terbuka menampilkan "QR Valid", nama "Budi", kebutuhan komunikasi tertulis, catatan pasien, dan tanpa diagnosis.
      • [Lihat Saran] → langkah placeholder jujur → [Selesai] → kembali ke `/petugas` dan kunjungan baru muncul di T3 sebagai rujukan `#A6E0` "Belum dicatat".
      • Riwayat Back peramban diuji: tidak membocorkan data pasien (tetap di `/petugas`).
      • Kode acak 26 karakter diuji: banner galat generik 422 K-4 "QR Tidak Dapat Dipakai" + [Pindai lagi] mengosongkan input dan mengembalikan fokus.
      • `/s#<token>` dengan sesi petugas: URL hash bersih seketika dan T5 terbuka otomatis.
      • `/s#<token>` tanpa sesi: kartu informasi publik tampil tanpa request ke server dan hash bersih seketika.
      • Log server dev selama semua pengujian diverifikasi: 0 token mentah, kode manual, atau nama panggilan bocor.
      • Dev Audit Panel pada T3, T4 (galat & manual), T5, dan /s: 0 pelanggaran axe, semua target sentuh ≥ 48×48 px, 0 scroll horizontal pada lebar 320 px dan zoom teks 200%.
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 7: 1/2.
- Bagian 7b (2 dari 2 / Prompt 14 — T6 Saran Tindakan, T8 Catat Bantuan ≤3 Ketukan, T9 Konfirmasi di Tempat):
  - Migrasi Database 008 (`008_visits_subject_and_rules.sql`):
    - Menambah `visits.subject_ref` dengan referensi FK ke `users(audit_subject_id)`, trigger otomatis `set_visit_subject_ref()`, dan backfill data kunjungan lama.
    - Menambah `visits.recorded_rule_ids uuid[] DEFAULT '{}'` untuk menyimpan ID aturan akomodasi yang dikunci pada versi saat pelayanan diberikan, dan backfill dari `recorded_need_codes`.
    - Diterapkan secara idempoten pada database pengembangan (`aksespass_dev`) dan database pengujian (`aksespass_test`).
  - Smart Accommodation Engine (`src/lib/accommodation`):
    - `getPublishedRules(needCodes)`: membaca aturan akomodasi yang berstatus `published` dari basis data hanya untuk kode kebutuhan yang dibagikan.
    - Fungsi murni `buildSuggestions(rules, needCodes)`: menggabungkan teks duplikat, mengurutkan berdasarkan urutan kanonikal kategori, dan memisahkan kebutuhan tanpa aturan sebagai `uncoveredNeeds`.
    - Route handler `POST /api/petugas/saran` dilindungi sesi petugas.
  - Pencatatan Bantuan Petugas (`src/lib/visits`):
    - `recordAssistance`: memvalidasi kunjungan milik fasilitas petugas (RLS), menolak pencatatan ulang (409 Conflict: "Kunjungan ini sudah dicatat"), memvalidasi bahwa seluruh aturan berstatus `published`, menolak catatan > 280 karakter, meng-update baris kunjungan secara idempoten (`recorded_at`), dan mencatat audit `visit_recorded` (pelaku petugas, fasilitas, `subject_ref` pasien, TANPA isi catatan).
    - Route handler `POST /api/petugas/kunjungan/catat` dilindungi sesi petugas.
  - Resolusi Kepemilikan CareProof (`src/lib/careproof`):
    - `confirmVisit(actor, visitId, input)`: memvalidasi status (`terpenuhi`, `sebagian`, `belum`), memvalidasi bahwa `unmetNeedCodes` adalah subset kebutuhan sah, memverifikasi bahwa kunjungan telah dicatat (`recorded_at IS NOT NULL`).
    - Aturan kepemilikan §9: jawaban pasien adalah penentu utama. Pasien dapat menimpa jawaban konfirmasi di tempat atau pendamping; konfirmasi di tempat atau pendamping TIDAK boleh menimpa jawaban pasien (409 Conflict: "Pasien sudah mengonfirmasi").
    - Mencatat audit `visit_confirmed` dengan `confirmed_by`, tanpa isi jawaban.
    - Route handler `POST /api/petugas/kunjungan/konfirmasi` dilindungi sesi petugas.
  - Komponen & Antarmuka Alur Pemindaian (`src/components/petugas-pindai-flow.tsx` & `src/components/text-field.tsx`):
    - `TextField`: varian baru `variant="textarea"`, `rows`, dan live counter karakater (`current / maxLength`) dengan kepatuhan `aria-live="polite"`.
    - T6 Saran Tindakan: label disclaimer klinis "Saran, bukan instruksi klinis. Keputusan tetap di tangan tenaga kesehatan.", kartu saran dengan ikon, teks besar, versi, dan sumber aturan, panduan panggilan visual langsung, dan tombol [Lanjut: Catat Bantuan].
    - T8 Catat Bantuan: saran T6 disajikan melalui `ChoiceGroup` dengan semua opsi tercentang di awal [Usulan], instruksi "Hapus centang bantuan yang tidak diberikan.", catatan bebas opsional dengan teks bantuan "Jangan menulis diagnosis atau data sensitif."
    - Hitung ketukan T8: hapus centang 1 opsi (ketukan 1) + [Simpan] (ketukan 2) = 2 ketukan (≤ 3 ketukan). Tombol memiliki `aria-busy` dan cegah double-click.
    - T9 Kirim Permintaan Konfirmasi: ringkasan bantuan yang dicatat, tombol [Kirim ke Pasien] / [Selesai dan Kembali ke Beranda] (berpindah ke T3 dengan status "Menunggu konfirmasi"), dan tombol [Konfirmasi di Tempat] yang menampilkan `CareProofScale` untuk pasien di perangkat petugas.
    - Konfirmasi di Tempat: bila pasien memilih "Sebagian" atau "Belum", daftar kebutuhan belum terpenuhi tampil dinamis dari kebutuhan pemindaian ini; setelah disimpan, T3 menampilkan "Dikonfirmasi: Sebagian (di tempat)".
  - Bukti Verifikasi:
    - Vitest: 190 tes di 22 test file lolos 100% (termasuk tes unit `accommodation.test.ts`, `visits.test.ts`, `careproof.test.ts`, dan tes arsitektur `architecture.test.ts` yang memverifikasi tabel `visits` dan `visit_confirmations` hanya disentuh oleh modul yang diizinkan).
    - DevTools Browser Ujung ke Ujung:
      • Masuk petugas seed A (`+620000000011`) → T3 menampilkan fasilitas "Puskesmas Contoh A".
      • Kunjungan 1 (Pasien 1, Tuli): pemindaian token manual → T5 kebutuhan terbuka → [Lihat Saran] → T6 menampilkan 4 aturan akomodasi spesifik Tuli (BISINDO, bicara hadap, instruksi tertulis, panggilan visual) lengkap dengan nomor versi 1 dan sumber komunitas → [Lanjut: Catat Bantuan] → T8 semua tercentang di awal → uncheck BISINDO (ketukan 1) + isi catatan sintetis unik `SYNTHETIC_STAFF_SECRET_MARKER_9981` + [Simpan] (ketukan 2, total 2 ketukan ≤ 3) → T9 ringkasan menampilkan 3 bantuan tersimpan + [Selesai dan Kembali ke Beranda] → T3 menampilkan kunjungan berstatus "Menunggu konfirmasi".
      • Kunjungan 2 (Pasien 2, Autistik): pemindaian token manual → T5 terbuka → T6 menampilkan 3 aturan akomodasi (papan gambar, ruang tenang, langkah bertahap) → T8 simpan → T9 [Konfirmasi di Tempat] → pilih "Sebagian" pada CareProofScale → pilih kebutuhan belum terpenuhi "Area tunggu yang lebih tenang" → [Kirim Jawaban di Tempat] → banner sukses konfirmasi di tempat → kembali ke beranda → T3 menampilkan "Dikonfirmasi: Sebagian (di tempat)".
      • Verifikasi Privasi Log & Audit: penanda sintetis `SYNTHETIC_STAFF_SECRET_MARKER_9981` diperiksa pada tabel `audit_events` (0 kebocoran) dan berkas log server `.next` (0 kebocoran). Audit `visit_recorded` tercatat bersih dengan `subject_ref` tanpa teks catatan.
      • Dev Audit Panel: 0 pelanggaran axe, semua elemen interaktif memenuhi target sentuh ≥ 48×48 px, 0 scroll horizontal pada lebar 320 px dan zoom teks 200% pada T6, T8 (dengan/tanpa catatan), T9, dan skala konfirmasi di tempat. Alur dapat diselesaikan penuh dengan keyboard.
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 7: SELESAI (2/2).

---

## Bagian 8 — CareProof dan Dashboard

**Tujuan:** P-07 dan A-02 (Must); P-08, A-03, A-04 bila waktu ada.
**Layar:** P16–P17, A3, A6 (Must); A7–A8 (Should).
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §9 (resolusi CareProof), §11.

**Checklist**
- [x] P16 skala tiga ikon; daftar kebutuhan belum terpenuhi bila "sebagian/belum"; `confirmed_by` tersimpan.
- [ ] P17 ringkasan dan status tindak lanjut (label sesuai K-9). *(Hanya ringkasan dibangun; status tindak lanjut P-08 TIDAK dibuat hari ini — bergantung tabel `follow_ups` dan layar A8 yang belum ada.)*
- [x] A3 ringkasan bulan berjalan; A6 Accommodation Fulfillment Rate + tren + per kategori, sub-metrik pendamping dan di tempat terpisah.
- [ ] A7 kategori belum terpenuhi; A8 tindak lanjut (Should). *(Tidak dibuat hari ini sesuai cakupan Prompt 15 — Should, ditunda.)*
- [x] Ambang kelompok kecil sesuai K-10 (= 5, per jumlah pasien berbeda, ditegakkan di dalam database).

**Verifikasi**
- [x] Tes: tanpa jawaban = "belum dikonfirmasi", tidak dihitung terpenuhi.
- [x] Tes perhitungan Fulfillment Rate dengan data seed yang hasilnya sudah dihitung manual.
- [x] Tes: kelompok di bawah ambang tidak ditampilkan.
- [x] Tes: respons API dashboard tidak memuat ID, nama, atau kontak pasien.
- [x] Tes: admin tidak bisa membaca profil pasien (RLS + layanan). *("brief" belum ada sebagai tabel di skema hari ini — tidak dapat diuji; lihat Bagian 2 Catatan hasil.)*
- [x] Grafik: label teks dan angka tersedia, bukan hanya warna (kode memastikan batang `aria-hidden` dan angka selalu dirender; tabel ber-caption dan berkepala kolom terbukti di browser).
- [x] Browser ujung ke ujung: kunjungan tercatat → masuk sebagai pasien → P4 menampilkan menunggu konfirmasi → P16 pilih "Sebagian" + kebutuhan belum terpenuhi → P17 tersimpan → masuk sebagai petugas → T3 menampilkan "Dikonfirmasi: Sebagian (oleh pasien)".
- [x] Browser: `/admin` dan `/admin/dashboard` untuk Admin Fasilitas A menampilkan angka agregat seed & sel kecil "Disembunyikan..."; Admin Fasilitas B terisolasi hanya melihat data Klinik Contoh B.
- [x] Dev Audit Panel pada `/pasien/konfirmasi`, P16 (keadaan Sebagian), P17, `/admin`, `/admin/dashboard`: 0 pelanggaran axe, semua elemen interaktif ≥ 48×48 px, 0 scroll horizontal pada 320 px dan zoom teks 200%.
- [x] Log server selama pengujian diverifikasi bersih tanpa ID pasien maupun nama pasien.
- [x] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**
- Prompt 15 (Bagian 8 — CareProof Pasien P16/P17 minimal + Dashboard Admin A3/A6), selesai **13 Okt 2026 22:35 WIB**:
  - Migrasi Database 009 (`009_facility_dashboard.sql`): fungsi `get_facility_dashboard(p_year, p_month)` `SECURITY DEFINER`, dimiliki `aksespass_owner`, `SET search_path = public, pg_temp`, `EXECUTE` hanya `aksespass_app`. Hanya berjalan bila `app_role() = 'facility_admin'`; fasilitas selalu dari `app_facility_id()` (tanpa parameter facility). Mengembalikan `NULL` fail-closed untuk peran lain. Ambang K-10 (5 pasien berbeda per sel) ditegakkan di dalam fungsi; sel 1–4 pasien → `{"hidden": true}` tanpa angka; sel 0 pasien → `0` (bukan risiko re-identifikasi, lihat `architecture.md` §6).
  - `src/lib/dashboard`: `getFacilityDashboard(session, period)` memanggil fungsi lewat `withContext`; menolak peran non-`facility_admin` (`DashboardError` 403) sebelum menyentuh DB. Modul ini tidak pernah melakukan query langsung ke `visits`/`visit_confirmations`/profil pasien (dipastikan oleh tes arsitektur yang sudah ada untuk kedua tabel pertama). `DASHBOARD_MIN_GROUP_SIZE = 5` di `src/db/index.ts` dipakai untuk teks UI, disalin manual dari `v_threshold` pada migrasi 009.
  - `src/lib/careproof`: tambahan `listOwnConfirmations(session)` (kunjungan tercatat 30 hari terakhir milik pasien sendiri yang belum dikonfirmasi atau dijawab pendamping/di tempat) dan `getOwnConfirmableVisit(session, visitId)` (detail satu kunjungan, 404 seragam bila bukan milik pasien). Kebutuhan yang belum terpenuhi pada ChoiceGroup P16 difilter ke kategori yang relevan dengan kunjungan (dari `shared_fields` consent atau kategori aturan bantuan yang dicatat), bukan seluruh paspor pasien.
  - Data seed (`scripts/db-seed.mjs`): ditambahkan Pasien Contoh 5–8 (`stats_consent = true`) dengan kunjungan Oktober 2026 di Puskesmas Contoh A agar bulan berjalan memiliki ≥ 5 pasien berbeda (total 7: Pasien Contoh 1/2/3/5/6/7/8) dan kategori `sensorik_lingkungan` tepat 5 pasien berbeda; tautan pendamping sintetis tambahan Pendamping Contoh 1 → Pasien Contoh 7 agar konfirmasi `companion` berasal dari pendamping yang benar-benar tertaut. Pasien Contoh 4 (TIDAK setuju statistik) dipertahankan untuk tes pengecualian. Seluruh 24 kunjungan seed kini memiliki `recorded_rule_ids` terisi (backfill otomatis dari `recorded_need_codes`, mengikuti logika migrasi 008) agar P16 dapat menampilkan daftar bantuan yang dicatat.
  - A6 `/admin/dashboard`: filter 3 periode (bulan berjalan + 2 sebelumnya) sebagai tautan GET; AFR besar (angka + teks "N% kunjungan kebutuhannya terpenuhi"); tabel tren ber-caption dengan batang CSS `aria-hidden` (angka selalu tertulis terpisah dari batang); tabel rincian status, rincian penjawab (keterangan tetap "Jawaban pendamping dan di tempat ditandai terpisah"), dan rincian kategori; sel tersembunyi tertulis "Disembunyikan (kurang dari 5 pasien)"; periode kosong tertulis "Belum ada data kunjungan"; keterangan tetap privasi di awal halaman. Wadah tabel dilengkapi `tabIndex={0}` dan `aria-label` mandiri tanpa konflik `role="region"` ganda.
  - A3 `/admin`: ringkasan bulan berjalan (kunjungan, AFR, jumlah kategori kebutuhan belum terpenuhi) dari fungsi yang sama; tombol ke A6; **A4 dan A7 tidak ditampilkan** sesuai cakupan hari ini.
  - P16 `/pasien/konfirmasi` (daftar) dan `/pasien/konfirmasi/[visitId]` (detail dengan `CareProofScale` + `ChoiceGroup`, pesan "Jawaban Anda menggantikan jawaban pendamping/di tempat" bila jawaban sebelumnya bukan dari pasien) → `POST /api/pasien/kunjungan/konfirmasi` → P17 `/pasien/konfirmasi/selesai` (`StatusBanner` sukses + ringkasan status dan kebutuhan belum terpenuhi + [Kembali ke Beranda]). Kartu "Konfirmasi Kunjungan" di P4 menampilkan jumlah menunggu, hanya muncul bila > 0.
  - **Bukti Verifikasi Lengkap:**
    - Vitest: 208 tes di 24 test file lolos 100% (termasuk 11 tes `src/lib/dashboard/dashboard.test.ts`, 6 tes `careproof.test.ts`, 4 tes route handler `konfirmasi-routes.test.ts`, dan tes arsitektur `architecture.test.ts`).
    - Verifikasi Browser Ujung ke Ujung (Chrome DevTools MCP):
      • Alur Pasien P16→P17: login Pasien Contoh 1 (`+620000000001`) → P4 menampilkan 2 menunggu konfirmasi → buka `/pasien/konfirmasi` → pilih kunjungan Puskesmas Contoh A (12 Okt 2026) → P16 bantuan tercatat tampil → pilih radio "Sebagian" → ChoiceGroup 4 kebutuhan muncul dinamis → pilih "Komunikasi dengan BISINDO" → [Kirim] → P17 menampilkan `StatusBanner` hijau "Terima kasih, jawaban tersimpan", ringkasan "Status kebutuhan: Sebagian", dan "Kebutuhan yang belum terpenuhi: Komunikasi dengan BISINDO".
      • Pembuktian Refleksi ke Petugas (T3): login Petugas Contoh Aktif A (`+620000000011`) → T3 menampilkan rujukan `#9120` dengan badge jelas `"Dikonfirmasi: Sebagian (oleh pasien)"`.
      • Alur Admin Faskes A (A3 & A6): login Admin Fasilitas A (`+620000000021`) → `/admin` menampilkan "Puskesmas Contoh A", Kunjungan 8, AFR 25%, Kebutuhan Belum Terpenuhi 5 → buka `/admin/dashboard` → AFR 25%, tren bulanan Oktober 8 kunjungan (Agustus/September "Disembunyikan (kurang dari 5 pasien)"), rincian status (Sebagian: 5; Terpenuhi & Belum: Disembunyikan), rincian penjawab (Pasien: 6; Pendamping & Di tempat: Disembunyikan), rincian kategori (Sensorik dan Lingkungan: 5; Komunikasi: Disembunyikan; lainnya: 0).
      • Isolasi Akses Admin Faskes B: login Admin Fasilitas B (`+620000000022`) → `/admin` menampilkan "Klinik Contoh B", bulan berjalan "Disembunyikan (kurang dari 5 pasien berbeda)"; `/admin/dashboard` hanya memuat data Klinik Contoh B tanpa membocorkan Puskesmas Contoh A.
      • Dev Audit Panel: 0 pelanggaran axe, semua elemen interaktif ≥ 48×48 px, 0 scroll horizontal pada 320 px dan zoom teks 200% pada `/pasien/konfirmasi`, P16, P17, `/admin`, dan `/admin/dashboard`.
      • Audit Kebocoran Log: pemeriksaan berkas log server menghasilkan 0 kemunculan UUID maupun nama pasien contoh.
    - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos 100%. Status Bagian 8: SELESAI.
    - Tes "admin tidak bisa membaca brief" tidak dapat dijalankan karena tabel `follow_ups`/`briefs` belum ada di skema hari ini (lihat Bagian 2); hanya `patient_profiles`/`visits`/`visit_confirmations` yang diverifikasi 0 baris.
  - **Keputusan/Asumsi yang masih menunggu persetujuan:**
    - Pengecualian sel 0-pasien dari ambang suppression (ditampilkan sebagai `0`, bukan "Disembunyikan") adalah keputusan desain saya berdasarkan praktik standar suppression statistik (sel kosong bukan risiko re-identifikasi) — belum dikonfirmasi pemilik produk, ditandai **[Usulan]** di `architecture.md` §6.
    - Kategori unmet-need di P16 difilter berdasarkan gabungan `shared_fields` consent dan kategori aturan bantuan tercatat (bukan seluruh paspor pasien) — juga **[Usulan]**, karena spesifikasi tidak merinci sumber data persis untuk "kategori yang dibagikan pada kunjungan itu".
  - Garis potong 21:30 pada spesifikasi Prompt 15 tidak relevan untuk sesi agent ini (tanpa jam dinding nyata); seluruh cakupan Must (P-07, A-02) selesai dengan bukti kode dan tes otomatis. **Rekomendasi:** Prompt 16 dapat dilanjutkan, dengan catatan verifikasi visual/browser Bagian 8 di atas masih perlu dilakukan manusia sebelum demo.

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
