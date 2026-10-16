# Panduan Demo & Klaim Prototipe AKSESPASS

Dokumen ini memuat skrip panduan eksekusi demo fungsional AKSESPASS beserta batasan klaim resmi yang memiliki bukti verifikasi dalam catatan hasil pengujian kode.

---

## 1. Persiapan Awal & Reset Lingkungan

Sebelum demo dimulai, pastikan dependensi siap dan basis data lokal berada dalam status awal yang bersih:

```bash
# 1. Reset, migrasi, dan isi data sintetis deterministik
pnpm db:reset && pnpm db:migrate && pnpm db:seed

# 1b. (Opsional, disarankan sebelum demo dashboard) data contoh tambahan: 48 pasien
#     sintetis dan sekitar 590 kunjungan Jun-Okt 2026 untuk Puskesmas Contoh A dan Klinik Contoh B.
#     Aman dijalankan berulang (tidak menggandakan data).
pnpm db:seed:dummy

# 2. Jalankan server lokal Next.js
pnpm dev
```

Aplikasi dapat diakses melalui peramban di `http://localhost:3000`.

---

## 2. Akun Uji Sintetis (Dari Seed)

> **Catatan Pengujian:** Seluruh data di bawah ini adalah data sintetis fiktif untuk keperluan pengujian lokal. Sistem menggunakan **OTP Tiruan** (`OTP_MODE=dev-display`); kode verifikasi 6 digit akan langsung ditampilkan di antarmuka layar setelah tombol kirim ditekan.

| Peran | Nama Akun Sintetis | Nomor Telepon | Halaman Masuk | Keterangan Profil |
| :--- | :--- | :--- | :--- | :--- |
| **Pasien** | Pasien Contoh 1 | `+620000000001` | `/masuk` | Kebutuhan Tuli (bahasa isyarat, teks) |
| **Pasien** | Pasien Contoh 2 | `+620000000002` | `/masuk` | Kebutuhan sensorik/ruang tenang |
| **Pasien** | Pasien Contoh 3 | `+620000000003` | `/masuk` | Kebutuhan low vision/tunanetra |
| **Pasien** | Pasien Contoh 4 | `+620000000004` | `/masuk` | Kebutuhan mobilitas/kursi roda (tertaut pendamping) |
| **Petugas** | Petugas Aktif A | `+620000000011` | `/masuk/petugas` | Puskesmas Contoh A (petugas aktif) |
| **Petugas** | Petugas Nonaktif A | `+620000000012` | `/masuk/petugas` | Puskesmas Contoh A (status nonaktif — ditolak) |
| **Admin** | Admin Fasilitas A | `+620000000021` | `/masuk/petugas` | Puskesmas Contoh A (admin fasilitas) |
| **Pendamping**| Pendamping Contoh 1 | `+620000000005` | `/masuk` | Tertaut aktif ke Pasien Contoh 4 & 7 |
| **Pasien** | Pasien Contoh 6–9 | `+620000000006` sampai `+620000000009` | `/masuk` | Pasien tambahan untuk uji tautan dan kunjungan |
| **Petugas** | Petugas Klinik B | `+620000000013` | `/masuk/petugas` | Klinik Contoh B (fasilitas kedua; untuk uji isolasi antarfasilitas) |
| **Admin** | Admin Fasilitas B | `+620000000022` | `/masuk/petugas` | Klinik Contoh B |
| **Kurator** | Kurator Aturan | `+620000000031` | `/masuk/petugas` | Kurator 1 (`+620000000031`) menulis, Kurator 2 (`+620000000032`) dan Kurator 3 (`+620000000033`) meninjau; layar K3–K6 tersedia |

---

## 3. Skenario Urutan Demo

Disarankan menggunakan dua jendela peramban terpisah (misalnya Jendela Reguler untuk Pasien/Pendamping dan Jendela Penyamaran/Incognito untuk Petugas/Admin).

### Langkah 1: Pasien Buat ConsentQR
1. Di jendela Pasien, buka `/masuk`.
2. Masukkan nomor telepon `+620000000001`, klik **Kirim Kode Verifikasi**.
3. Masukkan 6 digit kode OTP tiruan yang muncul pada layar.
4. Di Beranda Pas (`/pasien`), klik tombol **Mulai Kunjungan**.
5. Pilih fasilitas **Puskesmas Contoh A**, lalu klik **Lanjut**.
6. Pada halaman Pengaturan ConsentQR (`/pasien/kunjungan/qr`), tinjau kebutuhan yang akan dibagikan, lalu klik **Buat ConsentQR**.
7. Layar menampilkan gambar QR Code beserta **Kode Manual 26 karakter** dengan masa kedaluwarsa 15 menit.

### Langkah 2: Petugas Pindai (atau Kode Manual)
1. Di jendela Petugas, buka `/masuk/petugas`.
2. Masukkan nomor `+620000000011`, minta OTP tiruan dan verifikasi.
3. Di Beranda Petugas (`/petugas`), klik **Pindai ConsentQR** (`/petugas/pindai`).
4. Klik **Mulai kamera** dan arahkan ke layar QR Pasien.
5. Bila pemindaian berhasil, sistem otomatis berpindah ke ringkasan kebutuhan pasien (nama panggilan dan daftar kebutuhan yang diizinkan).

### Langkah 3: Saran Tindakan
1. Dari halaman ringkasan kebutuhan, klik tombol **Lanjut ke Saran Tindakan**.
2. Sistem mengeksekusi mesin aturan akomodasi (`/api/petugas/saran`) dan menampilkan rekomendasi tindakan pelayanan yang disesuaikan dengan kebutuhan pasien (misal: "Siapkan komunikasi tertulis / juru bahasa isyarat").

### Langkah 4: Catat Bantuan
1. Klik **Lanjut ke Catat Bantuan**.
2. Petugas mencentang tindakan akomodasi yang telah dipenuhi.
3. Tambahkan catatan petugas bila diperlukan (maksimal 140 karakter, dengan peringatan anti-data sensitif).
4. Klik **Simpan Bantuan & Kirim Permintaan Konfirmasi**. Kunjungan tercatat dengan status menunggu konfirmasi pasien.
5. Klik tombol **Selesai** untuk membersihkan data pasien dari memori peramban secara aman.

### Langkah 5: Pasien Konfirmasi Kunjungan (CareProof)
1. Kembali ke jendela Pasien di `/pasien` (atau buka `/pasien/konfirmasi`).
2. Muncul kartu notifikasi permintaan konfirmasi dari Puskesmas Contoh A.
3. Klik kunjungan tersebut untuk membuka detail CareProof (`/pasien/konfirmasi/[visitId]`).
4. Pasien memilih skala kepuasan: *"Ya, semuanya"*, *"Hanya sebagian"*, atau *"Tidak sama sekali"*.
5. Klik **Kirim Konfirmasi**. Respons tersimpan dengan tanda verifikasi `confirmed_by = 'patient'`.

### Langkah 6: Riwayat Akses & Pencabutan ConsentQR
1. Di jendela Pasien, buka menu **Kontrol Akses** (`/pasien/akses`) lalu pilih **Riwayat Akses** (`/pasien/akses/riwayat`).
2. Periksa bahwa pembacaan data oleh Petugas Puskesmas Contoh A tercatat dalam audit log waktu-nyata tanpa menampilkan rincian medis.
3. Kembali ke **ConsentQR Aktif** (`/pasien/akses/qr`).
4. Klik tombol **Cabut Izin Akses** pada QR yang masih aktif. Status QR seketika dicabut di basis data.

### Langkah 7: Pindai Ulang Ditolak (Uji Keamanan Fail-Closed)
1. Di jendela Petugas pada `/petugas/pindai`, coba pindai kembali QR yang telah dicabut atau masukkan kodenya.
2. Sistem menampilkan pesan penolakan: kode tidak valid atau telah dicabut.
3. Penolakan terjadi secara aman tanpa membocorkan informasi apakah token tersebut pernah terdaftar, dan insiden penolakan dicatat dalam audit log.

### Langkah 8: Dashboard Agregat Admin Fasilitas
1. Keluar dari akun petugas, lalu masuk ke `/masuk/petugas` menggunakan akun Admin Fasilitas `+620000000021`.
2. Buka **Dashboard Fasilitas** (`/admin/dashboard`).
3. Tinjau metrik agregat: *Accommodation Fulfillment Rate (AFR)*, grafik garis tren kunjungan dan tren AFR, serta batang status konfirmasi, penjawab, dan kebutuhan belum terpenuhi. Tanpa `pnpm db:seed:dummy`, hanya data seed awal yang ada sehingga sebagian bulan tampil "(disembunyikan)".
4. Perhatikan proteksi privasi k-anonymity: sel data dengan jumlah pasien di bawah ambang batas (kurang dari 5 pasien berbeda) otomatis berlabel *"Disembunyikan (kurang dari 5 pasien)"*. Admin tidak memiliki akses melihat profil individual pasien.

> **Tampilan:** semua peran memakai header putih yang menempel di atas, kartu teal utama di beranda, dan navigasi bawah melayang (lihat `design.md` §6). Kode verifikasi di semua layar memakai enam kotak OTP.

### Langkah 9: Pendampingan Pasien
1. Buka jendela Pasien, keluar dan masuk kembali menggunakan akun Pendamping `+620000000005`.
2. Di halaman `/pendamping`, tampak daftar pasien yang tertaut aktif (Pasien Contoh 4).
3. Pendamping dapat mendemonstrasikan:
   - Melihat dan menyunting kebutuhan paspor atas nama pasien (`/pendamping/tautan/[linkId]/paspor`).
   - Membuat ConsentQR atas nama pasien (`/pendamping/tautan/[linkId]/qr`).
   - Menjawab konfirmasi bantuan CareProof atas nama pasien (`/pendamping/tautan/[linkId]/konfirmasi`), yang ditandai transparan dengan label *"Dijawab oleh pendamping"*.

---

## 4. Cadangan / Fallback (Bila Kamera Gagal)

Jika kamera gawai atau peramban tidak dapat diakses saat demo (misalnya izin ditolak, koneksi HTTP lokal tanpa SSL kamera, atau kendala perangkat keras):

1. Pada halaman `/petugas/pindai`, gulir ke bagian **"Masukkan Kode Manual"** di bawah area bidik kamera.
2. Pasien menyebutkan atau menunjukkan kode 26 karakter yang tercantum di bawah QR-nya (atau bagian hash token URL).
3. Petugas mengetikkan kode ke dalam kotak input `#manual-qr-code` lalu mengklik tombol **Pindai Kode Manual**.
4. Alur validasi server, rekomendasi saran, dan pencatatan berjalan 100% identik dengan alur kamera.

---

## 5. Batasan & Klaim yang Terverifikasi

Bagian ini merangkum klaim teknis yang didukung bukti konkret dalam hasil pengujian kode (Catatan Hasil Bagian 1–10A):

### Klaim yang Terverifikasi Secara Teknis
1. **Kendali Penuh Pasien atas ConsentQR:**
   - QR code tidak memuat data pribadi atau medis; hanya berisi token acak kriptografis ephemeral (15 menit).
   - Basis data hanya menyimpan hash HMAC token (`HASH_PEPPER`), bukan token asli.
   - Pasien dapat mencabut izin kapan saja, dan pemindaian ulang token yang dicabut ditolak secara *fail-closed*.
2. **Isolasi Peran & Hak Akses (RLS):**
   - Pemeriksaan otorisasi ditegakkan di sisi server dan database PostgreSQL (Row-Level Security). Petugas fasilitas lain atau petugas nonaktif diblokir secara otomatis.
   - Admin fasilitas dibatasi hanya membaca statistik agregat via fungsi `SECURITY DEFINER` dengan ambang batas k-anonymity (sel `< 5` pasien disembunyikan).
   - Pendamping hanya dapat mengakses data pasien jika tautan berstatus `active` yang telah disetujui pasien.
3. **Pencatatan Audit Append-Only & Pembersihan Log:**
   - Setiap peristiwa pembacaan data dan penolakan pemindaian dicatat dalam tabel audit log append-only dengan pengenal pseudonim.
   - Modul privasi menyaring data sensitif sehingga tidak bocor ke log aplikasi peramban maupun server.
4. **Verifikasi Kualitas Kode Otomatis:**
   - Pada pencatatan awal (Catatan Hasil Bagian 1–10A): 217 tes unit dan integrasi pada 25 berkas tes lolos 100% (`pnpm test`). **Angka ini historis; jalankan ulang sebelum dikutip**, karena kode bertambah sejak itu.
   - Pengecekan statis lulus tanpa kesalahan (`pnpm lint`, `pnpm typecheck`, dan `pnpm build`).

### Batasan Penting (Hal yang TIDAK Diklaim)
- **JANGAN klaim "memenuhi standar WCAG 2.2 AA":** Komponen antarmuka telah menerapkan token warna kontras, ukuran `rem`, dan target sentuh minimal 48 px, tetapi sistem belum melalui audit kepatuhan resmi dan pengujian komprehensif dengan pembaca layar fisik.
- **JANGAN klaim "bisa offline/PWA":** Validasi ConsentQR mewajibkan koneksi aktif ke server; ketahanan penyimpanan offline di perangkat nyata (seperti iOS Safari) belum diverifikasi.
- **JANGAN klaim "diagnosis tidak pernah ke server":** Fitur pengelolaan diagnosis belum dibangun dan masih berada pada roadmap masa depan; pada prototipe ini data diagnosis tidak diminta maupun disimpan.
- **JANGAN klaim "sesuai UU PDP":** Belum dilakukan asesmen kepatuhan hukum atau sertifikasi perlindungan data pribadi formal.
- **OTP masih tiruan:** Sistem autentikasi saat ini berjalan dalam mode simulasi (`OTP_MODE=dev-display`) untuk kemudahan pengujian lokal, belum terhubung ke gateway SMS/WhatsApp produksi.
- **Aplikasi belum di-deploy:** Kode berjalan di lingkungan pengembangan lokal dan belum diluncurkan ke infrastruktur komputasi awan.
