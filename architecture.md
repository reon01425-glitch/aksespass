# AKSESPASS Architecture (`architecture.md`)

**Versi:** 0.1 (draft, selaras dengan `design.md` v0.5)
**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React (sesuai `design.md`)
**Penanda status keputusan:** **[Diputuskan]** = sudah kamu putuskan | **[Usulan]** = rekomendasi, boleh diganti | **[Verifikasi]** = klaim yang harus diuji sebelum dipakai di dokumen/presentasi
**Kode:** `P-05`, `T-01` (bertanda hubung) = user story → `docs/user-stories.md`. `P16`, `T4b`, `K3` (tanpa tanda hubung) = layar → `docs/user-flows.md`. `A1`–`A7` di §3 = keputusan arsitektur, bukan layar admin.

---

## 1. Tujuan dan Batasan

AKSESPASS adalah PWA seluler yang membantu pasien menyampaikan kebutuhan layanannya ke petugas fasilitas **tanpa harus mengulang cerita**, dengan kontrol persetujuan di tangan pasien.

Batasan arsitektur yang menurun dari keputusan produk:

1. Data kebutuhan dibaca **saat QR dipindai**, bukan disalin ke QR. **[Diputuskan]**
2. Diagnosis **tidak** disimpan di server dan **tidak** ada di QR. **[Diputuskan, lihat bagian 12]**
3. Setiap pembukaan data oleh pihak lain **tercatat** (P19). **[Diputuskan]**
4. Kartu cetak berisi ringkasan kebutuhan, **tanpa QR akses**, dan terbaca tanpa internet. **[Diputuskan]**
5. Antarmuka mengikuti `design.md`: target sentuh 48 px, status = ikon + teks + warna, teks hingga 200%. **[Diputuskan]**

---

## 2. Aktor dan Peran

| Aktor | Cara masuk | Hak utama |
| :--- | :--- | :--- |
| Pasien | Akun sendiri: nomor HP + kode verifikasi/OTP, tanpa KTP (P3) **[Diputuskan]** | Kelola profil kebutuhan, buat/cabut ConsentQR, kirim brief, konfirmasi kunjungan (P16), lihat riwayat akses (P19), setujui/cabut tautan pendamping (P21), hapus akun (P23) |
| Pendamping | Akun sendiri (HP atau email + kode, D2), tertaut ke pasien **hanya setelah pasien menyetujui** (D3 → P21) | Membantu pasien sesuai izin; setiap tindakan ditandai "oleh pendamping" (D5, D8) |
| Petugas | Akun terikat satu fasilitas, diaktivasi lewat undangan admin fasilitas (T2) | Pindai QR, lihat data yang dicentang, catat kunjungan (T4/T4b, T8), baca brief, mengesahkan delegasi darurat di tempat (bagian 10) |
| Admin fasilitas | Akun terikat fasilitas, diaktivasi lewat undangan (A2) | Kelola petugas (A4–A5), lihat **data agregat saja** (A6–A7), kelola tindak lanjut (A8), **tidak** melihat brief |
| Kurator | Akun internal, diundang admin sistem (K2) | Kelola katalog kebutuhan/bantuan dan aturan saran. K3–K6 dibangun 16 Okt 2026: pustaka, editor draft, tinjau (terbit butuh 2 peninjau kurator berbeda selain penulis), riwayat versi |

**Dokter bukan aktor.** Dokter melihat apa pun yang pasien tunjukkan di layar ponselnya. **[Diputuskan]**

**Admin sistem bukan aktor aplikasi di prototipe.** Pendaftaran fasilitas dan undangan kurator dilakukan manual sebagai proses onboarding (`docs/user-flows.md`, keputusan terbuka 7).

---

## 3. Keputusan Arsitektur Utama

| # | Keputusan | Status | Alasan singkat |
| :--- | :--- | :--- | :--- |
| A1 | Monolit Next.js (UI + Route Handlers + Server Actions) | [Usulan] | Tim kecil, satu repo, satu deploy. Cukup untuk prototipe |
| A2 | PostgreSQL terkelola sebagai penyimpanan utama | [Usulan] | Relasi jelas (pasien-fasilitas-kunjungan), mendukung row-level security |
| A3 | Sesi berbasis cookie `httpOnly` + `SameSite=Lax` | [Usulan] | Lebih aman daripada token di `localStorage` |
| A4 | QR hanya memuat **token acak tak bermakna** | [Diputuskan] | Data dibaca saat pindai, jadi QR tidak membawa data |
| A5 | PWA: service worker + IndexedDB untuk antrean offline petugas | [Diputuskan, mekanisme: usulan] | Memenuhi T4b |
| A6 | Audit log append-only terpisah dari tabel bisnis | [Usulan] | P19 harus sulit diubah, termasuk oleh admin |
| A7 | Diagnosis hanya di perangkat pasien, terenkripsi (roadmap) | [Diputuskan: ke roadmap] | Lihat bagian 12 |
| A8 | Hosting aplikasi di **Vercel**; PostgreSQL dari penyedia terpisah (lewat integrasi Vercel atau langsung) | [Usulan utama] | Next.js didukung langsung, HTTPS dan preview otomatis. Vercel tidak menyimpan Postgres sendiri, jadi penyedia DB tetap dipilih terpisah (syarat A2) |

**[Diputuskan, 13 Okt 2026] Lokal dulu:** prototipe dibangun dan diuji di lokal dengan PostgreSQL 16 (Homebrew). Deploy ke hosting (usulan utama: A8) setelah produk lokal benar. Library yang disetujui: Vitest, `pg` + migrasi SQL mentah, `qrcode`, `html5-qrcode`, axe-core. OTP memakai kode tiruan khusus mode pengembangan (tanpa SMS).

**Aturan siap serverless [Diputuskan, 13 Okt 2026]** — berlaku sejak build lokal agar kode tidak perlu ditulis ulang saat pindah ke A8:
1. **Konteks RLS per transaksi.** Identitas, peran, dan fasilitas di-set dengan `set_config(..., true)` / `SET LOCAL` di dalam transaksi, tidak pernah per sesi koneksi, karena koneksi lewat pooler dipakai bergantian oleh request lain.
2. **Tidak ada state penting di memori proses.** Rate limit, OTP tiruan, dan penghitung lain disimpan di Postgres.
3. **Middleware tanpa akses database.** Middleware hanya memeriksa cookie sesi dan peran per grup rute; rate limit, consent, dan fasilitas diperiksa di route handler lewat `lib/consent` / `lib/auth`.
4. **Konfigurasi lewat env.** URL database (termasuk URL pooler nanti) dan rahasia hanya dari variabel lingkungan.

---

## 4. Gambaran Sistem

```
┌─────────────────────────── Perangkat ───────────────────────────┐
│  PWA Pasien/Pendamping          PWA Petugas                     │
│  - profil kebutuhan             - pemindai QR (kamera)          │
│  - ConsentQR, brief             - input kode manual (cadangan)  │
│  - kartu cetak (ringkasan)      - IndexedDB: antrean kunjungan  │
│  - [roadmap] diagnosis lokal    - service worker (offline)      │
└───────────────┬─────────────────────────┬───────────────────────┘
                │ HTTPS                   │ HTTPS (saat online)
        ┌───────▼─────────────────────────▼───────┐
        │   Next.js (App Router)                  │
        │   - Server Components / Server Actions  │
        │   - Route Handlers /api/*               │
        │   - Middleware: sesi, peran (tanpa DB)  │
        └───────┬─────────────────────┬───────────┘
                │                     │
        ┌───────▼───────┐     ┌───────▼────────┐
        │  PostgreSQL   │     │  Audit log     │
        │  (data bisnis)│     │  (append-only) │
        └───────────────┘     └────────────────┘
                │
        ┌───────▼───────────────────────┐
        │ Penyedia notifikasi/OTP        │
        │ (ke kontak terdaftar pasien)   │
        └───────────────────────────────┘
```

Pemisahan data (sesuai batasan nomor 2 di bagian 1): **server** menyimpan kebutuhan layanan yang dibaca petugas lewat QR. **Perangkat pasien** menyimpan diagnosis (roadmap). Diagnosis tidak ikut QR dan tidak terbaca petugas.

---

## 5. Struktur Proyek (usulan)

```
src/
├─ app/
│  ├─ (pasien)/            # profil, qr, brief, kartu, riwayat
│  ├─ (petugas)/           # pindai, hasil, catat kunjungan, brief masuk
│  ├─ (admin)/             # petugas, agregat
│  ├─ (kurator)/           # pustaka, editor, tinjau, riwayat (K3-K6)
│  ├─ pendamping/          # beranda pendamping (D4), tautkan (D3), kelola per pasien (D5, D6, D8)
│  └─ api/                 # route handlers: qr, scan, brief, sync, recovery, pendamping
├─ components/             # komponen UI sesuai design.md (Button, StatusBanner, ...)
├─ lib/
│  ├─ auth/                # sesi, peran, guard
│  ├─ consent/             # buat/validasi/cabut token, aturan field yang boleh dibaca
│  │  └─ constants.ts      # [Usulan] konstanta nama field bersama (6 kategori, catatan, nama panggilan)
│  ├─ companions/          # [Usulan] kelola tautan pendamping, kode Crockford Base32, otorisasi pendamping
│  ├─ audit/               # tulis kejadian P19 (satu-satunya pintu tulis)
│  ├─ http/                # [Usulan] respons no-store, pembungkus route handler aman, origin guard
│  ├─ offline/             # antrean IndexedDB, sinkronisasi
│  └─ privacy/             # scrubber log, daftar field terlarang di log/analitik, logger tunggal
├─ db/                     # skema, migrasi, kebijakan RLS
└─ sw/                     # service worker
```

Aturan: **semua pembacaan data pasien oleh pihak lain lewat satu fungsi** di `lib/consent`, yang otomatis menulis audit. Jangan ada kueri langsung ke tabel profil dari halaman petugas.

**Penyesuaian Prefiks Rute [Usulan, 13 Okt 2026]:**
Route groups dengan tanda kurung `(pasien)` di App Router tidak menghasilkan segmen URL nyata, sehingga Next.js middleware/proxy tidak dapat membedakan dan menjaga rute per grup. Rute aplikasi menggunakan segmen URL nyata berprefiks peran: `/pasien/*`, `/pendamping/*`, `/petugas/*`, `/admin/*`, dan `/kurator/*`. Rute publik meliputi `/`, `/masuk` (dan turunannya), `/s/*` (halaman tujuan QR), `/api/auth/*`, serta aset statis.
Rute pendamping menggunakan pola akun berotonomi (K-7):
- `/pendamping` (D4: Beranda pendamping menampilkan kartu pasien tertaut aktif + ringkasan status paspor + konfirmasi CareProof menunggu, serta banner jika ada tautan yang berakhir).
- `/pendamping/tautkan` (D3: Input kode tautan 8 karakter Crockford Base32 dari pasien).
- `/pendamping/tautan/[linkId]/paspor` (D5: Editor paspor atas nama pasien).
- `/pendamping/tautan/[linkId]/qr` (D6: Pembuatan ConsentQR atas nama pasien tanpa kartu cetak).
- `/pendamping/tautan/[linkId]/konfirmasi` dan `.../[visitId]` (D8: Konfirmasi CareProof atas nama pasien; disabled/baca-saja bila pasien sudah menjawab).

---

## 6. Model Data (ringkas)

| Tabel | Isi penting | Catatan |
| :--- | :--- | :--- |
| `users` | id, peran, kontak terdaftar (HP untuk OTP), status, persetujuan statistik anonim (opsional, terpisah; P3), `audit_subject_id` **[Usulan]** | Satu tabel, peran dibatasi enum (`patient`, `companion`, `staff`, `facility_admin`, `curator`). `audit_subject_id` (UUID unik) dipakai sebagai pengenal pseudonim subjek di `audit_events` (§11) **[Usulan]** |
| `patient_profiles` | nama panggilan, kebutuhan terpilih, catatan bebas pasien (P5), penanda perubahan terakhir oleh pendamping (D5) | **Tanpa kolom diagnosis**. Draft editor (P5) hanya di perangkat, tidak di tabel ini |
| `patient_profile_needs` | `profile_id`, `need_code` | Tabel penghubung `patient_profiles` ↔ `needs_catalog` untuk integritas referensi. **[Usulan]** |
| `needs_catalog` | kebutuhan/bantuan baku | Dikelola kurator |
| `accommodation_rules` | profil kebutuhan pemicu, saran tindakan (teks pendek + ikon), sumber/alasan, versi, status (Draft/Dalam Tinjauan/Terbit), tanggal, pengesah | Dasar Smart Accommodation Engine (T6, T-03). Satu baris = satu versi; `rule_key` mengelompokkan versi, status Draft, Dalam Tinjauan, Terbit, Digantikan; suara peninjau di `rule_reviews`. Trigger database menegakkan: aturan terbit tidak dapat diubah, terbit butuh 2 persetujuan berbeda selain penulis. Penulisan hanya oleh peran `curator` (RLS). Migrasi 024 **[Diputuskan, 16 Okt 2026]** |
| `consents` | pasien, fasilitas tujuan, **daftar field yang dicentang** (`shared_fields`), tanggal berlaku, `subject_ref`, `created_by_user_id` | Dasar aturan "hanya data yang dicentang". Nilai `shared_fields` yang diizinkan: `komunikasi`, `penglihatan`, `pendengaran`, `mobilitas`, `sensorik_lingkungan`, `pendampingan`, `catatan_pasien` (nama panggilan selalu ikut). Kolom `subject_ref` (UUID audit pasien) diisi saat consent dibuat agar audit pindai petugas tidak perlu membaca tabel `users` pasien. `created_by_user_id` mencatat pembuat (pasien atau pendamping). **[Usulan, 13 Okt 2026]** |
| `consent_qr` | `token_hash`, consent_id, `expires_at`, `revoked_at` | Token asli tidak disimpan, hanya hash SHA-256 |
| `companions` | `patient_user_id`, `companion_user_id`, `status` (`pending`/`active`/`revoked`), `patient_subject_ref`, `requested_at`, `approved_at`, `revoked_at` | Aktif hanya setelah pasien menyetujui (D3 → P21). Memiliki `patient_subject_ref` (pseudonim pasien) agar audit tindakan pendamping menyebut pasien tanpa membaca tabel `users`. UNIQUE(`patient_user_id`, `companion_user_id`). **[Usulan, 13 Okt 2026]** |
| `companion_link_codes` | `patient_user_id`, `code_hash`, `expires_at`, `used_at` | Kode 8 karakter Crockford Base32, berlaku 10 menit, sekali pakai, disimpan sebagai HMAC-SHA256 dengan `HASH_PEPPER`, ber-rate limit di PostgreSQL (maks 5 per 10 menit). **[Usulan, 13 Okt 2026]** |
| `emergency_delegations` | pasien, pendamping, petugas pengesah, fasilitas, tanggal berlaku | Delegasi darurat di tempat (bagian 10); cakupan satu fasilitas dan satu tanggal. **[Usulan]** nama dan kolom |
| `facilities` | nama, status | Didaftarkan manual oleh admin sistem |
| `staff_memberships` | petugas, fasilitas, unit, status (Menunggu Aktivasi/Aktif/Nonaktif) | Petugas hanya aktif di fasilitas terdaftar; nonaktif langsung menolak pindai (A4) |
| `briefs` | pasien, fasilitas, tanggal kunjungan, field terpilih, `expires_at` | Pre-Arrival Brief (bagian 8) |
| `visits` | pasien, fasilitas, petugas, jalur (`qr` / `kartu`), bantuan dicatat (`recorded_rule_ids uuid[]`), catatan opsional, `client_id`, `synced_at`, `recorded_at`, `subject_ref` | Dibuka saat pindai lolos dengan `recorded_at = NULL` (dipakai ulang bila sudah ada kunjungan terbuka untuk consent dan faskes sama hari itu). `subject_ref` (UUID pseudonim pasien) diisi dari consent/users saat kunjungan dibuka agar audit tidak memerlukan pembacaan tabel users. Bantuan disimpan sebagai array ID aturan (`recorded_rule_ids`) sehingga versi aturan yang dipakai terkunci dan terlacak. Catatan petugas opsional maks 280 karakter (tidak pernah dicatat ke audit/log). **[Usulan, 13 Okt 2026]** |
| `visit_confirmations` | visit_id, status (terpenuhi/sebagian/belum), kebutuhan belum terpenuhi, `confirmed_by` (`patient`/`companion`/`on_site`) | Hanya bisa dibuat setelah visit tersinkron. Tanpa jawaban = "belum dikonfirmasi", **tidak** dihitung terpenuhi (P16) |
| `follow_ups` | kategori kebutuhan, fasilitas, status, catatan langkah, tanggal | Tindak lanjut admin (A8) dan status untuk pasien (P17). **[Usulan]** |
| `recovery_requests` | pasien, pendamping, kode (hash), `eligible_at`, status | Bagian 10 |
| `audit_events` | tipe, pelaku, subjek, waktu, fasilitas | Append-only, tanpa isi data pasien |
| `rate_limit_hits` | `key`, `window_start`, `count` | Penghitung rate limit berbasis jendela waktu di Postgres (PK gabungan, upsert atomik). **[Usulan]** |
| `otp_codes` | `phone_hash`, `code_hash`, `expires_at`, `attempts`, `consumed_at` | Penyimpanan kode OTP ter-hash di Postgres (tanpa menyimpan kode asli maupun nomor telepon mentah). **[Usulan]** |

Prinsip: `audit_events` mencatat **siapa membuka apa dan kapan**, bukan salinan isinya.

Agregat dashboard (A6–A7) dihitung dari `visit_confirmations`, memisahkan `confirmed_by` (bagian 9) dan menyembunyikan kelompok kecil. **[Usulan]** Nilai ambang belum ditetapkan.

**CareProof dan Accessibility Gap Dashboard (P16–P17, A3, A6) [Usulan, 13 Okt 2026 — Bagian 8]:**

- **Kunjungan yang dihitung** di dashboard: `recorded_at IS NOT NULL`, dalam periode bulan kalender dihitung di zona Asia/Jakarta, dan `patient_user_id` merujuk pasien dengan `users.stats_consent = true`. Nilai `stats_consent` dibaca **saat ini** (bukan snapshot saat kunjungan terjadi) — bila pasien mencabut persetujuan statistik, seluruh kunjungan historisnya langsung ikut keluar dari agregat pada pembacaan berikutnya.
- **Accommodation Fulfillment Rate (AFR)** = (jumlah kunjungan dihitung berstatus `terpenuhi`) / (seluruh kunjungan dihitung pada periode), dibulatkan ke persen bulat. Kunjungan "belum dikonfirmasi" (tanpa baris `visit_confirmations`) ikut masuk penyebut tetapi **tidak pernah** dihitung di pembilang (proposal fitur 5). AFR bernilai `null` bila tidak ada kunjungan dihitung pada periode tersebut.
- **Rincian** yang dipisah tanpa digabung diam-diam: status (`terpenuhi`/`sebagian`/`belum`/`belum_dikonfirmasi`), penjawab `confirmed_by` (`patient`/`companion`/`on_site`), dan kategori kebutuhan belum terpenuhi (dari `unmet_need_codes` → `needs_catalog.category`, dihitung per kunjungan agar satu kunjungan dengan dua kode di kategori sama tidak dihitung dobel).
- **Ambang kelompok kecil (K-10 = 5)** diterapkan pada **jumlah pasien berbeda (`DISTINCT patient_user_id`) per sel**, bukan jumlah kunjungan — satu pasien dengan 20 kunjungan tetap dapat dikenali dan karenanya tetap disembunyikan bila ia satu-satunya pasien pada sel itu. **Pengecualian yang disengaja**: sel dengan tepat **0** pasien berbeda TIDAK disembunyikan (ditampilkan sebagai `0`), karena nol bukan risiko re-identifikasi (tidak ada seorang pun untuk dikenali); hanya sel dengan 1–4 pasien berbeda yang disembunyikan tanpa angka. Nilai ambang disalin di dua tempat yang harus diubah bersamaan: `v_threshold` di migrasi `009_facility_dashboard.sql` (penegakan sesungguhnya, di dalam database) dan `DASHBOARD_MIN_GROUP_SIZE` di `src/db/index.ts` (dipakai sisi aplikasi untuk teks UI "Disembunyikan (kurang dari N pasien)").
- **Fungsi `get_facility_dashboard(p_year, p_month)`**: satu fungsi `SECURITY DEFINER` (migrasi 009), dimiliki `aksespass_owner`, `SET search_path = public, pg_temp` eksplisit, `EXECUTE` hanya untuk `aksespass_app`. Hanya berjalan bila `app_role() = 'facility_admin'`; fasilitas **selalu** diambil dari `app_facility_id()` (parameter pemanggil tidak memuat facility_id sama sekali, sehingga admin tidak dapat memilih fasilitas lain). Mengembalikan `NULL` (fail-closed, bukan error) bila pemanggil bukan `facility_admin`. Keluaran JSONB memuat tren 3 bulan dan detail bulan terpilih (total kunjungan, AFR, tiga rincian di atas); sel yang disembunyikan dikembalikan sebagai `{"hidden": true}` tanpa angka apa pun — angka yang disembunyikan **tidak pernah** keluar dari database. `src/lib/dashboard` memanggil fungsi ini lewat `withContext` dan tidak pernah melakukan `SELECT`/`JOIN` langsung ke `visits`, `visit_confirmations`, atau profil pasien (ditegakkan oleh tes arsitektur yang sudah ada untuk kedua tabel pertama).
- Cakupan hari ini (Bagian 8) hanya P16–P17 minimal (P-07) dan A3/A6 (A-02): **tidak** termasuk status tindak lanjut di P17 (P-08, bergantung tabel `follow_ups` yang belum dibuat), catatan bebas di P16, A7 (Kebutuhan Belum Terpenuhi), A8 (Tindak Lanjut), atau antrean offline untuk konfirmasi.

---

## 7. ConsentQR dan Alur Baca Saat Dipindai

**Pembuatan (pasien):**
1. Pasien memilih fasilitas, masa berlaku, dan field yang dicentang.
2. Server membuat `consent` + token acak 128 bit, menyimpan **hash SHA-256**-nya di `consent_qr`.
3. QR menampilkan URL pendek berisi token di dalam fragmen URL (`${APP_ORIGIN}/s#<token>`). **Tidak ada data pasien di dalam QR.**

**Format Token & URL [Usulan, 13 Okt 2026]:**
- **Format token:** 128 bit acak kriptografis, di-encode ke 26 karakter Crockford Base32 (alfabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, tanpa huruf ambigu I, L, O, U) agar mudah diketik manual saat kamera ditolak; diformat tampilan kelompok 4 karakter (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX`).
- **Normalisasi input:** huruf besar, buang spasi dan tanda hubung, `O` → `0`, `I`/`L` → `1`. Input salah format diperlakukan sama dengan token tak dikenal (menghasilkan status 422 yang identik).
- **URL Fragmen:** `${APP_ORIGIN}/s#<token>`. Bagian fragmen (`#...`) tidak dikirim oleh browser ke server web/Vercel maupun header `Referer`, sehingga token mentah tidak pernah masuk log akses server. Halaman `/s` membaca fragmen di sisi klien lalu menghapusnya dari riwayat peramban via `history.replaceState(null, "", "/s")`.
- **Ekstraksi Token Sisi Klien [Usulan, 13 Okt 2026]:** fungsi murni `extractToken` memproses teks mentah (dari kamera QR atau input manual): mengambil bagian setelah `#` bila ada, atau teks apa adanya, memotong ke maksimum 64 karakter. Validitas format dinilai oleh server di `/api/scan`.
- **Auto-sembunyi Data Pasien (10 Menit) [Usulan, 13 Okt 2026]:** data pasien di layar T5 disembunyikan otomatis jika tidak ada interaksi pengguna (ketukan/klik/gulir) selama 10 menit demi privasi perangkat bersama. Tombol pemulihan meminta konfirmasi atau pindai ulang.

**Bawaan shared_fields & Endpoint Status QR [Usulan, 13 Okt 2026]:**
- **Bawaan shared_fields:** saat membuka [P11], bawaan toggle kebutuhan diturunkan dari `shared_fields` consent terakhir milik pasien yang diiris (*intersected*) dengan kategori kebutuhan yang masih aktif di paspor terkini. Bila pasien belum pernah membuat consent, seluruh kategori paspor aktif diaktifkan sebagai bawaan. Tidak ada penyimpanan data profil baru di klien.
- **Endpoint Status Pemindaian Pasien (`GET /api/pasien/qr/[qrId]/status`):** dipanggil berkala (polling 5 detik) oleh layar pasien [P12] tanpa membocorkan token. Menggunakan UUID `qrId` (bukan token). Dilindungi otentikasi sesi pasien dan RLS:
  - Tanpa sesi → HTTP 401.
  - Sesi non-pasien (petugas/admin) → HTTP 403.
  - QR milik pasien lain atau ID tak dikenal → HTTP 404 identik tanpa membocorkan keberadaan QR.
  - Status diturunkan secara langsung dari skema yang ada: bila dicabut → `"dicabut"`; bila `expires_at <= now()` → `"kedaluwarsa"`; bila terdapat baris di `visits` untuk consent tersebut → `"dipindai"` (disertai `facilityName`); jika belum ada kunjungan → `"aktif"`. Tanpa penambahan kolom status pada skema.
  - Seluruh respons menyertakan header `Cache-Control: no-store`. Polling dihentikan saat status tidak lagi aktif atau tab browser tersembunyi.

**Pemindaian (petugas):**
1. Petugas memindai QR (atau memasukkan kode manual bila kamera ditolak).
2. `POST /api/scan` dengan body JSON `{ token }`. Server memeriksa:
   - **Rate limit:** di Postgres (`rate_limit_hits`) sebelum apa pun: maks 20 percobaan/5 menit per petugas, maks 60 percobaan/5 menit per HMAC(IP) dengan pepper. Melebihi batas → HTTP 429 "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." **[Usulan, 13 Okt 2026]**
   - **Sesi petugas:** `requireSession` memastikan sesi aktif, akun petugas aktif, dan keanggotaan fasilitas aktif. Bila akun/keanggotaan nonaktif, catat `qr_scan_rejected` lalu kembalikan HTTP 403 "Akun tidak aktif. Hubungi admin fasilitas."
   - **Pemeriksaan token berurutan:** token ada di `consent_qr`, belum dicabut (`revoked_at IS NULL`), belum kedaluwarsa (`expires_at > now()`), dalam masa berlaku (`valid_from <= now() < valid_until`), dan consent ditujukan untuk fasilitas petugas (`c.facility_id = app.facility_id`).
3. **Bila lolos (200 OK):** dalam satu transaksi atomik:
   - Baca profil terkini pasien dan katalog kebutuhan, menyaring hanya field dan kategori yang dicentang (`shared_fields`). Nama panggilan selalu ikut; catatan bebas pasien hanya bila dicentang.
   - Buka kunjungan di tabel `visits` (`recorded_at = NULL`). Bila sudah ada kunjungan terbuka untuk consent dan faskes sama pada hari itu, pakai ulang `visitId` tersebut.
   - Catat kejadian audit `qr_scanned` dan `profile_read` (mencatat nama field yang benar-benar dikirimkan).
   - Commit transaksi sebelum mengembalikan respons.
   - Body respons: `{ ok: true, visitId, namaPanggilan, preferredName, kebutuhan: [...], catatanPasien?, expiresAt, expiresSoon }`. Indikator `expiresSoon` aktif bila sisa masa berlaku < 15 menit. **[Usulan, 13 Okt 2026]** TIDAK memuat ID pasien, nomor telepon, atau data sensitif lain.
4. **Bila gagal (422 Unprocessable Entity):** alasan apa pun (token tak dikenal, salah format, kedaluwarsa, dicabut, belum berlaku, fasilitas lain) menghasilkan **respons identik** sesuai Keputusan K-4:
   - Status HTTP: 422.
   - Body: `{ ok: false, code: "QR_UNUSABLE", title: "QR Tidak Dapat Dipakai", message: "Minta pasien membuat ConsentQR baru." }`.
   - Jalur gagal melakukan pekerjaan setara (lookup + audit insert).
   - Audit `qr_scan_rejected`: pelaku petugas, faskes, `subject_ref` diisi bila token dikenal di database; tanpa token dan tanpa alasan penolakan. **[Usulan, 13 Okt 2026]**
5. **Header:** seluruh respons sukses maupun gagal wajib menyertakan `Cache-Control: no-store`. Permintaan `GET` ditolak (405).

**Status tampilan** (ikon + teks + warna, `design.md` bagian 2B):

| Kondisi | Status | Ikon | Label |
| :--- | :--- | :--- | :--- |
| Valid | Sukses | `CheckCircle2` | "QR Valid" |
| Mendekati batas (< 15 mnt) | Peringatan | `AlertTriangle` | "Hampir Kedaluwarsa" |
| Token tak dikenal/kedaluwarsa/dicabut, atau fasilitas tidak cocok | Galat | `XCircle` | "QR Tidak Dapat Dipakai" + "Minta pasien membuat ConsentQR baru." Satu pesan yang sama untuk semua alasan **[Diputuskan, 13 Okt 2026]** |
| Kamera ditolak | Galat | `Ban` | "Kamera Ditolak" + tombol input kode manual |

**Konsekuensi dari "data dibaca saat dipindai":** perubahan profil langsung berlaku di QR yang masih aktif (sesuai revisi P-02). Sebaliknya, tangkapan layar QR tetap berlaku sampai kedaluwarsa. Mitigasi: masa berlaku pendek, pasien bisa mencabut kapan saja, pembatasan fasilitas, dan audit yang terlihat oleh pasien (riwayat "siapa membuka data saya").

**Rate limit:** batasi percobaan pindai per petugas (20/5 mnt) dan per alamat IP (60/5 mnt) untuk menghambat penebakan token. Penghitung disimpan di Postgres (`rate_limit_hits`) dan diperiksa di route handler, bukan di middleware atau memori proses (aturan siap serverless, bagian 3). **[Usulan, 13 Okt 2026]**

---

## 8. Pre-Arrival Brief

Usulan aturan akses (keputusan akhir tetap di tim):

| Aturan | Implementasi |
| :--- | :--- |
| Hanya petugas aktif di fasilitas pilihan pasien | Filter `staff_memberships` + `briefs.facility_id` |
| Hanya pada tanggal yang dipilih, lalu kedaluwarsa otomatis (P10) | `expires_at` dicek di setiap baca; pekerjaan terjadwal membersihkan brief lama |
| Hanya data yang dicentang, hanya nama panggilan | Penyaringan sisi server, bukan sisi klien |
| Admin tidak melihat brief | Peran admin tidak punya izin baca pada `briefs`; hanya agregat |
| Dua kejadian dicatat di P19 | `brief_sent` (saat dikirim) dan `brief_opened` (siapa, kapan) |

---

## 9. Offline dan Sinkronisasi (T4b)

Yang tersedia offline:

- **Membaca ringkasan di kartu cetak** tidak butuh internet (T-05). Kartu cetak adalah media fisik murni (ringkasan teks kebutuhan dan kontak darurat) **sama sekali tanpa QR code dalam bentuk apa pun**, agar dapat dibaca langsung dengan mata telanjang tanpa alat/daya/sinyal dan tidak melanggar kontrol persetujuan dinamis (revocable).
- **Pencatatan kunjungan (T4b)** disimpan di perangkat petugas dan disinkronkan saat online. Catatan kunjungan offline merujuk pada kode identitas/nomor rekam medis pasien yang tertera secara tertulis di kartu cetak fisik (atau sesi aktif sebelumnya), disimpan lokal di IndexedDB petugas, lalu disinkronkan saat online.

Yang **tidak** tersedia offline: pemindaian ConsentQR (membutuhkan server untuk memvalidasi token acak, masa berlaku, status pencabutan, dan membaca data terkini) dan konfirmasi pasien (P16/CareProof), yang baru bisa dikirim **setelah sinkron**.

Mekanisme **[Usulan]**:

1. Service worker meng-cache cangkang aplikasi dan halaman pencatatan.
2. Catatan kunjungan masuk antrean IndexedDB dengan `client_id` (UUID dibuat di perangkat).
3. Saat online, antrean dikirim berurutan ke `POST /api/sync`. Server menolak duplikat berdasarkan `client_id` (idempotent).
4. Status antrean ditampilkan: "Menunggu Sinkron" (peringatan) lalu "Tersinkron" (sukses), sesuai `design.md`.
5. Data di IndexedDB dibatasi ke yang diperlukan, dihapus setelah sinkron, dan dikunci saat petugas keluar.

**Resolusi Kepemilikan Konfirmasi CareProof (Pasien vs Pendamping vs Di Tempat) [Usulan, 13 Okt 2026]:**
- Suara pasien adalah *single source of truth* (penentu utama):
  - Jika belum ada konfirmasi, pihak yang berwenang (pasien, pendamping aktif, atau petugas atas nama konfirmasi di tempat) dapat mencatat konfirmasi pertama kali.
  - Pasien selalu memiliki hak veto dan dapat **menimpa** konfirmasi sebelumnya yang diberikan oleh pendamping (`companion`) maupun konfirmasi di tempat (`on_site`).
  - Sebaliknya, pendamping atau konfirmasi di tempat **TIDAK boleh menimpa** konfirmasi yang sudah diberikan oleh pasien sendiri. Upaya konfirmasi oleh pendamping atau di tempat setelah pasien mengonfirmasi ditolak dengan galat HTTP 409 Conflict ("Pasien sudah mengonfirmasi").
- Konfirmasi oleh pendamping dicatat dengan penanda eksplisit `confirmed_by = 'companion'`; konfirmasi di perangkat petugas dicatat dengan `confirmed_by = 'on_site'`.
- Pada agregat *Accessibility Gap Dashboard*, metrik konfirmasi pasien, pendamping, dan di tempat dipisahkan atau dianotasikan sub-metrik ("Diverifikasi oleh Pendamping", "Di Tempat") untuk menjaga integritas data tanpa bias.
- Audit `visit_confirmed` mencatat pelaku dan nilai `confirmed_by`, tanpa menyalin isi jawaban konfirmasi atau kode kebutuhan yang belum terpenuhi.

**[Verifikasi]** Perilaku penyimpanan PWA di iOS Safari (pembersihan data situs yang lama tidak dibuka) perlu diuji pada perangkat nyata sebelum klaim offline dipakai di presentasi.

---

## 10. Autentikasi, Otorisasi, dan Pemulihan

**Otorisasi berlapis:**
1. Middleware/Proxy (`src/proxy.ts` di Next 16): verifikasi sesi tingkat satu tanpa DB murni lewat Web Crypto (HMAC-SHA256) pada cookie bertanda tangan; memeriksa masa berlaku dan kesesuaian peran dengan prefiks rute.
2. Lapisan layanan & API (`lib/auth/guard.ts`, `lib/consent`):
   - `requireSession`: verifikasi sesi tingkat dua ke basis data melalui transaksi `withContext`: memastikan baris sesi belum dicabut di tabel `sessions`, akun pengguna berstatus `active` di `users`, dan untuk peran `staff`/`facility_admin` keanggotaan `staff_memberships` berstatus `active` pada fasilitas yang sesuai klaim.
   - Fungsi pemeriksaan persetujuan di `lib/consent` memvalidasi kesesuaian fasilitas, token QR, dan masa berlaku.
3. Basis data: kebijakan row-level security sebagai jaring pengaman terakhir.
   - **Peran basis data [Usulan]:** `aksespass_owner` (`NOLOGIN`, pemilik semua tabel dan fungsi `SECURITY DEFINER` sempit) dan `aksespass_app` (`LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, bukan pemilik tabel, dipakai oleh koneksi aplikasi; hanya memiliki `SELECT, INSERT` pada `audit_events` dan hanya `SELECT` pada tabel katalog/aturan/fasilitas; memiliki hak CRUD pada `sessions` yang dibatasi RLS per `user_id = app_user_id()`).
   - **Kunci konteks RLS per transaksi [Usulan]:** `app.user_id`, `app.role`, `app.facility_id`, dan `app.scan_token_hash`, selalu disetel dengan `set_config(..., true)` di dalam transaksi melalui helper `withContext` (kosong bila tidak dipakai; tanpa konteks = 0 baris).
   - **Fungsi SECURITY DEFINER pra-sesi [Usulan, 13 Okt 2026]:**
     Karena jalur masuk/verifikasi OTP berjalan sebelum `app.user_id` tersedia, akses pra-sesi dijaga oleh dua fungsi `SECURITY DEFINER` sempit milik `aksespass_owner` dengan `SET search_path = public, pg_temp`, izin `EXECUTE` dicabut dari `PUBLIC` dan hanya diberikan ke `aksespass_app`:
     • `find_user_by_phone_pre_session(phone)`: mengembalikan hanya `id`, `role`, `status`, `facility_id`, `membership_status`, dan `audit_subject_id`.
     • `register_user_pre_session(phone, role, stats_consent, display_name)`: hanya mengizinkan pendaftaran mandiri peran `patient` atau `companion`, menyimpan `stats_consent`, dan mengisi `audit_subject_id`.
   - **Aturan baca profil oleh petugas [Usulan]:** peran `staff` hanya dapat membaca baris `patient_profiles` dan `patient_profile_needs` di tingkat RLS apabila `app.scan_token_hash` cocok dengan `consent_qr` yang belum dicabut (`revoked_at IS NULL`), belum kedaluwarsa (`expires_at > now()`), dan tertaut ke `consents` yang masih berlaku untuk `app.facility_id`. Penyaringan daftar field (`shared_fields`) tetap dilakukan di `lib/consent`.

**Pemisahan Alur Pemulihan Akun & Delegasi Darurat:**
1. **Delegasi Sementara di Tempat (*On-site Emergency Delegate*):**
   - Kasus: Ponsel pasien rusak/mati saat tiba di faskes darurat.
   - Pendamping yang sudah terdaftar di `companions` mengajukan akses sementara di hadapan petugas faskes.
   - Petugas faskes memverifikasi fisik pasien dan mengesahkan (*sign-off*) izin baca profil kebutuhan untuk kunjungan hari itu saja.
   - Tanpa jeda 24 jam; langsung aktif dengan cakupan terbatas pada faskes dan tanggal tersebut. Dicatat di `audit_events` dengan peran pengesah petugas.
2. **Pemulihan Akun Penuh (*Full Account Recovery*):** **[Diputuskan, 16 Okt 2026; menggantikan rancangan awal]**
   - Pendamping aktif memulai permintaan pemindahan akun ke **nomor baru** pasien (layar D9).
   - Server mengirim **kode verifikasi ke nomor baru** (rancangan awal mengirimnya ke kontak lama, yang tidak berguna bila nomor itu hilang). Pendamping memasukkan kode.
   - Berlaku jeda keselamatan (*cooling-off*) **24 jam** (`RECOVERY_COOLDOWN_MINUTES`). Selama jeda, pasien (bila masih bisa masuk) dan pendamping aktif mana pun dapat membatalkan; pemberitahuan tampil di dalam aplikasi (tanpa SMS pada prototipe).
   - Setelah jeda, saat seseorang berhasil masuk dengan nomor baru, `users.phone` akun yang sama diganti (migrasi 023, fungsi `complete_account_recovery_pre_session`), sesi lama dicabut. Riwayat dan tautan tidak berubah.
   - Satu permintaan tertunda per pasien dan per nomor. Tabel `account_recovery_requests` tidak dapat diakses langsung oleh aplikasi (hanya fungsi SECURITY DEFINER).
   - Dicatat di `audit_events`: `recovery_requested`, `recovery_cancelled`, `recovery_completed` (tanpa nomor telepon).

---

## 11. Audit Log (P19)

| Kejadian | Dicatat saat |
| :--- | :--- |
| `qr_created`, `qr_revoked` | Pasien membuat/mencabut QR |
| `qr_scanned`, `profile_read` | Petugas memindai dan data dibaca |
| `brief_sent`, `brief_opened` | Brief dikirim, lalu dibuka petugas |
| `qr_scan_rejected` | Pindai ditolak (kedaluwarsa, dicabut, fasilitas tidak cocok, petugas nonaktif; T4, A4). Tanpa menyimpan token mentah |
| `visit_recorded`, `visit_synced` | Kunjungan dicatat, lalu tersinkron |
| `visit_confirmed` | Konfirmasi CareProof dikirim, beserta `confirmed_by` (P16, D8, T9) |
| `companion_link_requested`, `companion_linked`, `companion_unlinked` | Tautan diajukan, disetujui, dicabut (D3, P21) |
| `profile_changed_by_companion` | Pendamping mengubah paspor atas nama pasien (D5) |
| `delegation_signed_off` | Petugas mengesahkan delegasi darurat (bagian 10), pelaku = petugas pengesah |
| `access_reported` | Pasien melaporkan akses yang tidak dikenali (P19) |
| `recovery_*` | Setiap langkah pemulihan |
| `account_deleted` | Pasien menghapus akun (P23) |
| `recovery_requested`, `recovery_cancelled`, `recovery_completed` | Pendamping mengajukan, pasien atau pendamping membatalkan, dan nomor akun dipindahkan (D9) |

Nama kejadian baru di atas **[Usulan]**; maknanya mengikuti `docs/user-flows.md`.

- Tabel append-only: aplikasi hanya punya izin `INSERT` dan `SELECT`.
- Isi: pelaku, subjek, tipe, waktu, fasilitas. **Tanpa isi data pasien.** Untuk `profile_read`, yang dicatat adalah **nama field** yang dibuka (agar P19 bisa menampilkan "data yang dilihat"), bukan nilainya.
- Pasien dapat melihat riwayat pembukaan datanya sendiri (P19).

**Fungsi Pembaca Riwayat Akses SECURITY DEFINER [Usulan, 13 Okt 2026]:**
- Karena RLS melarang peran pasien (`patient`) membaca tabel `users` milik petugas faskes, pembacaan riwayat akses di P19 dilakukan melalui fungsi `SECURITY DEFINER` sempit `get_patient_access_history(p_from, p_to, p_facility_id)`.
- Fungsi dimiliki oleh `aksespass_owner`, menetapkan `SET search_path = public, pg_temp`, izin `EXECUTE` dicabut dari `PUBLIC` dan hanya diberikan ke `aksespass_app`.
- Fungsi memvalidasi bahwa `app_role() = 'patient'` dan mengambil `audit_subject_id` pasien dari `app_user_id()`. Jika pemanggil bukan pasien, fungsi mengembalikan 0 baris.
- Mengembalikan hanya event audit yang memiliki `subject_ref` milik pasien pemanggil, mengaburkan identitas aksi sendiri menjadi label `"Anda"`, nama tampilan petugas/pendamping untuk pelaku eksternal, nama fasilitas, serta daftar nama field (tanpa token, tanpa nilai profil pasien).
- **Pemetaan Event ke Tampilan Pasien:**
  - `profile_read`: `"Data dibuka oleh <petugas> — <fasilitas>"` + daftar field bahasa manusiawi (`Komunikasi`, `Mobilitas`, `Nama panggilan`, `Catatan`). `qr_scanned` tidak ditampilkan terpisah karena selalu berpasangan dengan `profile_read`.
  - `qr_scan_rejected`: `"Percobaan pindai ditolak — <fasilitas>"`.
  - `qr_created` / `qr_revoked`: `"Anda membuat/mencabut QR untuk <fasilitas>"`.
  - Event lain: label umum tanpa detail sensitif. Field tak dikenal tidak pernah dicetak mentah.

- **Hapus akun (P23):** identitas pasien harus dapat dipisahkan dari audit log tanpa melanggar append-only. **[Usulan]** `subjek` memakai pengenal pseudonim; saat akun dihapus, pemetaan pseudonim → pasien yang dihapus, bukan baris log. **[Verifikasi]** UU PDP.


---

## 12. Diagnosis: Keputusan dan Desain Roadmap

**Keputusan:** fitur diagnosis masuk **roadmap/fitur opsional kecil**, bukan inti prototipe. Dokter bukan aktor.

**Rancangan bila dibangun:**
- Diagnosis disimpan **hanya di perangkat pasien**, terenkripsi (Web Crypto API, kunci diturunkan dari kredensial perangkat/PIN), di IndexedDB.
- Dokter melihatnya karena pasien **menunjukkan layar**. Tidak ada jalur sistem.
- Diagnosis tidak ikut QR, tidak terbaca petugas, tidak ada kolomnya di server.

**Konsekuensi yang harus diterima:**
1. Data hilang bila perangkat hilang atau berganti (tidak ada cadangan server).
2. Pendamping hanya bisa melihatnya di perangkat pasien. Transfer antar-perangkat jauh lebih rumit dan di luar prototipe.
3. **[Verifikasi]** Penghapusan data situs oleh Safari iOS memengaruhi apakah diagnosis bertahan di PWA.
4. **[Verifikasi]** Apakah UU PDP berlaku untuk data yang hanya berada di perangkat pasien belum pasti dan perlu dikonfirmasi.

**Klaim privasi:** klaim kuat "diagnosis hanya tersimpan di perangkat pasien, tidak pernah ke server" hanya boleh dipakai bila **diuji** bahwa tidak ada jalur yang membocorkannya: log error, analitik, cadangan otomatis peramban, cache service worker, pelacakan galat pihak ketiga. Bila fitur ini tidak dibangun, klaim cukup: "diagnosis tidak diminta".

---

## 13. Privasi dan Keamanan

| Area | Kontrol |
| :--- | :--- |
| Transport | HTTPS wajib, HSTS |
| Data diam | Enkripsi at-rest oleh penyedia basis data; hash untuk token dan kode |
| Log aplikasi | Scrubber di `lib/privacy`: daftar field terlarang tidak boleh muncul di log, analitik, atau pelacak galat |
| Catatan bebas petugas (T8) | Opsional, **batas panjang**, dengan peringatan "jangan menulis diagnosis atau data sensitif" |
| Catatan bebas pasien (P5) | Terpisah dari catatan petugas, hanya tampil bila dicentang |
| Sesi | Cookie `httpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (+ prefix `__Host-` bila HTTPS). Masa berlaku sesi **[Usulan]**: petugas/admin/kurator 8 jam, pasien/pendamping 7 hari. Keluar otomatis mencabut baris di tabel `sessions`. |
| Preferensi Tampilan | Cookie `aksespass_pref`, `httpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=31536000` (1 tahun), `Secure` (+ prefix `__Host-` bila HTTPS). Berisi hanya nilai valid dari daftar tetap (`textSize: 100|150|200`, `contrast: standard|high`). Dibaca server-side pada root layout untuk memasang atribut `data-*` tanpa kedipan visual. **[Usulan]** |
| OTP & Rate Limit | OTP tiruan 6 digit acak kriptografis (K-3) disimpan sebagai hash HMAC(kode) dan HMAC(telepon) dengan `HASH_PEPPER`. Kedaluwarsa 5 menit, maksimal 5 percobaan lalu hangus, sekali pakai. Rate limit tersimpan di Postgres (`rate_limit_hits`) per telepon (maks 3) dan per IP (maks 10) per 15 menit. Respons request OTP identik untuk nomor terdaftar dan belum terdaftar. Mode `dev-display` mengembalikan kode di respons lokal/dev dan **ditolak keras** bila `VERCEL_ENV=production`. Bila mode kosong, menghasilkan galat "Penyedia OTP belum dikonfigurasi" tanpa kode. **[Usulan]** |
| Header | CSP ketat, `Referrer-Policy: no-referrer` untuk halaman token; `Cache-Control: no-store` pada `/petugas/*` dan `/s` untuk melindungi kerahasiaan data di perangkat bersama. **[Usulan]** |
| Pemeriksaan Origin | Dilindungi CSRF via header Origin/Referer yang dicocokkan terhadap daftar `APP_ORIGINS` (dipisahkan koma, bawaan `APP_ORIGIN`). Mendukung demo LAN lokal tanpa membuka celah CSRF publik. **[Usulan]** |
| Privasi Perangkat Bersama | Tombol [Selesai] dan [Keluar] membersihkan data pasien dari memori komponen dan melakukan navigasi via `location.replace` agar riwayat tombol Back peramban tidak membocorkan data. Data disembunyikan otomatis bila tidak ada aktivitas selama 10 menit. **[Usulan]** |
| Pihak ketiga | Minimalkan skrip pihak ketiga; tidak ada analitik di halaman yang menampilkan data pasien |
| Hosting (A8, bila Vercel dipakai) | Output `console` masuk log Vercel, jadi scrubber `lib/privacy` wajib di semua log. Vercel Web Analytics dan Speed Insights tidak diaktifkan di halaman berisi data pasien. Preview deployment memakai database terpisah berisi data sintetis dan proteksi deployment aktif. Migrasi dijalankan terpisah dari build. **[Verifikasi]** region fungsi dan database terhadap ketentuan UU PDP soal transfer data kesehatan |

---

## 14. Aksesibilitas di Level Arsitektur

- Font Atkinson Hyperlegible Next dimuat lokal (self-hosted, `font-display: swap`), bukan dari CDN pihak ketiga.
- Semua ukuran berbasis `rem`; uji pada text scaling 200% dan lebar 320 px.
- Komponen status (`StatusBanner`) satu-satunya cara menampilkan status, agar tampilan selalu konsisten (sejak 16 Okt 2026: palet Cyan, tanpa ikon, makna lewat judul teks; lihat `design.md` §2B).
- Fokus keyboard terlihat; hormati `prefers-reduced-motion`.
- Tampilan lintas peran memakai komponen bersama di `src/components/` agar tidak berbeda per layar: `PageShell` dengan `AppHeader` (menempel di atas) dan navigasi bawah per peran, `HeroCard`, `OtpCodeInput`, `StatusBanner`. Aturan visualnya di `design.md` §6 (16 Okt 2026); perubahan ini hanya lapisan tampilan dan tidak mengubah batas akses atau alur data.
- Input 16 px untuk mencegah auto-zoom iOS Safari.
- Pesan galat memberi langkah lanjut (contoh: "Minta pasien memperbarui ConsentQR di aplikasinya.").

---

## 15. Rencana Pengujian dan Verifikasi

| Yang diuji | Cara |
| :--- | :--- |
| Aturan akses brief dan QR (fasilitas, tanggal, field) | Uji otomatis: setiap aturan di bagian 7 dan 8 punya kasus lolos dan gagal |
| Tidak ada kebocoran data ke log/analitik | Uji dengan data sintetis, cari data itu di semua keluaran log |
| Sinkronisasi offline idempotent | Kirim antrean yang sama dua kali, pastikan tidak ada duplikat |
| PWA di iOS Safari | Perangkat nyata: install, tutup lama, buka lagi, cek data |
| Kontras dan fokus | Pemeriksaan otomatis + pemeriksaan manual pembaca layar |
| Klaim "3 ketukan" petugas | Hitung pada alur nyata dengan isi centang otomatis dari saran tindakan (T6) |
| Penolakan pindai | Token tak dikenal, kedaluwarsa, dan dicabut tidak membocorkan keberadaan token (bagian 7); petugas nonaktif langsung ditolak (A4); setiap penolakan tercatat `qr_scan_rejected` |
| Tautan pendamping | Pendamping tidak bisa membaca data apa pun sebelum disetujui (D3); akses berakhir seketika setelah dicabut (P21); perubahan oleh pendamping tercatat dan terlihat pasien (D5) |
| Delegasi darurat | Hanya pendamping terdaftar; terbatas satu fasilitas dan satu tanggal; ditolak di fasilitas/tanggal lain; tercatat dengan petugas pengesah |
| Konfirmasi CareProof | `confirmed_by` tersimpan benar untuk pasien, pendamping, dan di tempat; tanpa jawaban tidak dihitung terpenuhi; jawaban offline tidak terduplikasi saat sinkron |
| Agregat dashboard | Tidak ada identitas pasien; kelompok di bawah ambang disembunyikan; sub-metrik pendamping dan di tempat terpisah |
| Hapus akun | Data pribadi, tautan, dan QR hilang; agregat hanya tersisa bila pasien setuju statistik; audit log tidak lagi menunjuk ke identitas pasien |
| Draft di perangkat | Draft paspor (P5) tidak bisa dibagikan lewat QR sebelum disimpan; draft petugas (T8) terkunci saat petugas keluar (bagian 9 poin 5) |

---

## 16. Roadmap dan Keputusan Terbuka

**Prototipe (inti):** profil, ConsentQR, pindai + baca saat pindai, brief, kartu cetak tanpa QR (media fisik murni), pencatatan kunjungan offline (T4b berbasis ID pasien fisik), konfirmasi CareProof (pasien single source of truth), audit P19, delegasi darurat di tempat + pemulihan lewat pendamping.

**Roadmap:** diagnosis lokal terenkripsi, perbandingan versi dan Pulihkan Versi di K6, transfer antar-perangkat untuk pendamping.

**Keputusan yang diselesaikan / ditutup:**
1. Kartu cetak adalah media fisik murni (teks ringkasan) **sama sekali tanpa QR code**, terbaca langsung tanpa gawai/daya/sinyal (A).
2. Resolusi CareProof: suara pasien adalah sumber kebenaran tunggal; konfirmasi pendamping diberi label dan sub-metrik terpisah (C).
3. Pemulihan akun dipisah: Delegasi Darurat di Tempat (langsung, disahkan petugas) vs Pemulihan Penuh Permanen (jeda keselamatan 24 jam) (D).

**Keputusan yang masih perlu ditutup:**
1. P-04 (naik ke Must) dan K-01 (tetap Should) — usulan campuran ada di dokumen revisi, menunggu persetujuan.
2. Hosting untuk rilis: Vercel sebagai usulan utama (A8), menunggu konfirmasi; penyedia PostgreSQL dan region (UU PDP) belum dipilih. Prototipe berjalan lokal (bagian 3).
3. Hasil verifikasi iOS Safari dan UU PDP (bagian 12).
