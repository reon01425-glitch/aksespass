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
| 1 | Scaffold dan alat pemeriksaan | 0 (K-2) | — | ☐ |
| 2 | Database dan skema | 1, K-1 | — | ☐ |
| 3 | Inti domain: audit, privasi, auth, consent | 2, K-4 | P-05, P-06, T-01 (sisi server) | ☐ |
| 4 | Komponen UI bersama | 1 (boleh paralel dengan 2–3) | Nonfungsional | ☐ |
| 5 | Masuk dan akun | 3, 4, K-3 | P-01, T-01, A-01 (aktivasi) | ☐ |
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
- [ ] Next.js (App Router) + TypeScript mode `strict` + Tailwind + Lucide React.
- [ ] Skrip di `package.json` dengan nama tetap: `lint`, `typecheck`, `test`, `build` (bagian lain merujuk nama ini).
- [ ] Test runner dan alat uji aksesibilitas sesuai K-2.
- [ ] Font Atkinson Hyperlegible Next di-host sendiri, `font-display: swap`, hanya bobot 400 dan 700.
- [ ] Token warna `design.md` §2C sebagai CSS variable dan terhubung ke Tailwind.
- [ ] Gaya dasar: `rem` untuk ukuran teks, focus ring terlihat, aturan `prefers-reduced-motion`.
- [ ] Header keamanan dasar §13: CSP, `Referrer-Policy`.
- [ ] `.gitignore` untuk `node_modules`, `.next`, file env.
- [ ] README singkat: cara install, jalankan, dan perintah pemeriksaan.

**Verifikasi**
- [ ] `lint`, `typecheck`, `test` (minimal satu tes contoh), dan `build` dijalankan dan lolos.
- [ ] Halaman contoh di lebar 320 px tidak punya horizontal scroll.
- [ ] Panel network browser: font dimuat dari domain sendiri, tidak ada permintaan ke CDN font.
- [ ] Hanya file font 400 dan 700 yang dimuat.
- [ ] Header CSP dan `Referrer-Policy` terlihat di respons.

**Catatan hasil:**

---

## Bagian 2 — Database dan Skema

**Tujuan:** skema dari `architecture.md` §6 dengan pengaman di level database.
**Baca:** `architecture.md` §6, §10 (otorisasi berlapis), §11, §13.

**Checklist**
- [ ] Migrasi untuk tabel yang dibutuhkan Bagian 3–8: `users`, `patient_profiles`, `needs_catalog`, `accommodation_rules`, `consents`, `consent_qr`, `facilities`, `staff_memberships`, `visits`, `visit_confirmations`, `follow_ups`, `audit_events`. Tabel untuk Bagian 9–10 ditambahkan di bagiannya.
- [ ] Tidak ada kolom diagnosis di tabel mana pun.
- [ ] `consent_qr` hanya menyimpan `token_hash`.
- [ ] Peran DB aplikasi hanya punya `INSERT` dan `SELECT` pada `audit_events`.
- [ ] Kebijakan RLS minimal: petugas hanya baris fasilitasnya; admin tidak bisa membaca `briefs` dan profil pasien.
- [ ] Seed sintetis: 2 fasilitas, petugas aktif dan nonaktif, 4 pasien (satu per profil: Tuli, autistik, low vision, mobilitas), katalog kebutuhan, aturan saran bawaan per profil.
- [ ] Koneksi dan kredensial lewat env, tidak ter-commit.
- [ ] Kebijakan RLS membaca identitas dari setting transaksi (`current_setting(...)`), sesuai aturan siap serverless di `architecture.md` §3.
- [ ] Tabel penghitung rate limit dan tabel OTP tiruan (state tidak di memori).

**Verifikasi**
- [ ] Migrasi dijalankan dari database kosong dan berhasil; seed berhasil.
- [ ] Tes: `UPDATE` dan `DELETE` pada `audit_events` dengan peran aplikasi **ditolak database**.
- [ ] Tes RLS: petugas fasilitas A tidak bisa membaca data fasilitas B, bahkan lewat kueri langsung.
- [ ] `grep -ri diagnos` pada folder skema/migrasi tidak menemukan kolom.
- [ ] Seed tidak berisi nama atau nomor yang menyerupai orang nyata.
- [ ] `typecheck` dan `test` lolos.

**Catatan hasil:**

---

## Bagian 3 — Inti Domain (tanpa UI)

**Tujuan:** satu-satunya jalur baca data pasien, dengan audit otomatis. Bagian paling kritis untuk privasi.
**Baca:** `architecture.md` §5, §7, §10, §11, §13; `AGENTS.md` (Aturan arsitektur dan data).

**Checklist**
- [ ] `lib/audit`: satu fungsi tulis kejadian; modul lain tidak menulis ke `audit_events` secara langsung.
- [ ] `lib/privacy`: scrubber log dan daftar field terlarang.
- [ ] `lib/auth`: sesi cookie `httpOnly` + `SameSite=Lax`, guard peran, guard fasilitas.
- [ ] `lib/consent`: buat consent + token acak ≥ 128 bit (simpan hash); validasi berurutan sesuai §7; cabut; baca profil terkini yang disaring ke field yang dicentang; tulis `qr_scanned`, `profile_read` (nama field saja), `qr_scan_rejected`.
- [ ] Respons gagal mengikuti keputusan K-4.
- [ ] Rate limit percobaan pindai per petugas dan per IP, disimpan di Postgres dan diperiksa di route handler.
- [ ] Satu helper transaksi yang selalu meng-set konteks RLS dengan `set_config(..., true)`; tidak ada kueri data pasien di luar helper ini.
- [ ] Middleware hanya memeriksa cookie dan peran; tidak mengimpor modul database.
- [ ] Route handler `POST /api/scan` hanya memanggil `lib/consent`.

**Verifikasi** (tes otomatis, masing-masing punya kasus lolos dan gagal)
- [ ] Pindai lolos: petugas aktif, fasilitas cocok, token valid → hanya field yang dicentang yang kembali.
- [ ] Ditolak: fasilitas tidak cocok, kedaluwarsa, dicabut, petugas nonaktif, token tak dikenal.
- [ ] Respons untuk token tak dikenal vs kedaluwarsa vs dicabut sesuai K-4 (bila generik: status dan body identik).
- [ ] Setiap pindai lolos menulis `profile_read`; setiap penolakan menulis `qr_scan_rejected`; tidak ada token mentah atau nilai profil di audit.
- [ ] Database berisi hash, bukan token asli (cek langsung ke tabel).
- [ ] Rate limit memblokir setelah batas, dan tetap memblokir setelah server dev di-restart (bukti state tidak di memori).
- [ ] Tes: dua request berurutan dengan petugas berbeda di koneksi pool yang sama tidak saling melihat konteks RLS.
- [ ] `grep`: file middleware tidak mengimpor modul database.
- [ ] Tes kebocoran: data sintetis unik tidak muncul di log aplikasi saat pindai lolos maupun gagal.
- [ ] `grep` memastikan tidak ada impor tabel profil pasien di luar `lib/consent` dan alur milik pasien sendiri.
- [ ] `lint`, `typecheck`, `test` lolos.

**Catatan hasil:**

---

## Bagian 4 — Komponen UI Bersama

**Tujuan:** komponen yang dipakai ulang semua layar, sesuai `design.md`.
**Baca:** `design.md` §1–§5; `architecture.md` §14.

**Checklist**
- [ ] Button (primer, sekunder), Input teks/OTP, Chip pilihan bergambar, Toggle, `StatusBanner` (sukses/peringatan/galat), Pop-up konfirmasi, Skala ikon CareProof.
- [ ] Kerangka halaman: header dengan tombol kembali, area konten `max-width: 60ch` untuk teks.
- [ ] Halaman katalog komponen (hanya di mode pengembangan) untuk uji visual.

**Verifikasi** (per komponen)
- [ ] Semua target interaktif ≥ 48 × 48 px (diukur di DevTools).
- [ ] Dapat dioperasikan dengan keyboard saja; focus ring terlihat.
- [ ] Status memakai ikon + teks + warna; tidak ada status yang hanya warna.
- [ ] Input 16 px, label terlihat di luar input, tidak memakai placeholder sebagai label.
- [ ] Lebar 320 px dan zoom teks 200%: tidak ada horizontal scroll atau teks terpotong.
- [ ] `prefers-reduced-motion` aktif: tidak ada animasi.
- [ ] Alat uji aksesibilitas otomatis: tidak ada pelanggaran pada halaman katalog.
- [ ] `grep` tidak menemukan `font-medium`, `font-semibold`, atau warna hex di luar token.
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 5 — Masuk dan Akun

**Tujuan:** pasien dan petugas bisa masuk; petugas nonaktif tertolak.
**Layar:** P1–P4, T1–T3 (kerangka), A1–A2 (aktivasi).
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §2, §10, §13.

**Checklist**
- [ ] P1 splash: arah sesuai sesi.
- [ ] P2 onboarding aksesibilitas: preferensi ukuran teks dan kontras tersimpan dan berlaku.
- [ ] P3 daftar/masuk dengan OTP sesuai K-3; persetujuan statistik anonim terpisah dan opsional.
- [ ] P4 beranda pasien (menu boleh mengarah ke halaman kosong dulu).
- [ ] T2 login petugas + aktivasi lewat undangan; A2 aktivasi admin.
- [ ] Sesi petugas masa berlaku pendek, keluar otomatis.

**Verifikasi**
- [ ] Tes: petugas nonaktif atau belum diaktivasi tidak bisa masuk; pesan "Hubungi admin fasilitas".
- [ ] Tes: OTP salah dan kedaluwarsa ditolak; ada batas percobaan.
- [ ] Kode OTP tidak muncul di log aplikasi.
- [ ] Cookie sesi `httpOnly`; tidak ada token di `localStorage`.
- [ ] Alur P1→P3→P5 dan T1→T2→T3 dicoba manual dengan keyboard dan di lebar 320 px.
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

---

## Bagian 6 — Pasien: Paspor, ConsentQR, Kontrol Akses

**Tujuan:** semua story Must sisi pasien kecuali CareProof.
**Layar:** P5–P6, P9, P11–P12, P18–P20.
**Baca:** `docs/user-flows.md` layar terkait; `architecture.md` §6, §7, §11.

**Checklist**
- [ ] P5 editor paspor per kelompok kebutuhan; tidak ada kolom diagnosis; draft sesuai K-8.
- [ ] P6 pratinjau persis seperti yang akan dilihat petugas; simpan.
- [ ] P9 pilih fasilitas (jalur "sudah di fasilitas").
- [ ] P11 pilih field (P-04) dan masa berlaku.
- [ ] P12 QR besar berisi URL dengan token saja, hitung mundur, cabut dengan konfirmasi; berubah menjadi "Dipindai oleh petugas".
- [ ] P18–P20 riwayat akses (siapa, kapan, fasilitas, nama field) dan daftar QR aktif dengan cabut.

**Verifikasi**
- [ ] Dekode isi QR: hanya URL + token, tanpa nama, kebutuhan, atau ID pasien.
- [ ] Tes: draft belum disimpan tidak bisa dibagikan lewat QR.
- [ ] Tes: profil diubah → QR aktif membaca profil terbaru (perilaku "dibaca saat dipindai").
- [ ] Tes: QR dicabut di P12 atau P20 → pindai berikutnya ditolak dan pencabutan tampil di P19.
- [ ] P19 hanya menampilkan riwayat milik pasien yang masuk (tes akses silang antarpasien ditolak).
- [ ] Halaman token memakai `Referrer-Policy: no-referrer`.
- [ ] Uji manual keyboard + 320 px + zoom 200% pada P5, P11, P12, P19.
- [ ] `lint`, `typecheck`, `test`, `build` lolos.

**Catatan hasil:**

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
