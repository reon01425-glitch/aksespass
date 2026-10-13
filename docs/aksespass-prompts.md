# AKSESPASS — Kumpulan Prompt Implementasi (Prompt 1–17 + Showcase)

Dibuat: 13 Oktober 2026. Status saat file dibuat (15:15 WIB): Prompt 1–6 sudah ter-commit; Prompt 7 sedang berjalan.

> **Simpan file ini DI LUAR repo dan folder proyek**, supaya tidak ikut terbaca agent (menghemat token) dan tidak ikut ter-commit.

## Cara pakai

- Satu prompt = satu sesi baru. Tempel body prompt apa adanya.
- Jalankan berurutan. Setiap prompt memeriksa bahwa prompt sebelumnya sudah ter-commit; bila belum, prompt berhenti.
- Bila verifikasi gagal, prompt berhenti dan melapor. Jangan lanjut ke prompt berikutnya sebelum masalahnya jelas.
- Kotak waktu mengikuti bagian "Jalur 13 Okt 2026" di `docs/implementation-plan.md` (tenggat 23:59 WIB).
- **Garis potong:** bila pukul 21:30 Prompt 15 belum lolos verifikasi, lewati Prompt 16 dan langsung ke Prompt 17.
- **Showcase** (Lampiran) boleh dijalankan kapan saja di sesi terpisah; aman paralel dengan prompt yang sedang berjalan.

## Daftar prompt (HEAD)

| # | Judul prompt | Bagian | Jam |
| :--- | :--- | :--- | :--- |
| 1 | Commit baseline dokumen sebelum kode dimulai | — | 13:05 |
| 2 | Scaffold Next.js + design token + font lokal + skrip lint/typecheck/test/build | 1 | 13:15–14:00 |
| 3 | Skema Postgres lokal, migrasi SQL, dan seed data sintetis | 2 | 14:00–14:35 |
| 4 | RLS per transaksi, peran audit append-only, tabel rate limit dan OTP + tes database | 2 | 14:35–15:00 |
| 5 | `lib/audit`, `lib/privacy`, dan penguncian helper transaksi RLS | 3 | 15:00–15:30 |
| 6 | `lib/auth`: sesi cookie, guard peran/fasilitas, OTP tiruan, middleware tanpa DB | 3 | 15:30–16:00 |
| 7 | `lib/consent` + `POST /api/scan` + matriks tes izin dan kebocoran | 3 | 16:00–16:30 |
| 8 | Komponen UI bersama + halaman katalog + uji axe | 4 | 16:30–17:15 |
| 9 | Layar masuk dan akun: P1–P4, T1–T3, A1–A2 | 5 | 17:15–18:00 |
| 10 | MyCare Passport: editor dan pratinjau (P5–P6) | 6 | 18:00–18:30 |
| 11 | ConsentQR: pilih fasilitas, field, masa berlaku, tampilan QR, cabut (P9, P11–P12) | 6 | 18:30–19:00 |
| 12 | Kontrol akses: riwayat akses dan daftar QR aktif (P18–P20) | 6 | 19:00–19:15 |
| 13 | Petugas: pindai kamera/kode manual dan layar kebutuhan (T3–T5) | 7 | 19:15–19:50 |
| 14 | Petugas: saran tindakan, catat bantuan ≤3 ketukan, kirim konfirmasi (T6, T8–T9) | 7 | 19:50–20:30 |
| 15 | CareProof pasien + dashboard admin (P16, A3, A6) | 8 | 20:30–21:30 |
| 16 | Pendamping: akun, tautan, persetujuan, kelola dan konfirmasi atas nama pasien (D1–D8, P21) | 10A | 21:30–22:45 |
| 17 | Skenario demo, uji ulang menyeluruh, dan daftar klaim berbukti | 11 | 22:45–23:45 |
| S | Showcase progres — aman dijalankan paralel | — | kapan saja |
| — | *(Setelah hari ini)* Deploy ke Vercel: penyedia Postgres, env, region UU PDP | — | — |

---

## Prompt 1

```text
# Prompt 1 — Commit baseline dokumen sebelum kode dimulai

Konteks: repository AKSESPASS baru berisi dokumen. Hari ini (13 Okt 2026) dokumen sudah dirapikan dan belum di-commit. Tugas ini HANYA membuat commit baseline. Jangan mengubah isi file apa pun.

Langkah:
1. Jalankan `git status` dan `git diff --stat`. Pastikan perubahan yang ada hanya:
   - Diubah: CLAUDE.md, architecture.md, design.md
   - Dihapus: "docs(tidak perlu baca drainproof dan ganti rawat).pdf" (sudah dipindah ke docs/archive/gabungan-asli.pdf)
   - Baru: docs/ (proposal.md, user-stories.md, user-flows.md, implementation-plan.md, archive/)
   Kalau ada file lain di luar daftar ini, BERHENTI dan laporkan; jangan ikut di-commit.
2. Pastikan tidak ada rahasia yang ikut: tidak ada file .env, kunci, atau token. Jangan membaca isi PDF di docs/archive/.
3. Stage per path (jangan `git add -A`): CLAUDE.md, architecture.md, design.md, docs/, dan penghapusan PDF lama.
4. Commit dengan pesan:
   docs: baseline dokumen sebelum implementasi

   - konversi PDF ke docs/proposal.md, user-stories.md, user-flows.md
   - arsip PDF di docs/archive/
   - sinkronisasi architecture.md (§2, §3 A8 + aturan siap serverless, §6, §7, §11, §13, §15)
   - perbaikan design.md v0.5
   - rencana implementasi dan peta tugas di CLAUDE.md
5. Jangan push.

Verifikasi (laporkan output-nya):
- [ ] `git status` bersih.
- [ ] `git show --stat HEAD` hanya berisi file dari langkah 1.
- [ ] `git log --oneline -3` menampilkan commit baru di atas 4912517.

Laporan akhir: hash commit, daftar file, dan hasil ketiga verifikasi.
```

---

## Prompt 2

```text
# Prompt 2 — Scaffold Next.js + design token + font lokal + skrip lint/typecheck/test/build

Konteks: AKSESPASS, prototipe Hackathon dengan tenggat hari ini 23:59 WIB. Ini Bagian 1 dari docs/implementation-plan.md. Kotak waktu: 13:15–14:00.

Baca HANYA:
- docs/implementation-plan.md: bagian "Jalur 13 Okt 2026" dan "Bagian 1".
- design.md §2C (token), §3 (tipografi), §1 (prinsip).
- architecture.md §3 (A1, A8, "Lokal dulu", "Aturan siap serverless"), §5 (struktur), §13 baris Header, §14.
Jangan membaca docs/archive/, proposal.md, atau user-flows.md untuk tugas ini.

Batasan:
- Tidak ada fitur, database, auth, atau halaman produk di prompt ini.
- Dependensi yang boleh: yang dibawa create-next-app (Next.js, React, TypeScript, Tailwind, ESLint), lucide-react, dan vitest. JANGAN menambah library lain; axe-core dipasang nanti di Prompt 8. Kalau butuh library lain, BERHENTI dan tanya.
- Package manager: pnpm.
- Jangan menimpa atau mengubah file .md yang sudah ada, kecuali checklist di implementation-plan.md (langkah terakhir).

Langkah:
1. Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint, folder `src/`, alias `@/*`) di root repo. Kalau create-next-app menolak karena folder tidak kosong, scaffold di folder sementara di luar repo lalu pindahkan hasilnya ke root. Jangan sampai README atau .gitignore bawaan menimpa file yang ada tanpa dicek.
2. TypeScript `strict: true`.
3. Skrip package.json dengan nama TETAP (prompt berikutnya bergantung pada nama ini): `dev`, `lint`, `typecheck` (tsc --noEmit), `test` (vitest run), `build`.
4. Font: Atkinson Hyperlegible Next lewat `next/font/google` (di-host sendiri saat build), hanya bobot 400 dan 700, `display: "swap"`, dipasang sebagai font utama. Kalau font ini tidak tersedia di next/font/google, BERHENTI dan laporkan; jangan ganti font lain.
5. Token: salin CSS variable dari design.md §2C apa adanya ke globals.css, lalu hubungkan ke Tailwind sesuai versi Tailwind yang terpasang (cek versinya; v4 lewat @theme, v3 lewat config). Jangan menambah warna di luar token.
6. Gaya dasar: ukuran teks dalam rem; body memakai bg-page dan text-main; focus ring terlihat untuk :focus-visible; aturan global prefers-reduced-motion yang mematikan animasi dan transisi; tidak ada font-weight selain 400 dan 700.
7. Header keamanan di next.config: Content-Security-Policy dasar (default-src 'self'; catat di README bila dev mode butuh pelonggaran), Referrer-Policy: no-referrer, X-Content-Type-Options: nosniff. CSP berbasis nonce ditunda; catat sebagai sisa pekerjaan.
8. Satu halaman beranda placeholder: H1 "AKSESPASS", satu paragraf, satu tombol contoh bergaya Primary Button design.md §4A. Tanpa data, tanpa analitik.
9. Satu tes contoh Vitest untuk fungsi utilitas kecil (misalnya fungsi yang mengembalikan daftar token), supaya `test` berjalan nyata.
10. .gitignore mencakup node_modules, .next, .env*, kecuali .env.example. Buat .env.example berisi DATABASE_URL= (kosong) untuk Prompt 3.
11. README singkat: prasyarat (Node, pnpm, PostgreSQL 16 lokal), cara install, perintah dev/lint/typecheck/test/build, dan catatan "data pasien nyata dilarang; gunakan data sintetis".

Verifikasi (semua wajib, sertakan bukti):
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` dijalankan dan lolos (tempel ringkasan output).
- [ ] Jalankan `pnpm build && pnpm start`, lalu `curl -I http://localhost:3000`: header CSP, Referrer-Policy, dan X-Content-Type-Options terlihat.
- [ ] Di browser, halaman beranda pada lebar 320 px tidak punya horizontal scroll.
- [ ] Zoom teks 200%: teks tidak terpotong.
- [ ] Network: file font dimuat dari localhost; tidak ada request ke fonts.googleapis.com atau fonts.gstatic.com saat runtime; hanya bobot 400 dan 700.
- [ ] Tombol contoh: fokus keyboard (Tab) menampilkan focus ring.
- [ ] `grep -rn "font-medium\|font-semibold" src` tidak menemukan apa pun.

Kalau ada verifikasi gagal dan tidak bisa diperbaiki dalam kotak waktu: BERHENTI, jangan centang, laporkan apa yang gagal.

Selesai:
1. Di docs/implementation-plan.md: centang checklist dan verifikasi Bagian 1 yang terbukti, isi "Catatan hasil" (ringkas: versi Next/Tailwind, keputusan kecil yang diambil, sisa pekerjaan seperti CSP nonce), ubah status Bagian 1 di tabel.
2. Commit (jangan push), pesan: "chore: scaffold Next.js, design token, font lokal, dan skrip pemeriksaan (Bagian 1)".
3. Laporan akhir: file utama yang dibuat, perintah yang dijalankan dan hasilnya, verifikasi yang belum bisa dilakukan, dan keputusan yang perlu persetujuan.
```

---

## Prompt 3

```text
# Prompt 3 — Skema Postgres lokal, migrasi SQL, dan seed data sintetis

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Ini paruh pertama Bagian 2 di docs/implementation-plan.md. Kotak waktu: 14:00–14:35. Prompt 2 (scaffold) harus sudah selesai dan ter-commit; kalau belum, BERHENTI.

Baca HANYA:
- docs/implementation-plan.md: "Jalur 13 Okt 2026" dan "Bagian 2".
- architecture.md §3 ("Lokal dulu", "Aturan siap serverless"), §6, §11 (poin hapus akun/pseudonim), §13 baris catatan bebas petugas.
- docs/user-flows.md HANYA layar P5, P11, P16, T8 (untuk kategori kebutuhan, field consent, status konfirmasi, catatan petugas).

Batasan:
- Dependensi baru yang boleh: `pg` dan `@types/pg`. Tidak ada ORM, tidak ada tsx/ts-node. Skrip DB ditulis sebagai .mjs (Node ESM).
- Tidak ada RLS, peran DB, rate limit, atau OTP di prompt ini (itu Prompt 4).
- TIDAK ADA kolom diagnosis di tabel mana pun. Tidak ada data yang menyerupai orang nyata.
- Jangan menyentuh database selain aksespass_dev dan aksespass_test di localhost.

Langkah:
1. Cek PostgreSQL 16 lokal dengan `pg_isready`. Kalau tidak berjalan, BERHENTI dan minta saya menyalakannya; jangan mengubah layanan sistem sendiri.
2. Buat database lokal aksespass_dev dan aksespass_test (kalau belum ada).
3. Env: tambahkan ke .env.example `DATABASE_ADMIN_URL=` dan `DATABASE_ADMIN_URL_TEST=` (untuk migrasi/seed; Prompt 4 menambah URL peran aplikasi). Isi nilai nyata hanya di .env.local yang di-gitignore.
4. Runner migrasi sederhana:
   - File SQL berurutan di `src/db/migrations/NNN_nama.sql`.
   - `scripts/db-migrate.mjs`: menjalankan file yang belum tercatat di tabel `schema_migrations`, masing-masing dalam satu transaksi.
   - `scripts/db-seed.mjs`: seed deterministik dan idempoten.
   - `scripts/db-reset.mjs`: drop dan buat ulang schema. WAJIB menolak jalan bila host bukan localhost/127.0.0.1 atau nama DB tidak berakhiran _dev atau _test.
   - Skrip package.json: `db:migrate`, `db:seed`, `db:reset`. Masing-masing bisa diarahkan ke DB test lewat env.
5. Migrasi 001 — tabel untuk cakupan hari ini (UUID dengan gen_random_uuid(), waktu timestamptz, enum memakai CHECK pada text):
   - facilities (nama, status).
   - users (peran: patient/companion/staff/facility_admin/curator; phone dan email opsional dan unik; display_name; status; stats_consent boolean default false; audit_subject_id uuid unik — pengenal pseudonim untuk audit sesuai §11).
   - staff_memberships (petugas → satu fasilitas, unik per petugas; unit; status invited/active/inactive).
   - needs_catalog (code, label, ikon Lucide, kategori: komunikasi, penglihatan, pendengaran, mobilitas, sensorik_lingkungan, pendampingan).
   - patient_profiles (user pasien, nama panggilan, catatan bebas pasien dengan batas panjang, penanda perubahan terakhir oleh pendamping) + patient_profile_needs (profil ↔ need code) untuk integritas referensi.
   - accommodation_rules (need code pemicu, teks saran pendek, ikon, sumber/alasan, versi, status draft/in_review/published, tanggal terbit, pengesah).
   - consents (pasien, fasilitas tujuan, shared_fields text[] tidak kosong — isinya kategori kebutuhan dan/atau `catatan_pasien`; nama panggilan selalu ikut; valid_from, valid_until, dibuat oleh siapa).
   - consent_qr (token_hash unik — TIDAK ada kolom token asli; consent_id, expires_at, revoked_at).
   - companions (pasien, pendamping, status pending/active/revoked, waktu disetujui/dicabut).
   - visits (pasien, fasilitas, petugas, consent opsional, jalur qr/kartu, kode bantuan yang dicatat, catatan petugas dengan CHECK panjang maksimum, client_id unik, created_at, synced_at).
   - visit_confirmations (visit unik, status terpenuhi/sebagian/belum, kode kebutuhan belum terpenuhi, confirmed_by patient/companion/on_site, waktu).
   - audit_events (bigserial, event_type, actor_id, actor_role, subject_ref = audit_subject_id pasien bila ada, facility_id, fields text[] untuk nama field yang dibuka, occurred_at). Tanpa kolom bebas jsonb.
   Tabel briefs, follow_ups, emergency_delegations, recovery_requests TIDAK dibuat hari ini.
6. Seed sintetis (semua label jelas "contoh"):
   - 2 fasilitas: "Puskesmas Contoh A", "Klinik Contoh B".
   - Per fasilitas: 1 petugas aktif, 1 admin fasilitas. Fasilitas A tambah 1 petugas nonaktif.
   - 4 pasien, satu per profil (Tuli, autistik, low vision/tunanetra, mobilitas), nama panggilan "Pasien Contoh 1–4", nomor telepon pola palsu yang jelas (mis. +62000000000X).
   - 1 pendamping tertaut aktif ke Pasien Contoh 4; 1 kurator.
   - Katalog kebutuhan per kategori (sekitar 12 item).
   - Aturan saran published untuk tiap kebutuhan utama sesuai contoh di docs/proposal.md fitur 3, ditambah 1 aturan draft (untuk tes "draft tidak tampil").
   - ±20 kunjungan historis tersebar 3 bulan terakhir dengan konfirmasi campuran (pasien, pendamping, di tempat; terpenuhi/sebagian/belum; beberapa tanpa konfirmasi) untuk dashboard nanti.
7. Tulis kredensial uji yang dibuat ke file seed/contoh, bukan di chat.
8. Catat di architecture.md §6 sebagai [Usulan]: tabel patient_profile_needs, daftar nilai shared_fields, dan audit_subject_id sebagai pseudonim.

Verifikasi (sertakan bukti):
- [ ] `db:reset` + `db:migrate` + `db:seed` pada aksespass_dev berhasil dari kosong.
- [ ] `db:migrate` dijalankan ulang = tidak ada perubahan.
- [ ] `db:reset` menolak saat DATABASE_ADMIN_URL diarahkan ke host bukan localhost (uji dengan URL palsu, jangan sampai terkoneksi).
- [ ] Query jumlah baris per tabel cocok dengan rencana seed (tempel hasilnya).
- [ ] `grep -rni diagnos src/db` tidak menemukan kolom atau data.
- [ ] Tes Vitest pada aksespass_test: catatan petugas melebihi batas ditolak; client_id duplikat ditolak; consent dengan shared_fields kosong ditolak; tidak ada kolom bernama token selain token_hash (cek information_schema).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos.

Selesai:
1. Update docs/implementation-plan.md: centang yang terbukti di Bagian 2 (bagian skema dan seed), isi Catatan hasil, status Bagian 2 = "setengah (Prompt 3)".
2. Commit (jangan push): "feat(db): skema, migrasi SQL, dan seed sintetis (Bagian 2a)".
3. Laporan: file dibuat, perintah dan hasil, keputusan skema yang diambil, sisa untuk Prompt 4.
```

---

## Prompt 4

```text
# Prompt 4 — RLS per transaksi, peran audit append-only, tabel rate limit dan OTP + tes database

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Paruh kedua Bagian 2. Kotak waktu: 14:35–15:00 (padat; bila mepet, prioritas: peran + RLS + tes RLS, baru rate limit/OTP). Prompt 3 harus sudah ter-commit; kalau belum, BERHENTI.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 2" (sisa checklist) dan verifikasi terkait RLS di "Bagian 3".
- architecture.md §2 (hak tiap peran), §3 ("Aturan siap serverless"), §6, §7 (urutan validasi pindai), §10 (otorisasi berlapis), §11.
- File migrasi dan seed dari Prompt 3.

Batasan:
- Tidak ada dependensi baru.
- Jangan menonaktifkan RLS untuk "mempermudah". Jangan memberi peran aplikasi SUPERUSER, BYPASSRLS, atau kepemilikan tabel.
- Konteks hanya lewat set_config(..., true) di dalam transaksi. Dilarang SET tingkat sesi.

Langkah:
1. Migrasi 002 — peran:
   - `aksespass_owner` (NOLOGIN, pemilik semua tabel; migrasi berjalan sebagai peran admin lokal lalu SET ROLE atau ALTER OWNER ke sini).
   - `aksespass_app` (LOGIN, dipakai aplikasi). Bukan superuser, NOBYPASSRLS, bukan pemilik.
   - Grant minimum per tabel. Khusus audit_events: aplikasi HANYA INSERT dan SELECT. Tabel katalog/aturan/fasilitas: aplikasi hanya SELECT.
   - Buat kata sandi dev acak untuk aksespass_app, simpan di .env.local (DATABASE_URL, DATABASE_URL_TEST). Di .env.example hanya placeholder. Jangan tulis kata sandi di chat.
2. Migrasi 003 — RLS aktif di semua tabel berisi data pengguna. Konteks dibaca dengan current_setting('app.user_id', true), 'app.role', 'app.facility_id', dan 'app.scan_token_hash'. Tanpa konteks = tidak ada baris. Kebijakan minimum:
   - users: baris sendiri; admin fasilitas melihat user petugas di fasilitasnya.
   - patient_profiles, patient_profile_needs: pasien pemilik; pendamping dengan tautan active; petugas HANYA bila app.scan_token_hash cocok dengan consent_qr yang belum kedaluwarsa, belum dicabut, dan consent-nya untuk app.facility_id. Penyaringan field tetap di lib/consent (Prompt 7).
   - consents, consent_qr: pasien pemilik dan pendamping aktif; petugas hanya baris consent_qr yang token_hash = app.scan_token_hash.
   - companions: pasien dan pendamping yang bersangkutan.
   - staff_memberships: baris sendiri; admin fasilitas yang sama.
   - visits, visit_confirmations: petugas fasilitas yang sama; pasien pemilik; pendamping aktif. Admin fasilitas TIDAK punya akses baris (agregat lewat fungsi SECURITY DEFINER di Prompt 15).
   - audit_events: INSERT bila ada konteks; SELECT hanya pasien untuk subject_ref = audit_subject_id miliknya.
   - Jalur login sebelum sesi ada tidak dibuat di sini; catat bahwa Prompt 6 akan memakai fungsi SECURITY DEFINER yang sempit.
3. Migrasi 004 — state yang tidak boleh di memori:
   - rate_limit_hits (key, window_start, count; PK gabungan; upsert atomik).
   - otp_codes (phone_hash, code_hash, expires_at, attempts, consumed_at). Kode asli tidak disimpan.
   - Grant sesuai kebutuhan; tidak berisi data pasien.
4. Helper di src/db: `withContext({userId, role, facilityId?, scanTokenHash?}, fn)` yang membuka transaksi, memanggil set_config(..., true) untuk semua kunci (kosongkan yang tidak dipakai), menjalankan fn, commit/rollback. Pool `pg` dari DATABASE_URL. Ekspor hanya helper ini untuk akses data pengguna; dokumentasikan di komentar singkat.
5. Setup tes: sebelum suite, reset + migrate + seed aksespass_test lewat URL admin, lalu semua tes memakai DATABASE_URL_TEST (peran aplikasi).

Verifikasi — tes Vitest, masing-masing lolos dan gagal sesuai yang diharapkan:
- [ ] Peran aplikasi: UPDATE dan DELETE pada audit_events → ditolak database (permission denied).
- [ ] pg_roles: aksespass_app bukan superuser, tanpa BYPASSRLS, bukan pemilik tabel.
- [ ] Tanpa konteks: SELECT patient_profiles, consents, visits = 0 baris.
- [ ] Pasien Contoh 1 hanya melihat profilnya sendiri; tidak melihat profil pasien lain.
- [ ] Petugas fasilitas A tidak melihat visits fasilitas B.
- [ ] Petugas tanpa scan_token_hash = 0 baris profil; dengan hash token valid untuk fasilitasnya = 1 baris; hash token consent fasilitas lain, kedaluwarsa, atau dicabut = 0 baris.
- [ ] Admin fasilitas: 0 baris dari patient_profiles, consents, visits.
- [ ] Pendamping aktif melihat profil Pasien Contoh 4; setelah status companions diubah ke revoked (lewat URL admin) = 0 baris.
- [ ] Kebocoran konteks: pada client pool yang SAMA, transaksi 1 dengan konteks petugas A, transaksi 2 tanpa konteks → transaksi 2 = 0 baris dan current_setting kosong.
- [ ] rate_limit_hits: dua upsert pada key dan jendela sama menghasilkan count 2, terbaca dari koneksi baru.
- [ ] `grep -rn "SET app\.\|SET SESSION" src` tidak menemukan SET tingkat sesi.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lolos.

Kalau ada tes RLS yang gagal: perbaiki kebijakannya, jangan melonggarkan tesnya. Kalau tidak selesai dalam kotak waktu, BERHENTI dan laporkan; jangan lanjut ke Prompt 5.

Selesai:
1. Catat di architecture.md §6/§10 sebagai [Usulan]: nama peran, daftar kunci konteks RLS, dan aturan "petugas membaca profil hanya dengan scan_token_hash".
2. Update docs/implementation-plan.md: centang Bagian 2 yang terbukti (termasuk dua butir siap-serverless), isi Catatan hasil, status Bagian 2 = selesai bila semua verifikasi lolos.
3. Commit (jangan push): "feat(db): peran, RLS per transaksi, audit append-only, rate limit dan OTP (Bagian 2b)".
4. Laporan: kebijakan yang dibuat per tabel (ringkas), hasil tiap tes, risiko yang tersisa.
```

---

## Prompt 5

```text
# Prompt 5 — `lib/audit`, `lib/privacy`, dan penguncian helper transaksi RLS

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 3 (1 dari 3) di docs/implementation-plan.md. Kotak waktu: 15:00–15:30. Prompt 4 harus sudah ter-commit dan semua tes RLS-nya lolos; kalau belum, BERHENTI.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 3".
- architecture.md §3 ("Aturan siap serverless"), §5, §11, §13.
- AGENTS.md bagian "Aturan arsitektur dan data".
- Kode: src/db (withContext dari Prompt 4) dan migrasi audit_events.

Batasan:
- Tidak ada dependensi baru. Tidak ada UI atau route handler fitur.
- withContext SUDAH dibuat di Prompt 4. Jangan membuat helper kedua; perkuat yang ada.

Langkah:
1. src/lib/privacy
   a. Logger tunggal — satu-satunya tempat yang boleh memanggil console. Pendekatan daftar izin: hanya kunci event, requestId, route, method, status, durationMs, errorCode, count yang diteruskan; kunci lain dibuang. Nilai string tetap disaring pola: nomor telepon (+62…, 08…), email, dan string mirip token (≥ 20 karakter base32/base64url).
   b. FORBIDDEN_LOG_FIELDS: nama panggilan, telepon, email, token, kode/OTP, catatan pasien/petugas, kebutuhan, shared_fields, diagnosis/diagnosa, IP.
   c. serializeError(err): hanya name, kode SQLSTATE, dan message yang sudah disaring. Buang detail, where, hint, parameter, dan teks query dari error pg (detail pg sering memuat nilai baris, mis. nomor telepon pada pelanggaran unik).
   d. Sink logger bisa diganti di tes untuk menangkap output.
2. ESLint: no-console = error di seluruh src kecuali file logger (tes dan scripts/ dikecualikan).
3. src/lib/http (modul kecil baru):
   - Respons JSON yang selalu memasang Cache-Control: no-store.
   - Pembungkus route handler: menangkap semua error, mencatat lewat logger + serializeError, mengembalikan galat generik. err.message tidak pernah dikirim ke klien, dan tidak ada error tak tertangkap yang dicetak Next beserta isinya.
   - Pemeriksa header Origin = APP_ORIGIN untuk request yang mengubah state. Tambahkan APP_ORIGIN ke .env.example.
4. Konstanta nama field yang boleh dibagikan (6 kategori kebutuhan, catatan_pasien, nama_panggilan) di satu modul bersama. Dipakai lib/audit sekarang dan lib/consent di Prompt 7.
5. src/lib/audit
   - recordAuditEvent(tx, event) hanya menerima client transaksi dari withContext (tipe bermerek; pool biasa tidak bisa dipakai). Audit selalu ikut transaksi aksinya: aksi gagal → audit batal; audit gagal → aksi batal.
   - Tipe event = union semua nama kejadian di architecture.md §11, divalidasi juga saat runtime.
   - fields hanya berisi nama dari konstanta langkah 4; nilai data tidak pernah diterima.
   - Tidak ada fungsi update atau delete.
6. Perkuat withContext:
   - Validasi sebelum set_config: role ∈ enum peran, ID berformat UUID, scanTokenHash heks 64 karakter atau kosong; selain itu tolak.
   - SET LOCAL statement_timeout = '5s' di setiap transaksi.
   - Pool tidak diekspor; yang diekspor hanya withContext dan tipe client transaksi.
   - Bila versi Next terpasang mendukung import "server-only" tanpa paket tambahan, pasang di src/db, src/lib/audit, src/lib/privacy. Bila butuh paket baru, lewati.
7. Tes arsitektur src/__tests__/architecture.test.ts (membaca file sumber, tanpa DB; akan ditambah prompt berikutnya):
   - pg hanya diimpor di src/db (selain skrip dan tes).
   - String audit_events hanya muncul di src/lib/audit, migrasi, dan tes.
   - console. hanya muncul di file logger (di dalam src, di luar tes).

Verifikasi (Vitest; sertakan bukti):
- [ ] Logger: kunci di luar daftar izin terbuang; telepon, email, dan string mirip token di dalam nilai tersamarkan.
- [ ] Error pg sungguhan (picu pelanggaran unik dengan nomor telepon sintetis di aksespass_test) terserialisasi tanpa nomor telepon itu.
- [ ] ESLint API: console.log(1) di file src/app/** → error; di file logger → tidak.
- [ ] Audit atomik: event dicatat lalu transaksi melempar error → tidak ada baris tersisa. Event tak dikenal di tengah transaksi → perubahan data di transaksi yang sama ikut batal.
- [ ] recordAuditEvent menolak nama event tak dikenal dan field di luar konstanta.
- [ ] withContext menolak role/ID tidak valid; SHOW statement_timeout di dalam transaksi = 5s.
- [ ] Pembungkus http: handler yang melempar error berisi data sintetis → klien menerima galat generik dengan Cache-Control: no-store; data sintetis tidak ada di respons maupun output logger.
- [ ] Origin asing pada request pengubah state → 403.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.

Selesai:
1. Catat di architecture.md §5 sebagai [Usulan]: modul src/lib/http dan modul konstanta field bersama.
2. implementation-plan.md: centang butir Bagian 3 yang terbukti (lib/audit, lib/privacy, helper transaksi); isi Catatan hasil; status Bagian 3 = "1/3".
3. Commit (jangan push): "feat(core): lib/audit, lib/privacy, helper http, dan penguncian withContext (Bagian 3a)".
4. Laporan akhir: file utama, perintah dan hasil, keputusan kecil yang diambil.
```

---

## Prompt 6

```text
# Prompt 6 — `lib/auth`: sesi cookie, guard peran/fasilitas, OTP tiruan, middleware tanpa DB

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 3 (2 dari 3). Kotak waktu: 15:30–16:00 (padat; bila mepet, kerjakan sesi + guard + middleware beserta tesnya dulu, lalu OTP; tes penolakan tidak boleh dilewati). Prompt 5 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: OTP tiruan (K-3) dan aturan siap serverless (architecture.md §3).

Baca HANYA:
- docs/implementation-plan.md: "Bagian 3" dan verifikasi "Bagian 5".
- architecture.md §2, §3 (A3, aturan siap serverless), §5, §10 (otorisasi berlapis), §13 (baris Sesi).
- docs/user-flows.md HANYA layar P3, D2, T2.
- Kode: src/db, src/lib/privacy, src/lib/http, migrasi otp_codes dan rate_limit_hits.

Batasan:
- Tidak ada dependensi baru. Tanda tangan cookie memakai Web Crypto (HMAC-SHA256) dengan verifikasi bawaan/konstan-waktu.
- Tidak ada UI (layar masuk dibuat di Prompt 9).
- Middleware/proxy TIDAK mengimpor src/db atau pg.
- Aktivasi akun lewat undangan (A-01) tidak dikerjakan hari ini: petugas/admin berstatus invited atau inactive tidak bisa masuk.

Langkah:
1. Env: SESSION_SECRET, HASH_PEPPER, OTP_MODE (kosong = OTP mati; dev-display = OTP tiruan). Nilai acak dibuat di .env.local; .env.example hanya placeholder. Jangan tulis rahasia di chat.
2. Migrasi 005:
   - Tabel sessions (hash ID sesi, user, peran, fasilitas, dibuat, kedaluwarsa, dicabut). RLS: hanya baris milik app.user_id.
   - Fungsi SECURITY DEFINER sempit untuk jalur sebelum sesi ada. Milik aksespass_owner, SET search_path eksplisit, EXECUTE dicabut dari PUBLIC dan hanya diberikan ke aksespass_app:
     • cari user berdasarkan telepon → hanya id, peran, status, fasilitas, status keanggotaan;
     • daftar user baru → hanya peran patient atau companion, menyimpan stats_consent, audit_subject_id terisi.
3. src/lib/auth
   a. Normalisasi nomor telepon Indonesia (08… → +628…); tolak format tidak valid.
   b. requestOtp(phone, meta):
      - Rate limit per HMAC(telepon) dan per HMAC(IP) di Postgres. IP dari x-forwarded-for (tepercaya di Vercel); di lokal fallback "local".
      - Kode 6 digit acak kriptografis. Simpan HMAC(kode) dan HMAC(telepon) dengan HASH_PEPPER; kedaluwarsa 5 menit.
      - Respons SAMA untuk nomor terdaftar maupun belum.
      - Kode asli hanya dikembalikan bila OTP_MODE=dev-display; mode ini ditolak bila VERCEL_ENV=production. Bila OTP_MODE kosong: galat "Penyedia OTP belum dikonfigurasi", tanpa kode.
   c. verifyOtp(phone, code, {intendedRole, statsConsent}):
      - SELECT … FOR UPDATE agar kode tidak terpakai dua kali; bandingkan konstan-waktu; maksimum 5 percobaan lalu kode hangus; sekali pakai.
      - Nomor terdaftar masuk dengan peran yang tercatat; intendedRole diabaikan (satu nomor = satu peran di prototipe, [Usulan]).
      - Nomor baru → akun baru hanya untuk patient/companion; petugas/admin/kurator tidak bisa mendaftar sendiri.
      - Petugas/admin invited atau inactive, atau user nonaktif → "Tidak dapat masuk. Hubungi admin fasilitas." tanpa sesi.
      - Kembalikan tujuan beranda sesuai peran.
   d. Sesi: buat baris sessions dan cookie bertanda tangan berisi klaim minimum (id sesi, id user, peran, fasilitas bila ada, kedaluwarsa, versi). Atribut: HttpOnly, SameSite=Lax, Path=/, Secure bila APP_ORIGIN https (prefix __Host- bila Secure). Masa berlaku sebagai konstanta [Usulan]: petugas/admin/kurator 8 jam, pasien/pendamping 7 hari.
   e. Verifikasi dua tingkat:
      - verifySessionCookie(value): murni, tanpa DB (tanda tangan, kedaluwarsa, klaim). Dipakai middleware.
      - requireSession(request, {roles}): verifikasi cookie, lalu cek DB lewat withContext: sesi belum dicabut, user aktif, dan untuk petugas/admin keanggotaan masih active di fasilitas yang sama dengan klaim. Mengembalikan {userId, role, facilityId, auditSubjectId} untuk withContext, atau alasan penolakan bertipe.
      - Bisa dites dari objek Request biasa (tanpa konteks request Next), plus adaptor tipis untuk server component/action.
   f. Logout: cabut baris sesi dan hapus cookie.
4. Route handler tipis (hanya memanggil lib/auth, memakai pembungkus dan pemeriksa Origin dari src/lib/http): POST /api/auth/otp/request, POST /api/auth/otp/verify, POST /api/auth/logout.
5. Middleware/proxy (nama file mengikuti versi Next terpasang; Next 16 memakai proxy.ts):
   - URL berprefiks peran sebagai segmen nyata: /pasien, /pendamping, /petugas, /admin, /kurator. Route group berkurung di §5 tidak menghasilkan prefiks URL sehingga tidak bisa dijaga per grup; catat penyesuaian ini di §5 sebagai [Usulan].
   - Publik: /, /masuk (dan turunannya), /s (halaman tujuan QR, Prompt 13), /api/auth/*, aset statis.
   - Halaman berprefiks peran tanpa cookie valid → redirect /masuk; peran salah → redirect ke beranda perannya. Route /api lain menjaga dirinya sendiri lewat requireSession.
6. Tambah ke tes arsitektur: file middleware/proxy tidak mengimpor src/db atau pg.

Verifikasi (Vitest; sertakan bukti):
- [ ] Alur OTP tiruan: request → kode dikembalikan (dev-display) → verify benar → cookie sesi dengan HttpOnly, SameSite=Lax, Path=/, Max-Age sesuai peran.
- [ ] Kode salah, kedaluwarsa, dan dipakai ulang ditolak; percobaan ke-6 ditolak walau kodenya benar.
- [ ] Rate limit request OTP per telepon dan per IP memblokir setelah batas, dan tetap memblokir setelah pool/modul dibuat ulang (simulasi restart).
- [ ] OTP_MODE kosong → tidak ada kode di respons; dev-display + VERCEL_ENV=production → ditolak.
- [ ] Respons request OTP untuk nomor terdaftar dan belum terdaftar identik.
- [ ] otp_codes tidak menyimpan kode atau nomor telepon dalam bentuk asli (cek via URL admin).
- [ ] Output logger yang ditangkap selama seluruh tes auth tidak memuat kode OTP atau nomor telepon.
- [ ] Nomor baru dengan intendedRole patient → akun pasien; mendaftar sebagai staff → ditolak.
- [ ] Petugas nonaktif dan invited dari seed tidak mendapat sesi; pesan "Hubungi admin fasilitas".
- [ ] Cookie dengan klaim peran diubah, cookie kedaluwarsa, dan sesi yang sudah logout → ditolak.
- [ ] Petugas dinonaktifkan setelah login (ubah via URL admin) → requireSession berikutnya ditolak dengan alasan bertipe.
- [ ] POST dengan Origin asing → 403.
- [ ] Middleware: tanpa cookie ke /petugas → redirect /masuk; sesi pasien ke /petugas → redirect ke /pasien; /masuk dan /api/auth/* tetap terbuka.
- [ ] Fungsi SECURITY DEFINER: proacl hanya memberi EXECUTE ke aksespass_app (dan pemilik); proconfig memuat search_path.
- [ ] Tes arsitektur lolos (termasuk middleware tanpa DB).
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.

Selesai:
1. Catat di architecture.md: §10 (sesi dua tingkat, fungsi SECURITY DEFINER), §13 (masa berlaku sesi [Usulan], OTP tiruan dan penjaganya), §5 (prefiks URL).
2. implementation-plan.md: centang butir lib/auth dan middleware di Bagian 3; isi Catatan hasil; status Bagian 3 = "2/3".
3. Commit (jangan push): "feat(auth): sesi bertanda tangan, guard peran/fasilitas, OTP tiruan, middleware tanpa DB (Bagian 3b)".
4. Laporan akhir.
```

---

## Prompt 7

```text
# Prompt 7 — `lib/consent` + `POST /api/scan` + matriks tes izin dan kebocoran

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 3 (3 dari 3), bagian paling kritis untuk privasi. Kotak waktu: 16:00–16:30 (bila mepet, matriks tes izin dan kebocoran lebih penting daripada revokeAllActive). Prompt 6 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: K-4 satu pesan penolakan generik.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 3" (seluruh verifikasi).
- architecture.md §6, §7, §11, §13.
- docs/user-flows.md HANYA P11, P12, P20, T4, T5.
- Kode: src/db, src/lib/{audit,privacy,http,auth}, konstanta field bersama.

Batasan:
- Tidak ada dependensi baru (gambar QR dengan qrcode baru di Prompt 11).
- Tidak ada UI.
- Untuk pembaca selain pasien itu sendiri, hanya lib/consent yang boleh menyentuh tabel profil pasien.
- Token asli tidak pernah disimpan, masuk log, atau masuk audit.

Langkah:
1. Migrasi 006 — menambal celah yang terlihat saat menyusun alur pindai:
   - consents.subject_ref = audit_subject_id pasien, diisi saat consent dibuat; backfill baris lama. Petugas tidak boleh membaca tabel users pasien, jadi audit pindai mengambil pseudonim dari sini.
   - Kebijakan RLS: petugas boleh membaca baris consents yang terhubung ke consent_qr dengan token_hash = app.scan_token_hash (untuk memeriksa fasilitas dan masa berlaku). Tidak lebih dari itu.
   - visits: kolom recorded_at (kosong = kunjungan dibuka, belum dicatat); kolom bantuan boleh kosong sebelum dicatat; backfill seed historis recorded_at = created_at.
   - Tes RLS untuk kebijakan baru: token cocok → 1 baris; tanpa token atau token lain → 0 baris.
2. Format token [Usulan, catat di §7]:
   - 128 bit acak kriptografis, Crockford Base32 (26 karakter, tanpa huruf ambigu) agar bisa diketik saat kamera ditolak; ditampilkan berkelompok 4 karakter.
   - Normalisasi input: huruf besar, buang spasi/strip, O→0, I/L→1. Input salah format diperlakukan sama dengan token tak dikenal.
   - Disimpan sebagai SHA-256 heks.
   - URL QR: ${APP_ORIGIN}/s#<token>. Fragmen (#) tidak dikirim ke server, jadi token tidak masuk log akses server/Vercel maupun header Referer. Halaman /s (Prompt 13) akan membaca fragmen lalu menghapusnya dari riwayat browser.
3. src/lib/consent. Setiap fungsi menerima actor dan clock `now` yang bisa disuntik; struktur actor disiapkan agar Prompt 16 bisa menambah pendamping.
   a. createConsent(session pasien, {facilityId, sharedFields, duration}):
      - sharedFields tidak kosong dan ⊆ konstanta field; nama_panggilan selalu ikut.
      - duration ∈ {1 jam, hari ini (s.d. 23:59:59 WIB), 24 jam}.
      - Profil harus sudah tersimpan dengan minimal satu kebutuhan; kalau belum: "Simpan paspor dulu".
      - consents + consent_qr dalam satu withContext, audit qr_created. Kembalikan token, URL QR, expiresAt — satu-satunya saat token asli ada.
   b. revokeQr(session, qrId) dan revokeAllActive(session): hanya milik pasien sendiri (RLS), set revoked_at, audit qr_revoked per QR.
   c. scanToken(session petugas, rawToken, meta):
      1) Rate limit per petugas dan per HMAC(IP) di Postgres sebelum apa pun. Konstanta [Usulan]: 20 percobaan/5 menit per petugas, 60/5 menit per IP. Melebihi → 429 "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."
      2) Normalisasi + hash; withContext({petugas, facilityId, scanTokenHash}).
      3) Cek berurutan sesuai §7: QR ada, belum dicabut, belum kedaluwarsa, dalam masa berlaku, consent untuk fasilitas petugas.
      4) Gagal (alasan apa pun, termasuk salah format) → audit qr_scan_rejected (pelaku petugas, fasilitas, subject_ref bila token dikenal [Usulan]; tanpa token, tanpa alasan) → SATU bentuk respons: status 422, body {ok:false, code:"QR_UNUSABLE", title:"QR Tidak Dapat Dipakai", message:"Minta pasien membuat ConsentQR baru."}. Jalur gagal melakukan pekerjaan setara (satu lookup + satu insert audit).
      5) Lolos, dalam SATU transaksi:
         - baca profil TERKINI dan saring ke field yang dicentang;
         - buka kunjungan (visits: pasien dari consent, fasilitas, petugas, consent, jalur qr, client_id dari server); bila sudah ada kunjungan terbuka untuk consent dan fasilitas yang sama hari itu, pakai ulang;
         - tulis qr_scanned dan profile_read (fields = nama field yang benar-benar dikirim).
         Commit dulu, baru kembalikan respons. Audit gagal → rollback, galat generik tanpa data.
      6) Body sukses: visitId, nama panggilan, kebutuhan (kode, label, ikon, kategori) sesuai field, catatan pasien hanya bila dicentang, expiresAt, expiresSoon (sisa < 15 menit [Usulan]). TIDAK ada ID pasien, telepon, atau field lain.
4. Route handler POST /api/scan:
   - requireSession(staff) + lib/consent.scanToken + helper http. Body JSON {token}. Semua respons Cache-Control: no-store. Tidak ada GET dengan token.
   - Bila requireSession menolak karena keanggotaan petugas tidak aktif, tetap catat qr_scan_rejected (pelaku dari klaim cookie yang tanda tangannya valid), lalu 403 "Akun tidak aktif. Hubungi admin fasilitas." Pesan ini tentang akun petugas, bukan token.
5. Tambah ke tes arsitektur:
   - patient_profiles dan patient_profile_needs hanya muncul di src/lib/consent, src/db, dan tes (Prompt 10 akan menambah modul paspor milik pasien ke daftar izin).
   - Route scan hanya mengimpor dari lib/auth, lib/consent, lib/http.

Verifikasi — matriks tes (Vitest pada aksespass_test; sertakan bukti):
- [ ] Lolos: petugas aktif, fasilitas cocok, token valid → hanya field dicentang; nama panggilan ada; field dan catatan yang tidak dicentang TIDAK ada di body.
- [ ] Ditolak dengan respons identik (status, body, header relevan dibandingkan deep-equal): token tak dikenal, salah format, kedaluwarsa, dicabut, belum berlaku, fasilitas lain.
- [ ] Petugas dinonaktifkan di tengah sesi → 403 dan tercatat.
- [ ] Setiap lolos menulis qr_scanned + profile_read dengan nama field yang benar; setiap gagal menulis qr_scan_rejected; tidak ada token mentah atau nilai profil di audit_events.
- [ ] Audit dipaksa gagal → respons tanpa data profil dan tidak ada kunjungan terbuka.
- [ ] consent_qr berisi SHA-256 token; token mentah tidak ditemukan di kolom teks consents, consent_qr, audit_events, visits (cek via URL admin).
- [ ] Profil diubah setelah QR dibuat → pindai mengembalikan data terbaru.
- [ ] revokeQr dan revokeAllActive → pindai berikutnya ditolak; pasien lain tidak bisa mencabut QR orang lain.
- [ ] Pindai lolos membuka satu kunjungan; pindai ulang QR yang sama hari itu tidak membuat kunjungan kedua.
- [ ] Durasi "hari ini" berakhir 23:59:59 WIB (clock disuntik).
- [ ] createConsent dengan profil kosong → "Simpan paspor dulu"; sharedFields kosong atau tak dikenal → ditolak.
- [ ] Rate limit memblokir setelah batas dan tetap memblokir setelah pool/modul dibuat ulang.
- [ ] Konteks tidak bocor: dengan pool max=1, pindai lolos oleh petugas A lalu petugas B (fasilitas B) mencoba membaca profil yang sama tanpa token → 0 baris.
- [ ] Kebocoran: penanda unik sintetis di nama panggilan dan catatan pasien, serta token mentah, tidak muncul di output logger maupun console yang ditangkap selama pindai lolos dan gagal.
- [ ] Respons sukses dan gagal ber-header Cache-Control: no-store.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.

Selesai:
1. Catat di architecture.md sebagai [Usulan]: §7 (format token, URL fragmen, kontrak respons, konstanta rate limit dan "hampir kedaluwarsa", subject_ref pada penolakan); §6 (consents.subject_ref, kunjungan dibuka saat pindai lolos dan recorded_at diisi saat T8).
2. implementation-plan.md: centang seluruh Bagian 3 yang terbukti; isi Catatan hasil; status Bagian 3 = selesai HANYA bila semua verifikasi lolos.
3. Commit (jangan push): "feat(consent): ConsentQR, pindai dengan audit, dan matriks tes izin/kebocoran (Bagian 3c)".
4. Laporan akhir: hasil tiap baris matriks dan risiko yang tersisa.
```

---

## Prompt 8

```text
# Prompt 8 — Komponen UI bersama + halaman katalog + uji axe

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 4 di docs/implementation-plan.md. Kotak waktu: 16:30–17:15. Prompt 7 harus sudah ter-commit; kalau belum, BERHENTI.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 4".
- design.md seluruhnya (§1–§5) — ini spesifikasi utamanya.
- architecture.md §14.
- docs/user-flows.md HANYA P12, P16, P20 (contoh pemakaian tombol cabut, skala CareProof, pop-up konfirmasi).
- Kode: globals.css dan integrasi token dari Prompt 2.

Batasan:
- Dependensi baru yang boleh HANYA axe-core (sudah disetujui, K-2). Tidak ada pustaka komponen, jsdom, testing-library, atau Playwright.
- Tidak ada fitur, data, atau pemanggilan API.
- Hanya bobot 400/700. Hanya warna token, memakai utilitas token persis seperti yang dipasang Prompt 2 (jangan mencampur dua cara penamaan).

Langkah:
1. Dasar halaman:
   - <html lang="id"> (bawaan create-next-app biasanya "en").
   - Skip link "Lewati ke konten utama" sebagai elemen fokus pertama, menuju <main>.
2. Token tambahan [Usulan], ditulis ke design.md §2C dan globals.css, karena contoh di design.md memakai warna yang belum ada di daftar token:
   - --bg-surface-hover: #A5F3FC (hover tombol sekunder di §4A).
   - Border status: --success-border #A7F3D0, --warning-border #FDE68A, --error-border #FECACA (contoh §4B memakai border-red-200).
   - Putih (#FFFFFF) dianggap bagian token (teks tombol primer, latar input).
   Jangan menambah warna lain.
3. Ikon: pakai nama dari design.md. Bila lucide-react terpasang sudah mengganti namanya (mis. CheckCircle2→CircleCheck, AlertTriangle→TriangleAlert, XCircle→CircleX), pakai nama baru dan catat padanannya di design.md. Semua ikon dekoratif aria-hidden="true".
4. Komponen di src/components (satu file per komponen, tanpa logika data):
   a. Button: primer dan sekunder persis §4A (font-bold); default type="button"; tinggi ≥ 48 px; nonaktif memakai disabled-surface/disabled-text; keadaan memproses dengan aria-busy dan teks "Memproses…", tanpa animasi.
      TextLink: text-link + garis bawah; bila berdiri sendiri, area ≥ 48 px. Hindari tautan di tengah kalimat.
   b. TextField: label terlihat di atas; atribut placeholder TIDAK dipakai sama sekali; teks bantuan opsional; pesan galat di bawah dengan ikon + teks; aria-invalid dan aria-describedby benar; teks 16 px; tinggi ≥ 48 px; border-input.
      Varian telepon: type="tel", autocomplete="tel".
      Varian OTP: SATU kolom (bukan 6 kotak terpisah), inputMode="numeric", autocomplete="one-time-code", maxLength 6.
   c. ChoiceChip + ChoiceGroup: input checkbox asli di dalam fieldset/legend; ikon + teks; terpilih = bg-surface DAN ikon centang (bukan warna saja); area ≥ 48×48; Spasi untuk memilih.
   d. Toggle: input checkbox dengan role="switch"; label teks; tulisan "Aktif"/"Nonaktif" terlihat di sebelahnya; area ≥ 48×48.
   e. StatusBanner: sukses/peringatan/galat dengan ikon wajib §2B (galat boleh Ban untuk "Kamera Ditolak"); judul tebal + pesan; role="alert" hanya untuk galat, role="status" untuk lainnya; slot aksi opsional (mis. tombol "Masukkan kode manual").
   f. ConfirmDialog: elemen <dialog> asli dengan showModal() (fokus terkurung dan latar inert secara bawaan); judul via aria-labelledby; fokus awal ke tombol batal; Esc = batal; fokus kembali ke pemicu saat ditutup; tombol aksi menyebut tindakannya ("Ya, Cabut"), bukan "OK".
   g. CareProofScale: fieldset + legend + 3 radio asli bergaya ubin besar — Terpenuhi (pola sukses), Sebagian (pola peringatan), Belum (pola galat), masing-masing ikon + teks. Terpilih ditandai border tebal + ikon centang, bukan warna saja. Panah keyboard memakai perilaku radio bawaan.
   h. PageShell: header dengan tombol Kembali opsional (aria-label "Kembali", ≥ 48 px, menuju href yang ditentukan halaman — bukan history.back()), tepat satu H1, area konten; paragraf dibatasi max-width 60ch.
5. Halaman katalog /dev/katalog (jangan pakai folder berawalan _ karena tidak bisa dirutekan): setiap komponen dalam semua keadaannya (normal, terpilih, nonaktif, galat, memproses). Mengembalikan 404 pada build produksi.
6. Panel pemeriksaan khusus pengembangan: komponen client, hanya dirender bila NODE_ENV=development, dipasang di root layout supaya prompt berikutnya bisa memakainya di layar mana pun, dan mengecualikan dirinya sendiri dari pemeriksaan.
   - "Cek aksesibilitas": memuat axe-core lewat import dinamis, menjalankan axe.run pada dokumen, menampilkan jumlah dan daftar pelanggaran sebagai teks.
   - "Cek target sentuh": daftar elemen interaktif yang kotak kliknya < 48×48 px.
   - "Cek scroll horizontal": scrollWidth dibanding lebar jendela.
   - Sakelar "Teks 200%": font-size root 200% untuk mensimulasikan pembesaran teks.
   Panel dan axe-core tidak boleh ikut ke build produksi.
7. Tes Vitest tanpa DOM (react-dom/server renderToStaticMarkup, tanpa paket baru):
   - StatusBanner: galat → role="alert"; sukses/peringatan → role="status"; ikon aria-hidden; judul dan pesan ada.
   - TextField: label for = id input; saat galat aria-invalid="true" dan aria-describedby menunjuk id pesan; tidak ada atribut placeholder.
   - Button: default type="button".
   - ConfirmDialog: <dialog> dengan aria-labelledby; label tombol aksi sesuai prop.
   - CareProofScale: fieldset + legend + 3 radio berlabel.
8. Tambah ke tes arsitektur:
   - Tidak ada kode hex di src di luar blok token globals.css.
   - Tidak ada kelas warna palet Tailwind selain yang tercantum di design.md §2 dan token langkah 2.
   - Token warna status hanya dipakai di StatusBanner dan CareProofScale (architecture.md §14: StatusBanner satu-satunya cara menampilkan status).
   - Tidak ada font-medium/font-semibold, atribut placeholder, atau kelas animate-*.
9. Siapkan .claude/launch.json (pnpm dev, port 3000) bila belum ada, untuk pratinjau di panel browser.

Verifikasi (sertakan bukti):
- [ ] Panel: "Cek aksesibilitas" di /dev/katalog = 0 pelanggaran (tempel ringkasannya).
- [ ] Panel: tidak ada target < 48×48 px di katalog.
- [ ] Lebar 320 px (resize panel browser): tidak ada scroll horizontal. Ulangi dengan "Teks 200%": tidak ada scroll horizontal dan teks tidak terpotong (screenshot).
- [ ] Keyboard saja (Tab, Shift+Tab, Spasi, Enter, panah, Esc): semua komponen bisa dioperasikan dan focus ring terlihat (screenshot minimal tombol, chip, toggle, CareProof).
- [ ] ConfirmDialog: fokus masuk ke dialog, Esc menutup, fokus kembali ke pemicu.
- [ ] Setiap status di katalog tampil dengan ikon + teks + warna.
- [ ] Tidak ada animasi pada komponen, dan aturan global reduced-motion dari Prompt 2 masih ada.
- [ ] Build produksi (pnpm build && pnpm start): /dev/katalog → 404 dan panel pemeriksaan tidak muncul di halaman mana pun.
- [ ] Tes komponen dan tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia di sesi ini, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. design.md: token tambahan [Usulan], padanan nama ikon bila berubah, catatan bahwa §5 sudah diimplementasikan sebagai komponen (status tetap [Usulan]).
2. implementation-plan.md: centang Bagian 4 yang terbukti; Catatan hasil, termasuk cara memakai panel pemeriksaan untuk prompt berikutnya; ubah status.
3. Commit (jangan push): "feat(ui): komponen bersama, katalog, dan panel pemeriksaan aksesibilitas (Bagian 4)".
4. Laporan akhir: komponen yang dibuat, hasil tiap verifikasi, keputusan kecil yang diambil.
```

---

## Prompt 9

```text
# Prompt 9 — Layar masuk dan akun: P1–P4, T1–T3, A1–A2

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 5. Kotak waktu: 17:15–18:00. Prompt 8 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: OTP tiruan (K-3), pendamping berakun sendiri (K-7), aktivasi akun lewat undangan TIDAK dibuat hari ini.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 5".
- docs/user-flows.md HANYA P1–P4, D2, T1–T3, A1–A2.
- design.md §1, §4, §5.
- architecture.md §2, §13 (baris Sesi).
- Kode: src/components (pakai, jangan buat ulang), src/lib/auth dan route /api/auth/* dari Prompt 6, middleware/proxy, panel pemeriksaan dari Prompt 8.

Batasan:
- Tidak ada dependensi baru.
- Pakai komponen yang ada. Kalau butuh komponen baru, buat di src/components sesuai design.md dan tambahkan ke katalog.
- Halaman tidak mengimpor src/db; data selalu lewat src/lib.
- Tidak ada token, kode OTP, atau data akun di localStorage/sessionStorage.
- Tidak ada parameter "kembali ke halaman X" setelah masuk (menghindari open redirect).

Langkah:
1. Rute (prefiks peran dari Prompt 6):
   - / (P1), /mulai (P2), /masuk (P3, pasien/pendamping), /masuk/petugas (T2, A2, kurator).
   - /pasien (P4), /petugas (T3).
   - /admin (beranda sementara sampai Prompt 15), /pendamping (beranda sementara sampai Prompt 16), /kurator ("Fitur kurator belum tersedia di prototipe").
   Tambahkan /mulai ke daftar publik middleware.
2. P1 (/): tanpa jeda buatan. Logika rute sebagai fungsi murni yang dites:
   - ada sesi valid → beranda sesuai peran;
   - tanpa sesi dan belum ada cookie preferensi → /mulai;
   - selain itu → /masuk.
   Perbarui middleware: cookie sesi kedaluwarsa/tidak valid → hapus cookie, arahkan ke /masuk?alasan=sesi-berakhir (atau /masuk/petugas untuk prefiks /petugas, /admin, /kurator), lalu tampilkan StatusBanner peringatan "Sesi Anda berakhir. Silakan masuk lagi." Nilai `alasan` hanya dari daftar tetap; teks tidak pernah diambil dari URL.
3. P2 (/mulai), tiga langkah dengan indikator langkah:
   - Bahasa: Indonesia sederhana (informasi, satu-satunya pilihan hari ini).
   - Ukuran teks (100% / 150% / 200%) dan kontras (Standar / Tinggi), dengan pratinjau langsung.
   - Informasi bahwa aplikasi mendukung pembaca layar perangkat (TalkBack/VoiceOver). Pengaturan teks-ke-suara tidak dibuat hari ini (bagian KomunikaCare).
   - [Lanjut] dan [Lewati] (pengaturan bawaan) → /masuk. Satu kalimat privasi: aplikasi tidak meminta diagnosis.
   - Simpan sebagai cookie HttpOnly aksespass_pref berisi hanya dua nilai itu, divalidasi dari daftar tetap [Usulan]; ditulis lewat server action atau route handler dengan pemeriksaan Origin. Root layout membacanya di server dan memasang atribut pada <html>, jadi tampilan langsung benar tanpa kedipan.
   - Kontras tinggi [Usulan]: latar putih, semua teks memakai text-main, border input 2 px, tanpa warna dekoratif — hanya dengan token yang ada.
4. P3 (/masuk):
   - Langkah nomor HP (TextField telepon) → [Kirim kode] → langkah kode (TextField OTP). Fokus pindah ke kolom kode setelah kode dikirim. Teks "Kode berlaku 5 menit" dan [Kirim ulang].
   - Mode OTP tiruan: tampilkan kode di kotak berlabel jelas "Mode demo: SMS belum aktif. Kode Anda: …". Kode tidak disimpan di storage dan tidak dicetak ke console/log.
   - Kotak centang opsional terpisah, tidak tercentang bawaan: "Izinkan kunjungan saya dihitung dalam statistik anonim fasilitas (tanpa nama atau nomor Anda)", dengan keterangan bahwa pilihan ini berlaku saat akun baru dibuat.
   - Tautan "Saya pendamping pasien" (padanan "Masuk dengan bantuan pendamping") mengalihkan formulir ke pendaftaran pendamping (intendedRole companion, sesuai D2).
   - Galat lewat StatusBanner: kode salah/kedaluwarsa ("Kode salah atau kedaluwarsa. Minta kode baru."), terlalu banyak percobaan, dan tidak dapat masuk ("Hubungi admin fasilitas").
   - Berhasil → beranda sesuai peran. Fitur lupa akses/pemulihan tidak dibuat hari ini.
5. /masuk/petugas (T2, A2, kurator): sama seperti P3 tetapi tanpa pendaftaran, tanpa kotak statistik, tanpa pilihan pendamping. Verify dipanggil TANPA intendedRole; pastikan lib/auth tidak membuat akun bila intendedRole kosong (tambah tes bila belum ada). Akun nonaktif/belum diaktivasi: "Tidak dapat masuk. Hubungi admin fasilitas."
6. P4 (/pasien):
   - Modul baru src/lib/passport, hari ini HANYA getOwnPassportStatus(session) (Prompt 10 melanjutkannya). Tambahkan src/lib/passport ke daftar izin patient_profiles di tes arsitektur.
   - Kartu status paspor (lengkap / belum diisi). Belum diisi → ajakan utama [Isi Paspor] ke /pasien/paspor. Sudah diisi → tombol utama besar [Mulai Kunjungan] ke /pasien/kunjungan.
   - Menu: Paspor Saya, Kontrol Akses (/pasien/akses), Pendamping (/pasien/pendamping), dan [Keluar]. Kartu Cetak dan Akun (P22) tidak ditampilkan hari ini (di luar cakupan).
   - Tujuan menu yang belum dibangun boleh berupa halaman sementara yang jujur ("Sedang dibangun").
   - Penyesuaian alur, dicatat di user-flows.md P3 sebagai catatan: akun baru mendarat di P4 dengan ajakan utama "Isi Paspor", bukan langsung P5, agar tombol Keluar tetap terjangkau.
7. T3 (/petugas): nama fasilitas (lewat fungsi di src/lib, bukan query di halaman), tombol besar [Pindai ConsentQR] ke /petugas/pindai (dibangun Prompt 13), tempat daftar kunjungan hari ini (diisi Prompt 13), dan [Keluar] yang menonjol karena perangkat petugas bisa dipakai bergantian. Jalur kartu cetak tidak ditampilkan hari ini.
8. /admin dan /pendamping: nama dan peran pengguna, [Keluar], keterangan singkat isi yang akan datang.
9. Setiap halaman: <title> unik ("Masuk — AKSESPASS"), tepat satu H1, memakai PageShell.
10. Tambah ke tes arsitektur: src/app tidak mengimpor src/db.

Verifikasi (sertakan bukti; pakai panel browser dan panel pemeriksaan dari Prompt 8):
- [ ] Vitest: fungsi rute P1 untuk semua kombinasi (sesi per peran, tanpa sesi ± cookie preferensi, sesi kedaluwarsa); parse/serialize cookie preferensi menolak nilai di luar daftar; nilai `alasan` di luar daftar tidak menampilkan teks apa pun.
- [ ] Vitest: verify tanpa intendedRole untuk nomor tak dikenal tidak membuat akun (jumlah baris users via URL admin sama sebelum/sesudah).
- [ ] Alur pasien baru di lebar 320 px dengan keyboard saja: / → /mulai → /masuk → kode demo → /pasien dengan ajakan "Isi Paspor" (screenshot tiap layar).
- [ ] Akun seed: pasien → /pasien status "lengkap"; pendamping → /pendamping; petugas aktif → /petugas dengan nama fasilitas; admin → /admin; kurator → /kurator; petugas nonaktif → "Hubungi admin fasilitas" tanpa sesi.
- [ ] Preferensi: pilih teks 200% + kontras tinggi, muat ulang → tetap berlaku di /masuk dan /pasien tanpa kedipan; cookie aksespass_pref hanya berisi dua nilai itu.
- [ ] Panel pemeriksaan di /, /mulai, /masuk (dua langkah), /masuk/petugas, /pasien, /petugas: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px maupun dengan "Teks 200%".
- [ ] Sesi berakhir: ubah atau rusak isi cookie sesi → buka /pasien → diarahkan ke /masuk?alasan=sesi-berakhir dengan banner peringatan.
- [ ] Keluar dari /pasien dan /petugas → cookie sesi hilang; membuka /pasien atau /petugas lagi diarahkan ke halaman masuk.
- [ ] Konsol browser: localStorage dan sessionStorage tidak berisi token, kode, atau data akun; cookie sesi tidak terbaca dari document.cookie (HttpOnly).
- [ ] Log server dev (preview_logs) selama semua alur di atas tidak memuat kode OTP maupun nomor telepon (cari keduanya).
- [ ] Tes arsitektur lolos (src/app tidak mengimpor src/db; patient_profiles hanya di modul yang diizinkan).
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat sebagai [Usulan]: design.md (mode kontras tinggi dan pilihan ukuran teks), architecture.md §13 (cookie preferensi tampilan). Di user-flows.md: catatan penyesuaian P3/P4 dan bagian P2/P3 yang tidak dibuat hari ini.
2. implementation-plan.md: centang Bagian 5 yang terbukti; Catatan hasil; ubah status.
3. Commit (jangan push): "feat(masuk): splash, onboarding aksesibilitas, masuk OTP, beranda pasien dan petugas (Bagian 5)".
4. Laporan akhir.
```

---

## Prompt 10

```text
# Prompt 10 — MyCare Passport: editor dan pratinjau (P5–P6)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 6 (1 dari 3). Kotak waktu: 18:00–18:30. Prompt 9 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: K-8 — draft paspor HANYA di memori halaman, tidak disimpan ke perangkat.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 6" (butir P5, P6, dan verifikasi draft).
- docs/user-flows.md HANYA P4, P5, P6.
- architecture.md §6 (patient_profiles, patient_profile_needs, needs_catalog), §7 (paragraf "Konsekuensi dari data dibaca saat dipindai"), §13 (baris catatan bebas pasien).
- design.md §5.
- Kode: src/lib/passport (Prompt 9), src/components, konstanta field bersama, seed needs_catalog, batas panjang kolom di migrasi.

Batasan:
- Tidak ada dependensi baru.
- Draft tidak boleh ditulis ke localStorage, sessionStorage, IndexedDB, atau cookie.
- Tidak ada kolom, label, atau input diagnosis.
- Akses profil hanya lewat src/lib/passport (sudah di daftar izin tes arsitektur).

Langkah:
1. src/lib/passport (lanjutan; fungsi menerima actor agar Prompt 16 bisa menambah pendamping):
   - getNeedsCatalog(): katalog dikelompokkan per kategori; kategori tanpa item tidak dikembalikan.
   - getOwnPassport(session): nama panggilan, kode kebutuhan, catatan, waktu ubah — atau null.
   - saveOwnPassport(session, input), dalam satu withContext:
     • skema masukan ketat: kunci tak dikenal (termasuk apa pun bernama diagnosis/diagnosa) ditolak;
     • nama panggilan wajib, dipangkas, batas panjang sesuai kolom;
     • kode kebutuhan harus ada di katalog, minimal satu;
     • catatan opsional, batas panjang sesuai kolom;
     • upsert patient_profiles, ganti isi patient_profile_needs, set penanda perubahan terakhir = pasien.
2. Komponen PatientNeedsSummary di src/components (+ katalog): nama panggilan, kebutuhan dengan ikon + teks besar per kategori, catatan bila ada. Dipakai P6 sekarang, lalu P11/P12 (Prompt 11) dan T5 (Prompt 13), supaya pratinjau benar-benar sama dengan yang dilihat petugas.
3. /pasien/paspor — P5 + P6 dalam satu alur client. Ubah profil memakai layar yang sama, terisi dari data tersimpan.
   - Langkah 1 "Nama panggilan". Penyesuaian: P5 di user-flows belum punya isian ini, padahal T5 dan P6 memakainya. Teks bantuan: "Boleh nama panggilan, tidak perlu nama lengkap."
   - Langkah 2–7: satu kategori per layar (Komunikasi, Penglihatan, Pendengaran, Mobilitas, Sensorik dan Lingkungan, Pendampingan) dengan ChoiceGroup/ChoiceChip. Boleh lanjut tanpa memilih.
   - Langkah 8 "Catatan untuk petugas (opsional)": teks bantuan "Tulis cara membantu Anda. Tidak perlu menulis diagnosis atau nama penyakit." + penghitung karakter.
   - Indikator "Langkah X dari 8", tombol [Sebelumnya] dan [Lanjut]; langkah terakhir [Lihat Pratinjau]. Saat ganti langkah, fokus pindah ke judul langkah (H2) agar pembaca layar mengumumkannya.
   - Tombol [X] keluar: bila ada perubahan, ConfirmDialog "Keluar tanpa menyimpan? Perubahan akan hilang." [Tetap mengisi] [Ya, Buang]. Opsi "Simpan draft" dan banner "Lanjutkan draft" di P4 TIDAK dibuat (K-8).
4. P6 pratinjau:
   - PatientNeedsSummary berisi semua yang diisi, dengan keterangan "Diagnosis tidak diminta" dan "Petugas hanya melihat bagian yang Anda pilih saat membuat ConsentQR."
   - Belum ada kebutuhan yang dipilih → StatusBanner peringatan "Pilih minimal satu kebutuhan" + tautan ke langkah 2; simpan tidak dijalankan.
   - [Kembali Edit] → langkah terakhir dengan pilihan tetap terisi.
   - [Simpan Paspor] → StatusBanner sukses "Paspor tersimpan" + [Mulai Kunjungan] dan [Ke Beranda]. [Atur Kartu Cetak] tidak ditampilkan hari ini.
   - Teks hasil simpan mengikuti architecture.md §7: "Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif." Ini BERTENTANGAN dengan user-flows P6 ("berlaku di ConsentQR berikutnya"); ikuti arsitektur dan catat konfliknya.
   - Simpan lewat server action atau route handler dengan pemeriksaan Origin; galat lewat StatusBanner, generik.
5. Tambah ke tes arsitektur: kata "diagnos" tidak muncul di src/app dan src/components.

Verifikasi (sertakan bukti):
- [ ] Vitest lib/passport: nama panggilan kosong, kode kebutuhan tak dikenal, nol kebutuhan, catatan terlalu panjang, dan kunci tak dikenal (termasuk "diagnosis") → ditolak; simpan ulang mengganti daftar kebutuhan; pasien A tidak bisa membaca atau menyimpan profil pasien B (RLS).
- [ ] Vitest: setelah saveOwnPassport, scanToken (Prompt 7) pada QR yang sudah aktif mengembalikan data terbaru.
- [ ] Browser 320 px, keyboard saja, pasien baru: 8 langkah → pratinjau → simpan → P4 berstatus "lengkap" (screenshot langkah 1, satu langkah kategori, pratinjau, hasil simpan).
- [ ] Ubah profil Pasien Contoh 1: layar terisi data tersimpan; perubahan tersimpan.
- [ ] Draft hanya di memori: isi beberapa langkah lalu muat ulang → isian hilang; localStorage, sessionStorage, IndexedDB, dan document.cookie tidak berisi data paspor.
- [ ] Keluar dengan perubahan → ConfirmDialog muncul; batal mengembalikan fokus dengan benar.
- [ ] Panel pemeriksaan pada langkah 1, satu langkah kategori, langkah catatan, dan pratinjau: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%".
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat di user-flows.md: langkah nama panggilan (P5), draft tanpa penyimpanan perangkat (P5), konflik teks P6 vs architecture.md §7.
2. implementation-plan.md: centang butir P5 dan P6 yang terbukti; Catatan hasil; status Bagian 6 = "1/3".
3. Commit (jangan push): "feat(paspor): editor dan pratinjau MyCare Passport (Bagian 6a)".
4. Laporan akhir.
```

---

## Prompt 11

```text
# Prompt 11 — ConsentQR: pilih fasilitas, field, masa berlaku, tampilan QR, cabut (P9, P11–P12)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 6 (2 dari 3). Kotak waktu: 18:30–19:00. Prompt 10 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: K-11 (P-04 dibangun), K-8 (tidak ada penyimpanan lokal pasien).

Baca HANYA:
- docs/implementation-plan.md: "Bagian 6" (butir P9, P11, P12 dan verifikasi QR).
- docs/user-flows.md HANYA P9, P11, P12.
- architecture.md §7 (termasuk format token dan URL fragmen dari Prompt 7), §13.
- design.md §2B, §5.
- Kode: src/lib/consent, src/lib/passport, src/components (termasuk PatientNeedsSummary).

Batasan:
- Dependensi baru yang boleh HANYA qrcode (sudah disetujui).
- Token hanya hidup di memori halaman: TIDAK boleh muncul di URL halaman, localStorage/sessionStorage/IndexedDB/cookie, log, atau atribut alt.
- Pembuatan dan pencabutan QR hanya lewat src/lib/consent.

Langkah:
1. P9 (/pasien/kunjungan):
   - Paspor belum tersimpan → pesan "Isi paspor dulu" + tautan ke /pasien/paspor.
   - Daftar fasilitas sebagai radio (buat komponen RadioList di src/components bila belum ada, + katalog). Pencarian tidak dibuat (hanya dua fasilitas seed).
   - Satu jalur hari ini: [Saya sudah di fasilitas] → /pasien/kunjungan/qr?fasilitas=<id>. Jalur Pre-Arrival Brief dan mode offline tidak ditampilkan.
2. P11 (/pasien/kunjungan/qr):
   - Toggle per kategori yang benar-benar ada di paspor pasien, plus "Catatan untuk petugas" bila catatan ada. "Nama panggilan selalu dibagikan" ditulis sebagai teks tetap, bukan toggle. Keterangan "Diagnosis tidak ikut".
   - Bawaan toggle [Usulan] = shared_fields consent terakhir pasien (diiris dengan kategori yang masih ada); bila belum pernah, semua aktif. Tidak ada penyimpanan baru.
   - Masa berlaku (radio): 1 jam (bawaan, paling singkat), Hari ini (s.d. 23:59 WIB), 24 jam.
   - Pratinjau langsung "Yang akan dilihat petugas": PatientNeedsSummary tersaring sesuai toggle.
   - Tanpa kategori aktif → StatusBanner peringatan "Pilih minimal satu kebutuhan untuk dibagikan".
   - [Buat QR] → createConsent (server action atau route handler dengan pemeriksaan Origin); [Batal] → P9.
3. P12 — tampil di halaman yang sama setelah QR dibuat (BUKAN rute baru yang memuat token):
   - Fungsi murni buildQrPayload(token) = `${APP_ORIGIN}/s#<token>`. QR SVG dari qrcode: besar, modul text-main di atas putih, quiet zone 4 modul. role="img" dengan alt "ConsentQR untuk <fasilitas>, berlaku sampai <jam> WIB" (tanpa token).
   - Kode manual di bawah QR, berkelompok 4 karakter, berlabel "Kode manual bila kamera petugas tidak bisa dipakai".
   - Ringkasan data yang dibagikan (PatientNeedsSummary tersaring).
   - Masa berlaku sebagai teks statis "Berlaku sampai 14:35 WIB (sisa 52 menit)", diperbarui per menit TANPA aria-live. StatusBanner peringatan "Hampir Kedaluwarsa" sekali saat sisa ≤ 15 menit. Saat habis: StatusBanner galat "QR Kedaluwarsa" + [Buat QR Baru]. Token dihapus dari memori saat kedaluwarsa atau dicabut.
   - Status dipindai: polling tiap 5 detik ke endpoint status milik pasien (ID QR di path, bukan token; Cache-Control: no-store). Status diturunkan dari kunjungan yang dibuka Prompt 7 untuk consent itu — tanpa perubahan skema. Polling berhenti saat dipindai, kedaluwarsa, dicabut, atau tab tersembunyi. Saat dipindai, QR diganti StatusBanner sukses "Dipindai oleh petugas — <fasilitas>" + [Ke Beranda]; [Cabut QR ini] tetap tersedia. P13 tidak dibangun hari ini.
   - [Cabut Sekarang] → ConfirmDialog "Cabut QR ini? QR tidak bisa dipakai lagi." [Batal] [Ya, Cabut] → revokeQr → StatusBanner sukses "QR dicabut" + [Buat QR Baru] [Ke Beranda].
   - Teks di bawah QR: "QR ini hanya tampil sekarang. Bila halaman ditutup, buat QR baru; QR lama tetap aktif sampai kedaluwarsa atau dicabut di Kontrol Akses." Bila pasien punya QR aktif lain, tampilkan tautan ke /pasien/akses/qr.
4. Endpoint status: hanya pemilik QR (RLS). QR milik pasien lain atau tak dikenal → 404 generik yang sama.

Verifikasi (sertakan bukti):
- [ ] Vitest: buildQrPayload menghasilkan tepat origin + "/s#" + 26 karakter Crockford Base32, tanpa data lain.
- [ ] Vitest: bawaan toggle dari consent terakhir (diiris dengan kategori yang ada) dan fallback "semua aktif".
- [ ] Vitest: format sisa waktu dan jam WIB, termasuk durasi "hari ini".
- [ ] Vitest endpoint status: "aktif" lalu "dipindai" + nama fasilitas setelah scanToken; pasien lain → 404 identik dengan QR tak dikenal; tanpa sesi → 401; sesi petugas → 403.
- [ ] Browser: setelah buat QR, address bar, localStorage, sessionStorage, IndexedDB, document.cookie, dan atribut alt tidak memuat token.
- [ ] Simulasi pindai dengan curl: alur OTP tiruan untuk petugas seed fasilitas yang sama (header Origin = APP_ORIGIN) → simpan cookie → POST /api/scan dengan kode dari layar → P12 berubah menjadi "Dipindai oleh petugas — <fasilitas>" dalam ≤ 10 detik.
- [ ] Cabut di P12 → curl pindai dengan kode yang sama → 422 dengan body generik.
- [ ] Log server dev (preview_logs) tidak memuat token.
- [ ] curl -I /pasien/kunjungan/qr → Referrer-Policy: no-referrer.
- [ ] Panel pemeriksaan pada P9, P11, P12 (juga dengan ConfirmDialog terbuka): 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; alur P9 → P12 bisa diselesaikan dengan keyboard saja.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual. Pemindaian dengan kamera sungguhan diverifikasi di Prompt 13.

Selesai:
1. Catat di user-flows.md: P9 hanya jalur "sudah di fasilitas"; P12 QR hanya tampil sekali dan status dipindai lewat polling. Di architecture.md §7 [Usulan]: bawaan shared_fields dari consent terakhir, endpoint status.
2. implementation-plan.md: centang butir P9, P11, P12 yang terbukti; Catatan hasil; status Bagian 6 = "2/3".
3. Commit (jangan push): "feat(consentqr): pilih fasilitas, atur data dan masa berlaku, tampilan QR, cabut (Bagian 6b)".
4. Laporan akhir.
```

---

## Prompt 12

```text
# Prompt 12 — Kontrol akses: riwayat akses dan daftar QR aktif (P18–P20)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 6 (3 dari 3). Kotak waktu: 19:00–19:15 — SANGAT padat. Prioritas:
  (1) P19 riwayat akses + tesnya (P-06, tidak boleh dipotong),
  (2) P20 QR aktif + cabut (P-05),
  (3) P18 halaman pilihan,
  (4) filter di P19 — boleh ditunda bila waktu habis (catat di Catatan hasil).
Prompt 11 harus sudah ter-commit; kalau belum, BERHENTI.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 6" (butir P18–P20 dan verifikasi P19).
- docs/user-flows.md HANYA P18, P19, P20.
- architecture.md §6, §11.
- Kode: src/lib/audit, src/lib/consent (revokeQr, revokeAllActive), migrasi 003 (kebijakan audit_events dan users), src/components.

Batasan:
- Tidak ada dependensi baru.
- Riwayat hanya milik pasien yang masuk. Tidak ada token, nilai profil, atau isi catatan di riwayat — hanya nama field.
- [Laporkan] di P19 TIDAK dibuat hari ini: belum ada layar admin yang menerima laporan, jadi tombol itu akan menjanjikan tindak lanjut yang tidak terjadi.

Langkah:
1. Migrasi 007 — fungsi SECURITY DEFINER untuk riwayat akses. Alasan: RLS melarang pasien membaca tabel users petugas, padahal P19 menampilkan nama petugas.
   - Milik aksespass_owner, SET search_path eksplisit, EXECUTE hanya untuk aksespass_app.
   - Hanya berjalan bila app.role = 'patient'; mengambil audit_subject_id pemanggil dari app.user_id; mengembalikan HANYA event dengan subject_ref itu.
   - Kolom: waktu, jenis event, label pelaku (nama tampilan petugas/pendamping; "Anda" untuk aksi sendiri), nama fasilitas, daftar field. Parameter filter opsional: rentang tanggal dan fasilitas.
2. src/lib/audit: getOwnAccessHistory(session, filter) memanggil fungsi itu lewat withContext, lalu fungsi murni memetakan ke entri tampilan:
   - profile_read → "Data dibuka oleh <petugas> — <fasilitas>" + daftar field dengan label manusiawi (Komunikasi, Mobilitas, …, Nama panggilan, Catatan). qr_scanned tidak ditampilkan terpisah karena selalu berpasangan dengan profile_read.
   - qr_scan_rejected → "Percobaan pindai ditolak — <fasilitas>".
   - qr_created / qr_revoked → "Anda membuat/mencabut QR untuk <fasilitas>".
   - Event lain: label umum tanpa detail. Field tak dikenal tidak dicetak mentah.
3. src/lib/consent: listOwnActiveQrs(session) → QR yang belum kedaluwarsa dan belum dicabut: id, fasilitas, sisa waktu, field yang dibagikan.
4. Layar (semua memakai PageShell dengan tombol Kembali):
   - P18 /pasien/akses: dua kartu [Riwayat Akses] dan [QR Aktif]; kartu QR Aktif menampilkan jumlah QR aktif sebagai teks.
   - P19 /pasien/akses/riwayat: daftar kronologis, terbaru di atas; tiap entri tanggal + jam WIB, pelaku, fasilitas, data yang dilihat. Kosong → "Belum ada akses". [Cabut Semua QR] → ConfirmDialog "Cabut semua QR aktif? Semua QR tidak bisa dipakai lagi." → revokeAllActive → StatusBanner sukses. Filter (prioritas 4): periode (7 hari / 30 hari / semua) dan fasilitas.
   - P20 /pasien/akses/qr: daftar QR aktif; tiap item [Cabut] → ConfirmDialog "QR ini tidak akan bisa dipakai lagi." [Batal] [Ya, Cabut] → revokeQr → item hilang + StatusBanner sukses, fokus pindah ke judul daftar. Kosong → "Tidak ada QR aktif."

Verifikasi (sertakan bukti):
- [ ] Vitest fungsi riwayat: pasien A hanya melihat event miliknya; pasien B tidak melihat event A; konteks petugas/admin/pendamping → galat atau 0 baris; tidak ada token atau nilai profil di hasil; profile_read memuat nama petugas dan field.
- [ ] Vitest: proacl fungsi hanya memberi EXECUTE ke aksespass_app (dan pemilik); proconfig memuat search_path.
- [ ] Vitest: listOwnActiveQrs tidak memuat QR kedaluwarsa, dicabut, atau milik pasien lain.
- [ ] Vitest: revokeQr dan revokeAllActive → scanToken berikutnya ditolak, dan qr_revoked muncul di riwayat.
- [ ] Vitest pemetaan entri: tiap jenis event menghasilkan teks yang benar.
- [ ] Browser, ujung ke ujung: buat QR (P11) → pindai via curl sebagai petugas → P19 menampilkan "Data dibuka oleh <petugas> — <fasilitas>" dengan field yang benar → cabut di P20 → P19 menampilkan pencabutan → curl pindai lagi → 422 → P19 menampilkan "Percobaan pindai ditolak".
- [ ] Akses silang: masuk sebagai Pasien Contoh 2 → riwayat dan QR aktif Pasien Contoh 1 tidak terlihat, termasuk lewat pemanggilan langsung endpoint/aksi dengan sesi Pasien Contoh 2.
- [ ] Panel pemeriksaan pada P18, P19 (berisi dan kosong), P20 (juga dengan ConfirmDialog terbuka): 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; semua bisa dioperasikan dengan keyboard.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat di architecture.md §11 [Usulan]: fungsi riwayat SECURITY DEFINER dan event yang ditampilkan ke pasien. Di user-flows.md P19: [Laporkan] belum dibuat; filter bila ditunda.
2. implementation-plan.md: centang sisa Bagian 6 yang terbukti, termasuk seluruh verifikasi Bagian 6; Catatan hasil; status Bagian 6 = selesai HANYA bila semua verifikasi Bagian 6 lolos.
3. Commit (jangan push): "feat(akses): riwayat akses, QR aktif, dan cabut (Bagian 6c)".
4. Laporan akhir.
```

---

## Prompt 13

```text
# Prompt 13 — Petugas: pindai kamera/kode manual dan layar kebutuhan (T3–T5)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 7 (1 dari 2). Kotak waktu: 19:15–19:50. Prompt 12 harus sudah ter-commit; kalau belum, BERHENTI. Keputusan berlaku: K-4 (satu pesan penolakan generik). Versi terpasang: Next.js 16 (middleware bernama proxy.ts), Tailwind 4.
Prioritas bila mepet:
  (1) jalur kode manual + T5 + pesan galat,
  (2) kamera,
  (3) halaman /s,
  (4) daftar kunjungan di T3,
  (5) mode demo dua perangkat.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 7".
- docs/user-flows.md HANYA T3, T4, T5.
- architecture.md §7 (alur pindai, format token, URL fragmen, kontrak respons /api/scan), §13.
- design.md §2B (status kamera dan QR), §5.
- Kode: route /api/scan, src/lib/consent (normalisasi token), src/lib/http (pemeriksaan Origin), src/components (StatusBanner, TextField, PatientNeedsSummary, PageShell), halaman /petugas dari Prompt 9.

Batasan:
- Dependensi baru yang boleh HANYA html5-qrcode (sudah disetujui). Pakai API tingkat rendah (kelas Html5Qrcode) dengan UI sendiri; JANGAN pakai widget Html5QrcodeScanner (teks Inggris, tidak sesuai design.md). Muat lewat import dinamis hanya di halaman pemindai.
- Data pasien hasil pindai hanya di memori komponen: tidak di URL, storage, cookie, atau log. T4→T5 (dan T6–T9 di Prompt 14) adalah SATU alur client.
- Pemindaian hanya lewat POST /api/scan.

Langkah:
1. Alur petugas di /petugas/pindai sebagai state machine client yang bisa diperluas Prompt 14: memindai → kebutuhan (T5) → [saran, catat, konfirmasi: Prompt 14]. Setiap ganti langkah: document.title berubah dan fokus pindah ke judul langkah.
2. T4 Pindai:
   - [Mulai kamera] — kamera tidak menyala otomatis; izin diminta setelah ketukan. Pratinjau kamera belakang (facingMode environment) berlabel "Arahkan kamera ke QR pasien"; [Hentikan kamera]; StatusBanner role=status "Kamera aktif".
   - Setelah satu hasil terbaca: hentikan kamera dan cegah pemindaian ganda selama request berjalan.
   - Ekstraksi token (fungsi murni, dites): bagian setelah "#" bila ada; selain itu teks apa adanya; potong ke maksimum 64 karakter. Validitas dinilai server.
   - [Masukkan kode manual] selalu tersedia: TextField "Kode ConsentQR (26 karakter)", teks bantuan "Huruf dan angka di bawah QR pasien. Spasi boleh diketik.", autocapitalize="characters", autocomplete="off", spellcheck=false.
   - Galat kamera: izin ditolak → StatusBanner galat ikon Ban "Kamera Ditolak" + "Izinkan kamera di pengaturan peramban, atau masukkan kode manual." + aksi [Masukkan kode manual]. Kamera tidak ada atau bukan secure context → "Kamera Tidak Tersedia" + aksi yang sama.
   - Respons /api/scan:
     • 422 → StatusBanner galat "QR Tidak Dapat Dipakai" + "Minta pasien membuat ConsentQR baru." + [Pindai lagi]; teks dari server, tanpa variasi per alasan.
     • 429 → peringatan "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."
     • 403 → "Akun tidak aktif. Hubungi admin fasilitas." + [Keluar].
     • 401 → /masuk/petugas?alasan=sesi-berakhir.
     • Gagal jaringan → galat "Tidak ada koneksi. Pemindaian ConsentQR membutuhkan internet."
3. T5 Kebutuhan Pasien:
   - StatusBanner sukses "QR Valid", atau peringatan "Hampir Kedaluwarsa — berakhir pukul HH:MM WIB" bila expiresSoon.
   - PatientNeedsSummary dari respons; keterangan "Hanya data yang diizinkan pasien. Diagnosis tidak diminta."
   - [Lihat Saran] (diisi Prompt 14; sementara menuju langkah placeholder yang jujur). [Selesai] membersihkan data dan kembali ke /petugas.
   - [Usulan, bila waktu cukup] Data pasien disembunyikan otomatis setelah 10 menit tanpa interaksi: "Data pasien disembunyikan karena tidak ada aktivitas. Pindai ulang bila perlu." Pindai ulang memakai kunjungan yang sama.
4. Halaman /s (tujuan URL di QR, publik):
   - Client membaca location.hash lalu SEGERA history.replaceState ke "/s", sehingga token hilang dari address bar dan riwayat.
   - Sesi petugas → jalankan komponen alur dari langkah 1 dengan token itu.
   - Bukan petugas → "Halaman ini untuk petugas fasilitas. Bila Anda pasien, tunjukkan QR ini kepada petugas." + tautan masuk petugas. Token tidak diproses.
5. T3 daftar kunjungan hari ini — modul baru src/lib/visits dengan listTodayVisits(session petugas):
   - Kunjungan fasilitas petugas hari ini (WIB), terbaru di atas.
   - Tiap baris: jam, rujukan pendek (4 karakter akhir ID kunjungan), status sebagai teks + ikon dengan warna teks biasa — BUKAN token warna status, agar aturan §14 tetap utuh: "Belum dicatat", "Menunggu konfirmasi", "Dikonfirmasi: Terpenuhi/Sebagian/Belum (oleh pasien/pendamping/di tempat)".
   - TANPA nama panggilan atau data pasien lain (petugas tidak bisa membaca profil tanpa token).
   - Kosong → "Belum ada kunjungan hari ini."
6. Privasi perangkat bersama: /petugas/* dan /s dikirim dengan Cache-Control: no-store. Saat Keluar, state data pasien dibersihkan dan navigasi memakai location.replace, sehingga tombol Back tidak menampilkan data pasien.
7. Mode demo dua perangkat (tulis langkahnya di README):
   - Kamera hanya jalan di secure context; localhost dikecualikan. Skenario yang disarankan: laptop petugas di http://localhost:3000 (kamera laptop), ponsel pasien di http://<IP-LAN>:3000 (pasien tidak butuh kamera).
   - Perluas pemeriksaan Origin dari Prompt 5 agar menerima daftar APP_ORIGINS di env (bawaan = APP_ORIGIN) + tes.
   - Server mendengarkan di 0.0.0.0 hanya saat demo. Bila `next dev` dibuka dari perangkat lain, cek kebutuhan allowedDevOrigins di dokumentasi Next terpasang. Untuk demo, build produksi (pnpm build && pnpm start -H 0.0.0.0) lebih stabil.
   - Peringatan README: di Wi-Fi bersama, siapa pun di jaringan bisa membuka server dan OTP tiruan tampil di layar. Pakai hotspot pribadi, hanya data sintetis, dan matikan server setelah demo. JANGAN memakai tunnel publik (ngrok dsb.) tanpa persetujuan.
   - Ponsel sebagai pemindai butuh HTTPS. Satu-satunya opsi tanpa layanan pihak ketiga: Chrome Android dengan flag "Insecure origins treated as secure" untuk http://<IP-LAN>:3000, diatur sendiri oleh pengguna. iOS tidak punya padanannya.

Verifikasi (sertakan bukti):
- [ ] Vitest: ekstraksi token untuk URL dengan fragmen, kode bergrup spasi/strip, teks acak, dan teks sangat panjang (terpotong 64).
- [ ] Vitest: listTodayVisits — petugas fasilitas B tidak melihat kunjungan fasilitas A; hasil tidak memuat patient_id, nama panggilan, atau field profil; pemetaan status lengkap.
- [ ] Vitest: pemeriksaan Origin menerima semua origin di APP_ORIGINS dan menolak lainnya.
- [ ] Browser, satu peramban bergantian: masuk sebagai Pasien Contoh 1 → buat QR (P11) → baca kode manual dari layar → Keluar → masuk sebagai petugas fasilitas yang sama → /petugas/pindai → kode manual → T5 hanya menampilkan field yang dicentang + "QR Valid".
- [ ] Kode acak 26 karakter, QR yang dicabut, dan QR untuk fasilitas lain → teks galat persis sama dan memberi langkah lanjut.
- [ ] Panel browser tanpa kamera / izin ditolak → "Kamera Tidak Tersedia" atau "Kamera Ditolak", dan jalur kode manual berfungsi.
- [ ] /s#<kode> dengan sesi petugas → T5 tampil dan location.href tidak lagi memuat "#". /s#<kode> tanpa sesi → halaman informasi dan tidak ada request ke /api/scan.
- [ ] T3 menampilkan kunjungan tadi sebagai "Belum dicatat", tanpa data pasien.
- [ ] Keluar dari T5 lalu tekan Back → tidak ada data pasien yang tampil.
- [ ] curl -I /petugas/pindai dan /s → Cache-Control memuat no-store.
- [ ] Kamera sungguhan: QR P12 ditampilkan di ponsel atau layar lain lalu dipindai kamera laptop di localhost → T5 tampil. Bila agent tidak bisa melakukannya, tulis "diuji pengguna" atau "belum diverifikasi" — jangan centang tanpa bukti. Uji kamera belakang ponsel hanya bila opsi Chrome Android dipakai.
- [ ] Log server (preview_logs) selama semua uji tidak memuat token, kode manual, atau nama panggilan.
- [ ] Panel pemeriksaan pada T3, T4 (mode kode manual dan keadaan galat kamera), T5, dan /s tanpa sesi: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; T4→T5 bisa diselesaikan dengan keyboard.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat di user-flows.md: T3 tanpa jalur kartu cetak dan tanpa data pasien di daftar; halaman /s. Di architecture.md §7/§13 [Usulan]: ekstraksi token, /s, APP_ORIGINS, no-store halaman petugas, auto-sembunyi (bila dibuat).
2. implementation-plan.md: centang butir T3, T4, T5 yang terbukti; Catatan hasil; status Bagian 7 = "1/2".
3. Commit (jangan push): "feat(petugas): pindai kamera dan kode manual, layar kebutuhan, halaman /s, daftar kunjungan (Bagian 7a)".
4. Laporan akhir.
```

---

## Prompt 14

```text
# Prompt 14 — Petugas: saran tindakan, catat bantuan ≤3 ketukan, kirim konfirmasi (T6, T8–T9)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 7 (2 dari 2). Kotak waktu: 19:50–20:30. Prompt 13 harus sudah ter-commit; kalau belum, BERHENTI.
Prioritas bila mepet:
  (1) T6 saran + T8 catat + T9 kirim (T-03, T-04 Must),
  (2) aturan "jawaban pasien penentu utama" di lib/careproof,
  (3) Konfirmasi di Tempat.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 7".
- docs/user-flows.md HANYA T6, T8, T9 (dan P16 untuk arti status konfirmasi).
- architecture.md §6 (accommodation_rules, visits, visit_confirmations), §9 (paragraf "Resolusi Kepemilikan Konfirmasi CareProof"), §11, §13 (baris catatan bebas petugas).
- docs/proposal.md fitur 3 — hanya sebagai rujukan isi aturan seed.
- Kode: alur /petugas/pindai (Prompt 13), src/lib/visits, src/lib/consent (bagian membuka kunjungan), src/lib/audit, src/components (ChoiceGroup, CareProofScale, TextField, StatusBanner).

Batasan:
- Tidak ada dependensi baru.
- Saran HANYA untuk kebutuhan yang dibagikan pasien pada pindai ini (kode kebutuhan dari respons pindai di memori). Aturan untuk kebutuhan yang tidak dibagikan tidak boleh dihitung atau ditampilkan.
- Catatan petugas tidak pernah masuk audit atau log.
- TIDAK dibuat hari ini: [Panggil Pasien]/notifikasi (P-13, Could), T7 KomunikaCare (10B), draft lokal T8 dan antrean offline (Bagian 9).

Langkah:
1. Migrasi 008 — menambal celah dari Prompt 7: petugas tidak bisa membaca consents/users tanpa token, padahal audit visit_recorded dan visit_confirmed perlu menyebut pasiennya.
   - Tambah visits.subject_ref (pseudonim pasien), diisi saat kunjungan dibuka di scanToken (ubah lib/consent seperlunya) + backfill baris lama.
   - Bila kolom bantuan di visits belum cocok untuk menyimpan ID aturan, sesuaikan di migrasi yang sama.
2. src/lib/accommodation (Smart Accommodation Engine):
   - getPublishedRules(needCodes): hanya aturan published untuk kode itu.
   - Fungsi murni buildSuggestions(rules, needCodes): satu saran per aturan (ikon, teks pendek, sumber, versi); teks duplikat digabung; urut per kategori; kebutuhan tanpa aturan dikembalikan terpisah sebagai "belum ada saran".
   - Dipanggil lewat server action atau route handler yang mewajibkan sesi petugas.
3. T6 Saran Tindakan:
   - Label tetap "Saran, bukan instruksi klinis. Keputusan tetap di tangan tenaga kesehatan."
   - Daftar saran: ikon + teks besar; sumber dan versi aturan sebagai teks kecil. "Belum ada saran untuk: <label>" bila ada.
   - Teks panduan "Panggil pasien secara langsung dan visual sesuai saran di atas."
   - Tombol utama [Lanjut: Catat Bantuan] → T8.
4. T8 Catat Bantuan (≤ 3 ketukan):
   - ChoiceGroup berisi saran T6, SEMUA tercentang di awal [Usulan], dengan instruksi "Hapus centang bantuan yang tidak diberikan."
   - Catatan opsional: varian textarea di TextField (tambahkan ke komponen + katalog bila belum ada); batas panjang = CHECK di DB dengan penghitung; teks bantuan "Jangan menulis diagnosis atau data sensitif."
   - [Simpan] → src/lib/visits.recordAssistance(session petugas, visitId, ruleIds, note), dalam satu withContext:
     • kunjungan milik fasilitas petugas (RLS) dan belum dicatat; sudah dicatat → 409 "Kunjungan ini sudah dicatat" (UI menawarkan lanjut ke T9);
     • ruleIds harus aturan published; catatan melebihi batas → ditolak di server;
     • UPDATE baris kunjungan yang sama (tidak ada duplikat), set recorded_at;
     • audit visit_recorded (pelaku petugas, subject_ref dari visits, fasilitas; tanpa catatan).
   - Selama menyimpan: tombol aria-busy dan tidak bisa diketuk dua kali. Gagal jaringan → "Tidak ada koneksi. Coba simpan lagi." (isian tetap di memori).
5. src/lib/careproof — dipakai juga Prompt 15 (pasien) dan Prompt 16 (pendamping):
   - confirmVisit(actor, visitId, {status, unmetNeedCodes}): status ∈ terpenuhi/sebagian/belum; unmetNeedCodes ⊆ katalog; kunjungan harus sudah dicatat; confirmed_by mengikuti actor (patient/companion/on_site).
   - Aturan §9: jawaban pasien penentu utama. Pasien boleh menimpa jawaban pendamping/di tempat; pendamping/di tempat TIDAK boleh menimpa jawaban pasien (409 "Pasien sudah mengonfirmasi").
   - Audit visit_confirmed dengan confirmed_by, tanpa isi lain.
6. T9 Kirim Permintaan Konfirmasi:
   - Ringkasan bantuan yang dicatat.
   - [Kirim ke Pasien]: kunjungan berstatus "Menunggu konfirmasi pasien". Tidak ada push; tampilkan apa adanya "Pasien akan melihat permintaan konfirmasi saat membuka aplikasinya." Kembali ke T3, data pasien dibersihkan dari memori.
   - [Konfirmasi di Tempat]: CareProofScale untuk pasien di perangkat petugas, dengan keterangan "Jawaban ini ditandai 'di tempat'". Bila Sebagian/Belum, pasien memilih kebutuhan yang belum terpenuhi (dari kode kebutuhan pindai ini) → confirmVisit(on_site) → StatusBanner sukses → kembali ke T3.
7. Tambah ke tes arsitektur: tabel visits dan visit_confirmations hanya disentuh dari src/lib/consent (membuka kunjungan), src/lib/visits, src/lib/careproof, src/db, dan tes.

Verifikasi (sertakan bukti):
- [ ] Vitest buildSuggestions: tiap profil seed (Tuli, autistik, low vision, mobilitas) menghasilkan saran sesuai aturan seed; aturan Draft tidak muncul; kebutuhan tanpa aturan muncul sebagai "belum ada saran"; kode kebutuhan yang tidak dibagikan tidak menghasilkan saran.
- [ ] Vitest recordAssistance: catatan melebihi batas ditolak; ruleId yang tidak published ditolak; petugas fasilitas lain ditolak; simpan kedua → 409 tanpa baris baru; audit visit_recorded memuat subject_ref dan tidak memuat catatan.
- [ ] Vitest confirmVisit: on_site tersimpan dengan confirmed_by on_site; pasien menimpa on_site → berhasil; on_site atau pendamping setelah pasien → 409; kunjungan belum dicatat → ditolak; audit visit_confirmed ada.
- [ ] Browser, ujung ke ujung (QR dibuat pasien lalu dipindai petugas seperti di Prompt 13): T5 → T6 menampilkan saran hanya untuk kebutuhan yang dibagikan → T8 → simpan. Hitung ketukan dari T8 terbuka sampai tersimpan (contoh: hapus satu centang + [Simpan] = 2 ketukan, ≤ 3) dan tulis hitungannya.
- [ ] [Kirim ke Pasien] → T3 menampilkan "Menunggu konfirmasi". Kunjungan kedua lewat [Konfirmasi di Tempat] dengan "Sebagian" → T3 menampilkan "Dikonfirmasi: Sebagian (di tempat)".
- [ ] Penanda unik sintetis di catatan petugas tidak muncul di log server (preview_logs) maupun audit_events.
- [ ] Panel pemeriksaan pada T6, T8 (dengan dan tanpa catatan), T9, dan skala Konfirmasi di Tempat: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; alur T6→T9 bisa diselesaikan dengan keyboard.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat di user-flows.md: T6 tanpa [Panggil Pasien]; T7 dilewati hari ini; T8 tanpa draft lokal dan semua saran tercentang di awal; arti [Kirim ke Pasien]. Di architecture.md [Usulan]: §6 (visits.subject_ref; bantuan disimpan sebagai ID aturan sehingga versi aturan yang dipakai terkunci), §9 (aturan penimpaan jawaban di lib/careproof).
2. implementation-plan.md: centang sisa Bagian 7 yang terbukti; Catatan hasil; status Bagian 7 = selesai bila semua verifikasi lolos. Uji kamera belakang ponsel yang belum bisa dilakukan dicatat sebagai sisa pekerjaan, bukan dicentang.
3. Commit (jangan push): "feat(petugas): saran tindakan, catat bantuan, dan permintaan konfirmasi (Bagian 7b)".
4. Laporan akhir.
```

---

## Prompt 15

```text
# Prompt 15 — CareProof pasien + dashboard admin (P16, A3, A6)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 8. Kotak waktu: 20:30–21:30. Prompt 14 harus sudah ter-commit; kalau belum, BERHENTI.
Cakupan hari ini: P16 dan P17 versi minimal (P-07), A3 dan A6 (A-02). TIDAK dibuat: A4–A5, A7–A8, status tindak lanjut di P17 (P-08), catatan bebas di P16, antrean offline.
Keputusan berlaku: K-10 ambang kelompok = 5; statistik hanya dari pasien yang setuju (users.stats_consent, layar P3).
Prioritas bila mepet:
  (1) fungsi agregat + tes privasinya,
  (2) A6,
  (3) P16,
  (4) A3,
  (5) data seed tambahan.
Garis potong: bila pukul 21:30 verifikasi Bagian 8 belum lolos, Prompt 16 dilewati.

Baca HANYA:
- docs/implementation-plan.md: "Bagian 8", dan Catatan hasil Bagian 7 (cara bantuan disimpan oleh Prompt 14).
- docs/user-flows.md HANYA P16, P17, A3, A6.
- docs/proposal.md fitur 5 dan 7 (definisi CareProof dan Accommodation Fulfillment Rate).
- architecture.md §6, §9 (paragraf "Resolusi Kepemilikan Konfirmasi CareProof"), §11.
- Kode: src/lib/careproof dan src/lib/visits (Prompt 14), src/lib/passport, migrasi 001 (visits, visit_confirmations, users.stats_consent), scripts/db-seed.mjs, src/components (CareProofScale, ChoiceGroup, StatusBanner, PageShell).

Batasan:
- Tidak ada dependensi baru. Grafik dibuat dengan HTML/CSS (tabel + batang CSS), tanpa pustaka chart.
- Admin fasilitas TIDAK membaca baris kunjungan, konfirmasi, atau pasien. Semua angka dashboard berasal dari satu fungsi SECURITY DEFINER yang menerapkan ambang DI DALAM database; angka yang disembunyikan tidak pernah keluar dari DB.
- Tidak ada ID, nama, telepon, atau preferred_name pasien di respons dashboard maupun log.

Langkah:
1. Definisi metrik [Usulan, catat di architecture.md §6]:
   - Kunjungan yang dihitung: recorded_at terisi, dalam periode (zona Asia/Jakarta), milik pasien dengan users.stats_consent = true. Dipakai nilai saat ini: bila pasien mencabut persetujuan, kunjungannya ikut keluar.
   - Accommodation Fulfillment Rate (AFR) = kunjungan "terpenuhi" / seluruh kunjungan yang dihitung. "Belum dikonfirmasi" ikut penyebut tetapi tidak pernah dihitung berhasil (proposal fitur 5).
   - Rincian status: terpenuhi, sebagian, belum, belum dikonfirmasi.
   - Rincian penjawab (sub-metrik §9): pasien, pendamping, di tempat — dipisah, tidak digabung diam-diam.
   - Per kategori: jumlah kebutuhan belum terpenuhi (unmet_need_codes → kategori di needs_catalog).
   - Ambang K-10 berlaku pada JUMLAH PASIEN BERBEDA per sel, bukan jumlah kunjungan: sel dengan < 5 pasien berbeda disembunyikan. Alasan: 20 kunjungan dari satu pasien tetap bisa dikenali.
2. Migrasi 009 — fungsi SECURITY DEFINER dashboard (milik aksespass_owner, SET search_path eksplisit, EXECUTE hanya aksespass_app):
   - Hanya berjalan bila app.role = 'facility_admin'. Fasilitas SELALU diambil dari app.facility_id; parameter tidak bisa memilih fasilitas lain.
   - Parameter: rentang bulan. Keluaran: tren per bulan dan, untuk periode terpilih, total kunjungan, AFR, rincian status, rincian penjawab, rincian kategori. Sel di bawah ambang dikembalikan sebagai "tersembunyi" tanpa angka.
3. src/lib/dashboard: memanggil fungsi lewat withContext; ambang sebagai konstanta (5) yang mudah diubah.
4. Data seed sintetis (scripts/db-seed.mjs), agar dashboard demo tidak kosong dan tes bermakna:
   - Tambah "Pasien Contoh 5…N" yang setuju statistik, dengan kunjungan + konfirmasi 3 bulan terakhir, sehingga minimal satu bulan dan beberapa kategori di Fasilitas A punya ≥ 5 pasien berbeda.
   - Pertahankan minimal satu pasien yang TIDAK setuju statistik (saat ini Pasien Contoh 4) untuk tes pengecualian.
   - Pastikan ada konfirmasi "pendamping" dan "di tempat" dari pasien yang setuju statistik, agar sub-metrik terlihat saat demo. Konfirmasi pendamping hanya dari pendamping yang memang tertaut ke pasien itu (tambah tautan sintetis bila perlu).
   - Tetap nomor palsu yang jelas dan label "Contoh"; perbarui tes jumlah baris seed.
5. A6 /admin/dashboard:
   - Pilihan periode: bulan berjalan dan 2 bulan sebelumnya.
   - AFR besar sebagai angka + teks ("72% kunjungan kebutuhannya terpenuhi"). Tren bulanan sebagai tabel ber-caption + batang CSS (batang aria-hidden; angka selalu tertulis).
   - Tabel rincian status, rincian penjawab (keterangan "Jawaban pendamping dan di tempat ditandai terpisah"), dan rincian per kategori.
   - Sel tersembunyi ditulis "Disembunyikan (kurang dari 5 pasien)". Tanpa data → "Belum ada data kunjungan".
   - Keterangan tetap: "Semua angka agregat dan anonim. Hanya pasien yang menyetujui statistik yang dihitung."
6. A3 /admin (menggantikan beranda sementara Prompt 9): ringkasan bulan berjalan dari fungsi yang sama (jumlah kunjungan, AFR, jumlah kebutuhan belum terpenuhi), tombol ke A6, [Keluar]. Menu Akun Petugas (A4) dan Belum Terpenuhi (A7) tidak ditampilkan hari ini.
7. P16 sisi pasien:
   - src/lib/careproof: listOwnConfirmations(session pasien) → kunjungan tercatat 30 hari terakhir yang (a) belum dikonfirmasi, atau (b) dijawab pendamping/di tempat dan masih bisa diubah pasien (§9). Isi: tanggal, nama fasilitas, bantuan yang dicatat (label dari kolom bantuan Prompt 14), jawaban saat ini beserta penjawabnya. Profil pasien dibaca lewat src/lib/passport, bukan langsung.
   - P4: kartu "Konfirmasi kunjungan" berisi jumlah yang menunggu → /pasien/konfirmasi.
   - /pasien/konfirmasi/<visitId>: "Apakah kebutuhan Anda terpenuhi?" + daftar bantuan yang dicatat + CareProofScale. Sebagian/Belum → ChoiceGroup kebutuhan yang belum terpenuhi (hanya kebutuhan pasien di kategori yang dibagikan pada kunjungan itu) → [Kirim] → confirmVisit(patient). Jawaban pendamping/di tempat yang sudah ada ditampilkan dan boleh diganti, dengan teks "Jawaban Anda menggantikan jawaban pendamping/di tempat."
   - P17 minimal: StatusBanner sukses "Terima kasih, jawaban tersimpan" + ringkasan jawaban + [Kembali ke Beranda].

Verifikasi (sertakan bukti):
- [ ] Vitest fungsi dashboard: pasien yang tidak setuju statistik tidak dihitung sama sekali; "belum dikonfirmasi" masuk penyebut, tidak masuk pembilang; AFR cocok dengan hitungan manual dari seed (tulis hitungannya); rincian penjawab terpisah.
- [ ] Vitest ambang: sel dengan 4 pasien berbeda (walau banyak kunjungan) → tersembunyi tanpa angka; 5 pasien → tampil.
- [ ] Vitest akses: admin Fasilitas B tidak bisa memperoleh angka Fasilitas A dengan parameter apa pun; peran pasien/petugas/pendamping → galat; admin tetap 0 baris saat SELECT langsung ke visits, visit_confirmations, patient_profiles; proacl dan search_path benar.
- [ ] Vitest: serialisasi JSON respons dashboard tidak memuat UUID pasien, nama, telepon, atau preferred_name.
- [ ] Vitest P16: listOwnConfirmations hanya milik pasien sendiri; pasien mengganti jawaban on_site → tersimpan confirmed_by patient; kunjungan pasien lain → ditolak.
- [ ] Browser ujung ke ujung: kunjungan yang dicatat di Prompt 14 → masuk sebagai pasiennya → P4 menampilkan 1 menunggu → P16 pilih "Sebagian" + kebutuhan → P17 → masuk sebagai petugas → T3 menampilkan "Dikonfirmasi: Sebagian (oleh pasien)".
- [ ] Browser: /admin dan /admin/dashboard untuk admin Fasilitas A menampilkan angka seed; sel kecil tertulis "Disembunyikan…"; admin Fasilitas B hanya melihat data B.
- [ ] Panel pemeriksaan pada /pasien/konfirmasi, P16 (keadaan Sebagian), P17, /admin, /admin/dashboard: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; tabel punya caption dan header; tidak ada informasi yang hanya disampaikan lewat warna atau panjang batang.
- [ ] Log server (preview_logs) selama uji tidak memuat nama panggilan atau ID pasien.
- [ ] Tes arsitektur lolos (lib/dashboard tidak menyentuh tabel visits/visit_confirmations secara langsung).
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual.

Selesai:
1. Catat di architecture.md [Usulan]: definisi AFR, ambang per pasien berbeda, filter stats_consent, fungsi dashboard. Di user-flows.md: A3/A6 versi hari ini; P16 tanpa catatan bebas; P17 tanpa status tindak lanjut.
2. implementation-plan.md: centang Bagian 8 yang terbukti; Catatan hasil, termasuk jam selesai (untuk keputusan garis potong Prompt 16); ubah status.
3. Commit (jangan push): "feat(careproof): konfirmasi pasien dan dashboard kesenjangan aksesibilitas (Bagian 8)".
4. Laporan akhir.
```

---

## Prompt 16

```text
# Prompt 16 — Pendamping: akun, tautan, persetujuan, kelola dan konfirmasi atas nama pasien (D1–D8, P21)

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 10A. Kotak waktu: 21:30–22:45.
GARIS POTONG: jalankan HANYA bila Bagian 8 (Prompt 15) sudah lolos verifikasi dan ter-commit sebelum 21:30. Kalau tidak, BERHENTI dan lanjut ke Prompt 17.
Keputusan berlaku: K-7 pendamping berakun sendiri (pendaftaran D2 sudah ada sejak Prompt 9).
Prioritas bila mepet (potong dari belakang):
  (1) tautan: kode → permintaan → persetujuan pasien → cabut (D-01, P-16), beserta tes RLS,
  (2) konfirmasi CareProof atas nama pasien (D-03),
  (3) kelola paspor atas nama pasien (D-02),
  (4) buat ConsentQR atas nama pasien (D-02).
TIDAK dibuat: D7 status antrean/panggilan (P-13), kartu cetak di D6, pindai kode tautan dengan kamera (cukup ketik kode).

Baca HANYA:
- docs/implementation-plan.md: "Bagian 10" (10A).
- docs/user-flows.md HANYA P21, D1–D8.
- architecture.md §2, §6 (companions), §9 (paragraf "Resolusi Kepemilikan Konfirmasi CareProof"), §11.
- Kode: migrasi 001 dan kebijakan RLS companions/patient_profiles/consents/visits (002–009), src/lib/{passport,consent,careproof,audit}, editor paspor (Prompt 10), P11/P12 (Prompt 11), P16 (Prompt 15).

Batasan:
- Tidak ada dependensi baru.
- Pendamping TIDAK bisa membaca data pasien apa pun sebelum pasien menyetujui, dan kehilangan akses seketika setelah dicabut. Ini ditegakkan oleh RLS, bukan hanya UI.
- Setiap tindakan pendamping tercatat dengan actor_role companion.
- Pendamping tidak bisa melihat riwayat akses pasien (P19) dan tidak bisa menimpa jawaban CareProof pasien.
- Pesan galat kode tautan generik: tidak membocorkan apakah kode pernah ada.

Langkah:
1. Migrasi 010:
   - Tabel companion_link_codes: pasien, code_hash, expires_at, used_at. Kode 8 karakter Crockford Base32, berlaku 10 menit, sekali pakai, disimpan sebagai HMAC dengan HASH_PEPPER (entropinya rendah, jadi wajib ber-pepper dan ber-rate limit).
   - companions.patient_subject_ref (pseudonim pasien), diisi saat tautan dibuat, agar audit tindakan pendamping bisa menyebut pasien tanpa membaca tabel users.
   - Fungsi SECURITY DEFINER (milik aksespass_owner, search_path eksplisit, EXECUTE hanya aksespass_app):
     • redeem kode (hanya app.role = companion): validasi kode → tandai terpakai → buat atau perbarui baris companions menjadi pending → audit companion_link_requested. Ingat UNIQUE (patient_user_id, companion_user_id): baris revoked diaktifkan ulang menjadi pending, bukan baris baru.
     • daftar pendamping milik pasien (hanya app.role = patient): id tautan, display_name pendamping, status, waktu — tanpa telepon/email.
   - Lengkapi kebijakan RLS bila belum ada: pendamping berstatus active boleh membaca dan mengubah profil + kebutuhan pasien itu, membuat consents/consent_qr untuknya, membaca kunjungannya, dan membuat visit_confirmations untuknya. Status pending atau revoked = tanpa akses.
2. src/lib/companions:
   - createLinkCode(session pasien) → kode + expiresAt. Kode hanya dikembalikan sekali; tidak disimpan dalam bentuk asli dan tidak dicatat di log.
   - redeemLinkCode(session pendamping, kode): rate limit per pendamping dan per HMAC(IP) di Postgres; galat generik "Kode tidak dapat dipakai. Minta kode baru ke pasien."
   - approve / reject / revoke (hanya pasien pemilik): approve → active + audit companion_linked; reject dan revoke → revoked + audit companion_unlinked.
   - listOwnCompanions(pasien) dan listLinkedPatients(pendamping): preferred_name, status paspor, jumlah konfirmasi menunggu.
3. Perluas actor pendamping di modul yang sudah disiapkan:
   - lib/passport: simpan atas nama pasien → isi last_updated_by_companion_id/at + audit profile_changed_by_companion (subject dari companions.patient_subject_ref).
   - lib/consent.createConsent: created_by_user_id = pendamping; audit qr_created dengan actor companion. Endpoint status QR P12 juga terbuka untuk pendamping aktif pasien itu.
   - lib/careproof.confirmVisit: confirmed_by companion; 409 bila pasien sudah menjawab (aturan dari Prompt 14).
   - Pemetaan riwayat P19 (Prompt 12): profile_changed_by_companion → "Paspor diubah oleh <pendamping>"; companion_linked/unlinked → "Pendamping <nama> ditautkan/dilepas".
4. Layar pasien — P21 /pasien/pendamping:
   - Daftar pendamping dengan status sebagai teks + ikon (Aktif, Menunggu Persetujuan).
   - [Tambah Pendamping] → kode besar berkelompok + "Berlaku 10 menit" + instruksi "Berikan kode ini kepada pendamping Anda."
   - Permintaan menunggu: nama pendamping + [Setujui] / [Tolak]; bisa dilakukan dengan pembaca layar.
   - [Cabut Tautan] → ConfirmDialog "Cabut tautan dengan <nama>? Pendamping langsung kehilangan akses." [Batal] [Ya, Cabut].
   - P4/P5: bila paspor terakhir diubah pendamping, tampilkan "Terakhir diubah oleh pendamping <nama>, <tanggal>".
5. Layar pendamping:
   - D4 /pendamping: kartu per pasien tertaut aktif (nama panggilan, status paspor, jumlah konfirmasi menunggu) + [Tautkan Pasien]. Bila ada tautan yang berakhir: "Satu tautan telah berakhir." (tanpa data pasien).
   - D3 /pendamping/tautkan: TextField kode (8 karakter) → [Ajukan Tautan] → "Menunggu persetujuan pasien".
   - Rute per pasien memakai ID tautan (bukan ID pasien):
     • /pendamping/tautan/<linkId>/paspor — D5: editor Prompt 10 dengan label "Atas nama <nama panggilan>";
     • /pendamping/tautan/<linkId>/qr — D6: P11/P12 atas nama pasien;
     • /pendamping/tautan/<linkId>/konfirmasi — D8: P16 dengan penanda "Dijawab oleh pendamping"; bila pasien sudah menjawab, tampilkan jawaban pasien tanpa bisa diubah.
6. Tambah ke tes arsitektur: companion_link_codes hanya disentuh dari src/lib/companions, src/db, dan tes.

Verifikasi (sertakan bukti):
- [ ] Vitest RLS: pendamping pending tidak bisa membaca profil, consent, kunjungan, atau konfirmasi pasien (0 baris); setelah disetujui bisa; setelah dicabut kembali 0 baris pada request berikutnya, tanpa perlu keluar.
- [ ] Vitest kode: kode benar → pending; kode kedaluwarsa, sudah dipakai, dan acak → galat identik; rate limit memblokir setelah batas dan tetap memblokir setelah pool dibuat ulang; companion_link_codes tidak menyimpan kode asli.
- [ ] Vitest: tautan yang pernah dicabut bisa diajukan ulang tanpa melanggar UNIQUE.
- [ ] Vitest: pendamping mengubah paspor → last_updated_by_companion terisi + audit profile_changed_by_companion dengan actor_role companion; pasien melihatnya di P19.
- [ ] Vitest: pendamping membuat QR → consents.created_by_user_id = pendamping; pindai oleh petugas berhasil seperti biasa.
- [ ] Vitest: konfirmasi pendamping tersimpan confirmed_by companion; setelah pasien menjawab, pendamping → 409; pasien menimpa jawaban pendamping → berhasil; dashboard Prompt 15 menghitungnya di sub-metrik pendamping.
- [ ] Vitest: pendamping memanggil fungsi riwayat P19 → galat/0 baris; pendamping tidak bisa menyetujui tautannya sendiri.
- [ ] Browser ujung ke ujung (satu peramban bergantian): pasien buat kode di P21 → keluar → daftar pendamping baru lewat /masuk ("Saya pendamping pasien") → D3 masukkan kode → keluar → pasien setujui di P21 → keluar → pendamping melihat pasien di D4 → ubah paspor (D5) → buat QR (D6) → keluar → pasien melihat "Terakhir diubah oleh pendamping" dan entri riwayat → pasien cabut tautan → pendamping membuka D4: pasien hilang dan muncul "Satu tautan telah berakhir."
- [ ] Log server (preview_logs) tidak memuat kode tautan, nama panggilan, atau telepon.
- [ ] Panel pemeriksaan pada P21 (kode tampil dan permintaan menunggu), D3, D4, D5, D6, D8: 0 pelanggaran axe, tidak ada target < 48 px, tidak ada scroll horizontal pada 320 px dan "Teks 200%"; semua bisa dioperasikan dengan keyboard.
- [ ] Tes arsitektur lolos.
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos.
Bila panel browser tidak tersedia, tulis bahwa verifikasi visual belum dilakukan dan JANGAN centang butir visual. Bagian yang terpotong karena waktu ditulis jelas di Catatan hasil, tidak dicentang.

Selesai:
1. Catat di architecture.md [Usulan]: kode tautan (format, masa berlaku, HMAC), companions.patient_subject_ref, fungsi SECURITY DEFINER, kebijakan RLS pendamping; ganti rute `pendamping/[token]/` di §5 dengan rute berbasis akun + ID tautan. Di user-flows.md: D3 tanpa pindai kamera, D7 tidak dibuat, D6 tanpa kartu cetak.
2. implementation-plan.md: centang 10A yang terbukti; Catatan hasil; ubah status.
3. Commit (jangan push): "feat(pendamping): tautan dengan persetujuan pasien, kelola dan konfirmasi atas nama pasien (Bagian 10A)".
4. Laporan akhir.
```

---

## Prompt 17

```text
# Prompt 17 — Skenario demo, uji ulang menyeluruh, dan daftar klaim berbukti

Konteks: AKSESPASS, tenggat hari ini 23:59 WIB. Bagian 11 (terakhir). Kotak waktu: 22:45–23:45. Semua prompt sebelumnya yang dijalankan harus sudah ter-commit; kalau ada perubahan yang belum ter-commit, BERHENTI dan laporkan.
MULAI SEKARANG KODE DIBEKUKAN: tidak ada fitur baru. Perubahan kode hanya untuk bug yang merusak demo, masing-masing dengan tes dan dicatat.
Prioritas bila mepet:
  (1) pemeriksaan hijau pada commit demo + perintah reset,
  (2) docs/demo.md (skrip + runbook),
  (3) tes kebocoran gabungan,
  (4) daftar klaim berbukti,
  (5) gladi dua kali,
  (6) daftar periksa pembaca layar untuk manusia,
  (7) cek sumber angka latar belakang.
Yang tidak sempat dikerjakan ditulis "belum" di Catatan hasil — jangan dicentang.

Baca HANYA:
- docs/implementation-plan.md: tabel Status, "Jalur 13 Okt 2026", "Bagian 11", dan SEMUA "Catatan hasil" (sumber bukti).
- architecture.md §12 (paragraf "Klaim privasi"), §15, §16.
- SOUL.md §2.
- docs/proposal.md (latar belakang, metrik, catatan).
- docs/user-flows.md bagian "Keputusan".
- README (mode demo dua perangkat dari Prompt 13).

Batasan:
- Tidak ada dependensi baru.
- Semua data demo sintetis dari seed. Nomor uji yang dicantumkan hanya nomor palsu dari seed. Tidak ada rahasia (.env.local, SESSION_SECRET, HASH_PEPPER) yang ditulis ke dokumen, log, atau chat.
- Jangan mengklaim apa pun tanpa bukti yang tercatat (SOUL.md §2). Jangan mengarang sumber atau angka.

Langkah:
1. Pemeriksaan awal pada commit yang akan didemokan: pnpm lint, pnpm typecheck, pnpm test, pnpm build. Bila gagal, perbaiki hanya yang merusak demo; selain itu catat.
2. Perintah reset demo: skrip package.json `demo:reset` = db:reset + db:migrate + db:seed pada database _dev (guard db:reset tetap berlaku). Uji dua kali.
3. docs/demo.md:
   a. Runbook sebelum demo:
      - hotspot pribadi, bukan Wi-Fi venue;
      - .env.local: OTP_MODE=dev-display, APP_ORIGINS memuat localhost dan IP LAN laptop;
      - pnpm demo:reset → pnpm build → pnpm start -H 0.0.0.0;
      - izin kamera laptop di localhost sudah diberikan sebelum demo;
      - ponsel pasien membuka http://<IP-LAN>:3000;
      - daftar akun uji sintetis dari seed (peran, nomor palsu, fasilitas);
      - setelah demo: matikan server.
   b. Skrip demo 5–7 menit, jalur Must, dengan perangkat dan peran tiap langkah:
      1) Pasien (ponsel): masuk dengan OTP tiruan → paspor tanpa diagnosis.
      2) Pasien: Mulai Kunjungan → Puskesmas Contoh A → bagikan sebagian data → masa berlaku 1 jam → QR.
      3) Petugas (laptop): pindai kamera → T5 hanya data yang dicentang → T6 saran "bukan instruksi klinis" → T8 catat (hitung ketukan) → T9 kirim.
      4) Pasien: P12 "Dipindai oleh petugas" → P16 jawab "Sebagian".
      5) Pasien: Riwayat Akses menampilkan siapa membuka data apa → QR Aktif → Cabut.
      6) Petugas: pindai kode yang sama → "QR Tidak Dapat Dipakai" (pesan generik).
      7) Admin: dashboard — AFR, tren, rincian penjawab, sel "Disembunyikan (kurang dari 5 pasien)", hanya pasien yang setuju statistik.
      8) Hanya bila Prompt 16 selesai — Pendamping: tautan dengan persetujuan pasien; jawaban "oleh pendamping" terpisah di dashboard.
      9) Penutup: roadmap.
   c. Cadangan untuk langkah berisiko:
      - kamera gagal → kode manual;
      - jaringan putus → jelaskan bahwa pindai ConsentQR memang butuh server (by design);
      - ponsel bermasalah → sisi pasien di jendela laptop kedua;
      - Prompt 16 tidak selesai → lewati langkah 8.
   d. Peta pertanyaan juri → langkah demo + bukti: privasi (langkah 2, 5, 6) dan dashboard (langkah 7).
4. Tes kebocoran gabungan (Vitest, tingkat lib, satu alur penuh): masuk OTP → simpan paspor → buat QR → pindai → saran → catat bantuan → konfirmasi → dashboard → pendamping (bila ada).
   Pakai penanda unik sintetis untuk nama panggilan, catatan pasien, catatan petugas, token, kode OTP, nomor telepon, dan kode tautan. Pastikan penanda TIDAK muncul di:
   - output logger yang ditangkap;
   - tabel audit_events, rate_limit_hits, otp_codes, consent_qr, sessions;
   - respons dashboard;
   - kolom mana pun selain tempat semestinya (cek semua kolom teks lewat information_schema, via URL admin).
   Tambahan:
   - grep .next/static untuk nilai SESSION_SECRET dan HASH_PEPPER — skrip hanya mencetak "ditemukan/tidak ditemukan", tidak pernah mencetak nilainya;
   - `git ls-files` tidak memuat .env.local.
5. docs/klaim-demo.md — tabel klaim untuk presentasi: klaim | status (Terbukti / Sebagian / Belum) | bukti (nama tes, Catatan hasil bagian mana, atau uji manual) | kalimat yang boleh diucapkan. Minimal mencakup:
   - QR tidak berisi data pasien.
   - Data dibaca saat dipindai dan bisa dicabut kapan saja.
   - Petugas hanya melihat data yang dicentang, ditegakkan sampai database (RLS).
   - Setiap pembukaan data tercatat dan bisa dilihat pasien.
   - Pesan penolakan tidak membocorkan keberadaan token.
   - Diagnosis: pakai "Aplikasi tidak meminta diagnosis dan tidak punya kolom diagnosis" — BUKAN "diagnosis tidak pernah ke server" (§12: fitur diagnosis lokal tidak dibangun, dan kolom catatan bebas bisa diisi apa saja oleh pengguna).
   - Catat bantuan ≤ 3 ketukan (hitungan manual Prompt 14).
   - Saran berbasis aturan berversi, bukan instruksi klinis (kurator: baca-saja di prototipe).
   - CareProof: jawaban pasien penentu utama; jawaban pendamping dan di tempat terpisah.
   - Dashboard anonim dengan ambang 5 pasien, hanya pasien yang setuju statistik.
   - Aksesibilitas: "dirancang dengan target WCAG 2.2 AA; pemeriksaan otomatis axe tanpa pelanggaran pada layar X; uji pembaca layar manual: <hasil>". JANGAN "memenuhi/terverifikasi WCAG 2.2 AA".
   - Offline, PWA, kartu cetak: TIDAK dibangun hari ini → hanya disebut sebagai roadmap. Jangan sebut "bisa dipakai offline" atau "PWA bisa diinstal".
   - OTP: "OTP tiruan untuk demo; SMS belum terhubung".
   - Hosting: "berjalan lokal; dirancang siap serverless (usulan Vercel); belum di-deploy".
   - UU PDP: "dirancang dengan prinsip data minimal; kesesuaian UU PDP belum dikaji".
   - Metrik pilot (AFR, waktu petugas memahami kebutuhan, SUS): target, bukan hasil.
6. Gladi:
   - Jalankan skrip docs/demo.md DUA kali berturut-turut di panel browser, dengan demo:reset di antaranya dan tanpa mengubah kode di antara keduanya. Bila tidak ada perangkat kedua, pakai sesi bergantian.
   - Di panel browser tanpa kamera, langkah kamera diganti kode manual; tulis itu.
   - Catat durasi tiap gladi dan setiap penyimpangan dari skrip.
   - Setelahnya, cari di log server (preview_logs) penanda sintetis, token, dan kode OTP yang dipakai.
7. Daftar periksa pembaca layar untuk MANUSIA (agent tidak bisa mendengar pembaca layar): langkah TalkBack/VoiceOver untuk alur Must (P3 masuk, P5 paspor, P11–P12 QR, P16 konfirmasi, T4–T9 petugas, A6 dashboard), dengan kolom hasil. Isi hasil HANYA dari laporan pengguna; bila belum ada, status "belum diuji".
8. Angka latar belakang di docs/proposal.md: bila sesi punya akses web, cari sumber primer tiap angka (SIMPD 22,3 juta; studi ITS 64,7% dari 405 responden; Ombudsman Jawa Barat Agustus 2026). Ketemu → tulis sumbernya. Tidak ketemu → tandai "belum terverifikasi" dan usulkan kalimat tanpa angka spesifik. Jangan mengarang tautan atau judul.
9. Perbarui dokumen agar presentasi cocok dengan kenyataan:
   - architecture.md §16: apa yang dibangun hari ini vs roadmap (offline + kartu cetak, KomunikaCare, notifikasi antrean, Pre-Arrival Brief, editor kurator, pemulihan akun + delegasi darurat, hapus akun, tindak lanjut A7–A8/P17, [Laporkan] di P19, deploy).
   - user-flows.md keputusan 5 (cakupan): catat cakupan yang diputuskan pemilik produk pada 13 Okt 2026 (Must + pendamping) dan yang benar-benar selesai.

Verifikasi (sertakan bukti):
- [ ] pnpm lint, pnpm typecheck, pnpm test, pnpm build lolos pada commit demo (tempel ringkasan).
- [ ] pnpm demo:reset berhasil dua kali berturut-turut.
- [ ] Tes kebocoran gabungan lolos; grep .next/static dan git ls-files bersih.
- [ ] Gladi 1 dan 2 selesai tanpa mengubah kode; durasi dan penyimpangan tercatat; log server bersih dari penanda.
- [ ] docs/demo.md dan docs/klaim-demo.md ada. Setiap klaim berstatus "Terbukti" menunjuk bukti yang benar-benar ada di repo atau Catatan hasil.
- [ ] grep "WCAG", "offline", dan "PWA" di docs/demo.md dan docs/klaim-demo.md: setiap kemunculan ditinjau — tidak ada yang diucapkan sebagai klaim terpenuhi; hanya di kolom "Belum" atau roadmap.
- [ ] Daftar periksa pembaca layar tersedia; hasil diisi hanya dari laporan pengguna, atau "belum diuji".
- [ ] Status tiap angka latar belakang tercatat (bersumber / belum terverifikasi).

Selesai:
1. implementation-plan.md: centang Bagian 11 yang terbukti; isi Catatan hasil; perbarui tabel Status semua bagian sesuai kenyataan (selesai / sebagian / tidak hari ini).
2. Commit (jangan push): "docs(demo): skrip demo, klaim berbukti, dan uji ulang menyeluruh (Bagian 11)". Opsional: tag lokal `demo-13okt2026` pada commit ini (jangan push tag).
3. Laporan akhir untuk tim: apa yang siap didemokan, cadangan bila gagal, klaim yang boleh dan tidak boleh diucapkan, hal yang masih menunggu manusia (uji pembaca layar, kamera ponsel, sumber angka), dan sisa risiko.
```

---

## Lampiran — Prompt Showcase (aman paralel)

```text
# Showcase Progres — aman dijalankan paralel dengan prompt yang sedang berjalan

Konteks: AKSESPASS. Tujuan: menunjukkan progres yang SUDAH TER-COMMIT kepada tim, dengan bukti nyata, tanpa mengganggu sesi lain yang sedang mengerjakan prompt berikutnya di folder repo yang sama. Jalankan di sesi terpisah. Perkiraan durasi: 15–20 menit.

ATURAN ISOLASI (wajib; bila salah satu tidak bisa dipenuhi, BERHENTI dan laporkan):
- Folder repo utama hanya untuk dibaca: boleh git log, git status, git archive, dan membaca file. DILARANG mengedit, menjalankan git add/commit/stash/checkout/reset, menjalankan pnpm/node, atau menulis file apa pun di sana.
- DILARANG menyentuh database aksespass_dev dan aksespass_test (dipakai sesi lain). Pakai database baru: aksespass_showcase_dev dan aksespass_showcase_test.
- Kata sandi aksespass_app di env showcase HARUS sama persis dengan .env.local repo utama. db:migrate menjalankan ALTER ROLE aksespass_app ... PASSWORD secara global di server Postgres; kata sandi berbeda akan memutus koneksi sesi lain.
- Jangan pakai port 3000. Pakai 3100, dan cek dulu bahwa port itu kosong.
- Jangan mencetak isi .env.local, rahasia, atau nilai cookie sesi (tampilkan atributnya saja, nilainya disensor). Semua data sintetis dari seed.

Langkah:
1. Catat keadaan awal repo utama: HEAD, `git log --oneline -10`, `git status --short`. Perubahan milik sesi lain dibiarkan apa adanya.
2. Baca HANYA docs/implementation-plan.md: tabel Status, "Jalur 13 Okt 2026", dan Catatan hasil bagian yang sudah selesai — untuk mengetahui apa yang ter-commit dan bukti apa yang diklaim.
3. Ekspor snapshot commit HEAD ke folder sementara di LUAR repo: `git archive HEAD | tar -x -C <folder-sementara>/aksespass-showcase`. Semua perintah berikutnya dijalankan di folder snapshot.
4. Env snapshot: salin .env.local repo utama ke snapshot, lalu ubah HANYA: nama database di keempat URL menjadi aksespass_showcase_dev / aksespass_showcase_test, dan APP_ORIGIN=http://localhost:3100. Jangan mencetak isinya.
5. `pnpm install --frozen-lockfile --prefer-offline`; `createdb` kedua database showcase bila belum ada; `pnpm db:migrate` dan `pnpm db:seed` ke aksespass_showcase_dev.
6. Pemeriksaan: pnpm lint, pnpm typecheck, pnpm test (memakai aksespass_showcase_test), pnpm build. Catat jumlah tes per file dan bandingkan dengan klaim di Catatan hasil.
7. Bukti di database (psql ke aksespass_showcase_dev; tampilkan perintah + output singkat):
   - Tidak ada kolom bernama diagnos* di information_schema.
   - consent_qr hanya punya token_hash, tidak ada kolom token.
   - pg_roles: aksespass_app bukan superuser dan tanpa BYPASSRLS.
   - Sebagai aksespass_app: UPDATE pada audit_events → permission denied.
   - Sebagai aksespass_app tanpa konteks: SELECT patient_profiles → 0 baris. Dengan konteks Pasien Contoh 1 (set_config di dalam transaksi) → hanya 1 baris miliknya. Dengan konteks petugas tanpa token pindai → 0 baris.
   - Petugas Fasilitas A tidak melihat kunjungan Fasilitas B.
8. Bukti API: `pnpm start -p 3100` (build produksi lokal; OTP tiruan tetap aktif karena bukan VERCEL_ENV=production). Pakai curl dengan header Origin: http://localhost:3100:
   - Minta OTP untuk nomor pasien seed dan untuk nomor tak terdaftar → struktur respons identik.
   - Verifikasi dengan kode benar → status + atribut Set-Cookie (HttpOnly, SameSite=Lax, Path, Max-Age); nilai cookie disensor.
   - Kode salah berulang → percobaan ke-6 ditolak.
   - Origin asing → 403.
   - Nomor petugas nonaktif dari seed → "Tidak dapat masuk. Hubungi admin fasilitas."
   - Proxy: GET /petugas tanpa cookie → redirect ke /masuk; dengan cookie pasien → redirect ke /pasien. Bila halaman tujuan belum dibangun (404), katakan apa adanya.
   - Cari kode OTP dan nomor telepon yang dipakai di output server → harus tidak ditemukan.
9. Tambahan sesuai checkpoint (cek dari isi commit; lewati yang belum ada):
   - POST /api/scan ada (Prompt 7+): buat consent + QR sintetis lewat SQL sebagai admin di database showcase (token sintetis; simpan hanya SHA-256-nya; jelaskan bahwa ini fixture showcase, bukan jalur aplikasi). Dengan cookie petugas: token valid → hanya field yang dicentang; audit profile_read tercatat dengan nama field saja; token acak, token dicabut, dan token fasilitas lain → respons identik (tampilkan diff kosong).
   - /dev/katalog ada (Prompt 8+): jalankan `pnpm dev -p 3100` agar panel pemeriksaan tersedia; buka di panel browser, ambil screenshot, jalankan "Cek aksesibilitas".
   - /masuk ada (Prompt 9+): alur masuk di panel browser, dengan screenshot.
   - Prompt 12+ / 14+ / 15+: alur pasien / petugas / dashboard mengikuti docs/demo.md bila sudah ada, atau langkah verifikasi di Catatan hasil.
10. Laporan showcase di chat (JANGAN ditulis ke repo utama):
    - Ringkasan 30 detik yang jujur dan bisa dibacakan.
    - Tabel "Sudah berjalan": fitur/jaminan | bukti yang barusan dijalankan | story terkait.
    - "Belum ada": termasuk layar yang belum dibangun; jangan menyiratkan sudah jadi.
    - Selisih antara klaim di Catatan hasil dan hasil showcase, bila ada.
    - Risiko yang terlihat.
11. Bersih-bersih:
    - Hentikan server.
    - Hapus HANYA aksespass_showcase_dev dan aksespass_showcase_test (dropdb).
    - Hapus folder snapshot beserta salinan .env.local-nya.
    - Catat ulang `git status --short` repo utama dan pastikan showcase tidak menambah atau mengubah apa pun di sana.
```
