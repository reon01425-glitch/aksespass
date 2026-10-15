# AKSESPASS — Alur Navigasi Layar

> **Sumber:** dokumen "Alur Navigasi Layar AKSESPASS" (11 Okt 2026). Menggantikan user flow PDF hal. 12–13.
> Tabel pemetaan user story → layar dipindahkan ke kolom "Layar" di `docs/user-stories.md` agar tidak ada dua salinan.

## Ringkasan dan Konvensi

Alur navigasi per layar untuk lima aktor, dalam 7 kelompok alur: Pasien (A, B, C), Pendamping, Petugas, Admin Fasilitas, dan Kurator Aturan. Setiap layar mencantumkan user story (US) yang dipenuhinya.

| Kode layar | Aktor | Cakupan |
| :--- | :--- | :--- |
| P1–P8 | Pasien A | Splash, onboarding, daftar, beranda, MyCare Passport, draft, kartu cetak |
| P9–P17 | Pasien B | Kunjungan, ConsentQR, antrean, KomunikaCare, CareProof, jalur offline |
| P18–P23 | Pasien C | Kontrol akses, pendamping, hapus akun |
| D1–D8 | Pendamping | Tautan, kelola atas nama pasien, konfirmasi |
| T1–T9 | Petugas | Login, pindai, saran tindakan, catat bantuan |
| A1–A8 | Admin Fasilitas | Akun petugas, dashboard, tindak lanjut |
| K1–K6 | Kurator Aturan | Pustaka, penyusunan, persetujuan, riwayat |

Kode layar **tanpa tanda hubung** (P16, T4b). Kode user story **dengan tanda hubung** (P-07, T-05). Layar A1–A8 bukan keputusan arsitektur A1–A7 di `architecture.md`.

Prioritas (sesuai daftar US): M = Must, S = Should, C = Could (roadmap).
Format tiap layar: Tampilan, Aksi Utama, Aksi Alternatif atau Error, Navigasi, US.

**Aturan untuk semua layar (nonfungsional):**
- Kompatibel pembaca layar, kontras tinggi, teks dapat diperbesar, target sentuh besar (rincian: `design.md`).
- Bahasa sederhana dengan ikon pendamping teks.
- Tombol kembali dan batal selalu tersedia; tindakan merusak (cabut, hapus) selalu meminta konfirmasi.
- Semua pembukaan data tercatat di audit log.

---

## Alur Pasien A: Pengaturan Awal (P1–P8)

Pasien memulai dari splash screen, menyesuaikan aksesibilitas, mendaftar, lalu menyusun MyCare Passport dan kartu cetak sekali saja.

### [P1] Splash Screen
- **Tampilan:** logo AKSESPASS dan tagline, indikator memuat. Singkat dan dapat dilewati.
- **Aksi Utama:** tidak ada; sistem memeriksa apakah pasien sudah masuk dan apakah ada draft.
- **Navigasi:** belum pernah membuka aplikasi → [P2]; sudah punya sesi → [P4]; sesi berakhir → [P3].

### [P2] Onboarding Aksesibilitas
- **Tampilan:** tiga langkah: pilih bahasa (Indonesia sederhana), ukuran teks dan kontras, mode pembaca layar atau teks-ke-suara. Satu kalimat privasi: aplikasi tidak meminta diagnosis.
- **Aksi Utama:** pasien memilih preferensi, lalu [Lanjut]. Pratinjau teks berubah langsung.
- **Aksi Alternatif:** [Lewati] memakai pengaturan bawaan; dapat diubah kapan saja di [P22].
- **Navigasi:** → [P3].
- **US:** P-01 (aksesibilitas formulir), nonfungsional.
- **Catatan implementasi (Prompt 9):** Bahasa hari ini hanya Indonesia sederhana. Pengaturan teks-ke-suara ditunda (bagian KomunikaCare); langkah 3 hanya memuat informasi dukungan pembaca layar sistem (TalkBack/VoiceOver).

### [P3] Daftar atau Masuk
- **Tampilan:** satu kolom nomor HP, [Kirim kode], lalu kolom kode verifikasi (OTP). Tautan [Masuk dengan bantuan pendamping]. Kotak persetujuan opsional terpisah: izinkan kunjungan saya dihitung dalam statistik anonim fasilitas.
- **Aksi Utama:** pasien memasukkan kontak, menerima kode, memasukkan kode. Akun baru dibuat otomatis bila belum ada.
- **Aksi Alternatif atau Error:** kode salah atau kedaluwarsa → pesan sederhana dan opsi kirim ulang. Lupa akses → pemulihan lewat kontak yang sama atau lewat pendamping yang tertaut.
- **Navigasi:** akun baru → [P4] (dengan ajakan "Isi Paspor"); akun lama → [P4].
- **US:** P-01.
- **Catatan implementasi (Prompt 9):**
  - Alur lupa akses/pemulihan dan aktivasi akun lewat undangan ditunda.
  - Penyesuaian alur: akun baru mendarat di [P4] dengan ajakan utama "Isi Paspor" (bukan langsung melompat ke [P5]), agar tombol [Keluar] tetap terjangkau dan pengguna memiliki orientasi beranda yang jelas.

### [P4] Beranda Pasien
- **Tampilan:** kartu status paspor (lengkap atau belum), tombol utama besar [Mulai Kunjungan] (jika paspor lengkap) atau [Isi Paspor] (jika belum diisi), menu: Paspor Saya, Kartu Cetak, Kontrol Akses, Pendamping, Akun. Jika ada draft, banner [Lanjutkan draft paspor].
- **Aksi Utama:** pasien memilih menu atau [Mulai Kunjungan] / [Isi Paspor].
- **Navigasi:** [Mulai Kunjungan] → [P9]; [Isi Paspor] / Paspor Saya → [P5]; Kartu Cetak → [P7]; Kontrol Akses → [P18]; Pendamping → [P21]; Akun → [P22].
- **US:** P-02, P-03 (pintu masuk).
- **Catatan implementasi (Prompt 9):** Menu "Kartu Cetak" dan "Akun" belum ditampilkan hari ini (di luar cakupan Prompt 9). Tombol [Keluar] tersedia di bagian bawah menu.

### [P5] Editor MyCare Passport
Satu kelompok kebutuhan per layar, dengan indikator langkah (misalnya 2 dari 5).
- **Tampilan:** pilihan bergambar per kelompok: Komunikasi (BISINDO, tulisan, papan gambar, bicara pelan), Penglihatan, Pendengaran, Mobilitas, Sensorik dan Lingkungan (tenang, penjelasan bertahap), Pendampingan. Kolom catatan bebas opsional. **Tidak ada kolom diagnosis.**
- **Aksi Utama:** pilih kebutuhan lalu [Lanjut]; di langkah terakhir [Lihat Pratinjau].
- **Simpan Draft:** setiap pilihan tersimpan otomatis sebagai draft **di perangkat**. Jika pasien keluar atau aplikasi tertutup, [P4] menampilkan [Lanjutkan draft paspor]. Draft tidak dapat dibagikan lewat QR sampai disimpan.
- **Aksi Alternatif:** [X] keluar dengan pilihan [Simpan draft] atau [Buang]. Untuk pengguna yang sudah punya paspor, layar ini berfungsi sebagai ubah profil.
- **Navigasi:** → [P6].
- **US:** P-01, P-02.
- **Catatan implementasi (Prompt 10):**
  - **Langkah Nama Panggilan:** ditambahkan sebagai Langkah 1 dari 8 pada editor wizard P5 ("Boleh nama panggilan, tidak perlu nama lengkap"), mengakomodasi kebutuhan tampilan T5 dan P6.
  - **Draft Memori Murni (K-8):** draft paspor hanya disimpan di memori halaman/React state, tidak disimpan ke perangkat (bebas dari localStorage, sessionStorage, IndexedDB, dan cookie). Jika pengguna keluar atau memuat ulang halaman, isian dibuang. Pilihan "Simpan draft" dan banner "Lanjutkan draft paspor" di P4 ditiadakan.

### [P6] Pratinjau dan Simpan Paspor
- **Tampilan:** ringkasan paspor seperti yang akan dilihat petugas (hanya kebutuhan layanan), dengan keterangan bahwa diagnosis tidak diminta.
- **Aksi Utama:** [Simpan Paspor] → pop-up/banner berhasil dengan [Mulai Kunjungan] dan [Ke Beranda] ([Atur Kartu Cetak] ditunda hari ini).
- **Aksi Alternatif:** [Kembali Edit] → [P5] dengan pilihan tetap terisi.
- **Navigasi:** [Mulai Kunjungan] → [P9]; [Ke Beranda] → [P4].
- **US:** P-01, P-02.
- **Catatan implementasi & konflik spesifikasi (Prompt 10):**
  - **Konflik teks P6 vs `architecture.md` §7:** teks spesifikasi awal P6 menyatakan *"Perubahan baru berlaku di ConsentQR berikutnya"*, sedangkan keputusan arsitektur inti `architecture.md` §7 (prinsip "data dibaca saat dipindai") menetapkan bahwa perubahan profil langsung berlaku seketika saat token dipindai, termasuk pada ConsentQR yang masih aktif. Implementasi mengikuti `architecture.md` §7 dengan pesan sukses: *"Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif."*

### [P7] Kartu Cetak
- **Tampilan:** daftar isi ringkasan yang bisa dicentang untuk dicetak (misalnya bahasa isyarat, bantuan mobilitas, pendampingan), pratinjau kartu, catatan bahwa kartu hanya memuat ringkasan kebutuhan.
- **Aksi Utama:** pilih isi, lalu [Cetak] atau [Unduh PDF]. Kartu hanya memuat ringkasan tertulis **tanpa QR akses** (sudah diputuskan). Kartu mencetak **Kode Kartu** 8 karakter (contoh ABCD-EFGH) yang statis per pasien; [Buat Kode Kartu Baru] mengganti kode dan mematikan kode lama.
- **Aksi Alternatif:** [Simpan untuk offline] menyimpan ringkasan di perangkat → [P8].
- **Navigasi:** selesai → [P4].
- **US:** P-14, T-05.

### [P8] Mode Offline (PWA)
- **Tampilan:** ringkasan kebutuhan besar untuk ditunjukkan ke petugas, tanda "Mode offline", status sinkron terakhir.
- **Aksi Utama:** pasien menunjukkan layar ke petugas. Dapat dibuka tanpa sinyal dari ikon aplikasi.
- **Aksi Alternatif:** perubahan atau konfirmasi saat offline masuk antrean lokal dan tersinkron otomatis saat online, dengan status "menunggu sinkron".
- **Navigasi:** [Kembali] → [P4].
- **US:** P-14.

---

## Alur Pasien B: Kunjungan (P9–P17)

Berjalan di setiap kunjungan: bagikan kebutuhan, dipanggil sesuai kebutuhan, dilayani, lalu mengonfirmasi.

### [P9] Mulai Kunjungan
- **Tampilan:** pilihan fasilitas (daftar RadioList fasilitas aktif seed), satu jalur utama hari ini: [Saya sudah di fasilitas]. Jalur Pre-Arrival Brief [P10] dan tautan mode offline [P8] tidak ditampilkan pada rilis ini. Bila paspor belum diisi, menampilkan peringatan "Isi paspor dulu" + tautan ke [P5].
- **Aksi Utama:** pilih fasilitas, lalu tekan [Saya sudah di fasilitas].
- **Aksi Alternatif:** tanpa paspor → diarahkan mengisi paspor.
- **Navigasi:** di fasilitas → [P11] dengan parameter `fasilitas=<id>`.
- **US:** P-03, P-12, P-14.

### [P10] Pre-Arrival Brief (opsional, Could)
- **Tampilan:** pilih fasilitas dan tanggal, kebutuhan untuk kunjungan ini (dari paspor, dapat dikurangi), [Kirim].
- **Aksi Utama:** [Kirim]. Fasilitas menerima ringkasan satu layar di beranda petugas.
- **Aksi Alternatif:** batal → [P9]. Brief hanya berlaku untuk jadwal yang dipilih dan kedaluwarsa otomatis.
- **Navigasi:** pop-up "Terkirim", lalu → [P11] saat pasien tiba.
- **US:** P-12.

### [P11] Pengaturan ConsentQR
- **Tampilan:** toggle per kategori kebutuhan yang benar-benar ada di paspor pasien + "Catatan untuk petugas" (bila ada). Nama panggilan selalu dibagikan (teks tetap). Peringatan "Diagnosis tidak ikut". Bawaan toggle mengikuti shared_fields consent terakhir pasien (diiris dengan kategori paspor aktif); fallback semua aktif. Pilihan masa berlaku (1 jam [bawaan], Hari ini s.d. 23:59 WIB, 24 jam). Pratinjau langsung "Yang akan dilihat petugas" via PatientNeedsSummary.
- **Aksi Utama:** pilih data dan masa berlaku, lalu [Buat QR].
- **Aksi Alternatif:** [Batal] → [P9]. Tanpa kategori terpilih → peringatan "Pilih minimal satu kebutuhan untuk dibagikan".
- **Batas QR:** satu QR aktif per pasien per fasilitas, baik dibuat pasien maupun pendamping. Bila sudah ada, server menolak dengan "Sudah ada QR aktif untuk fasilitas ini. Cabut dulu atau pakai yang ada." Fasilitas lain tetap boleh. **[Disetujui, 15 Okt 2026]**
- **Navigasi:** setelah [Buat QR] → [P12] (pada komponen/URL yang sama di memori, tanpa navigasi rute bertoken).
- **US:** P-03, P-04.

### [P12] Tampilan QR
- **Tampilan:** QR SVG besar (modul teks di atas putih, quiet zone 4 modul), kode manual berkelompok 4 karakter Crockford Base32, masa berlaku statis ("Berlaku sampai HH:mm WIB (sisa X menit)") dengan peringatan "Hampir Kedaluwarsa" (sisa ≤ 15 menit), ringkasan data tersaring, [Cabut Sekarang]. Teks peringatan privasi bahwa QR hanya tampil sekali di sesi memori ini.
- **Aksi Utama:** tunjukkan QR ke petugas. Polling berkala (5 detik) ke endpoint status pasien memantau pemindaian. Setelah dipindai, QR dan kode diganti StatusBanner sukses "Dipindai oleh petugas — <fasilitas>" dan tombol [Ke Beranda]; [Cabut Sekarang] tetap tersedia.
- **Aksi Alternatif atau Error:** QR kedaluwarsa atau dicabut → StatusBanner terkait + [Buat QR Baru]. Token dihapus dari memori halaman. [Cabut Sekarang] membuka ConfirmDialog konfirmasi pencabutan. Polling otomatis berhenti saat dipindai, kedaluwarsa, dicabut, atau tab tersembunyi.
- **Navigasi:** selesai → [P4] (Ke Beranda).
- **US:** P-03, P-05, P-06.

### [P13] Menunggu Dipanggil
- **Tampilan:** status "Menunggu", posisi antrean (bila tersedia), ringkasan kebutuhan yang diketahui petugas, [Buka KomunikaCare].
- **Aksi Utama:** menunggu; notifikasi visual dan getar akan memanggil.
- **Aksi Alternatif atau Error:** bila notifikasi tidak didukung atau gagal, layar menyatakan "Perhatikan layar ruang tunggu atau petugas" dan petugas memanggil secara visual. [P15] dapat dibuka kapan saja.
- **Navigasi:** saat giliran tiba → [P14].
- **US:** P-13 (Could), P-09.

### [P14] Panggilan Giliran
- **Tampilan:** layar penuh kontras tinggi "Giliran Anda" dan nama ruangan, dengan getar dan ikon besar. Suara tidak pernah menjadi satu-satunya penanda.
- **Aksi Utama:** [Saya Menuju Ruangan].
- **Navigasi:** → [P15] selama dilayani.
- **US:** P-13.

### [P15] KomunikaCare
Empat sub-layar yang dapat dibuka kapan saja selama kunjungan.
- **[P15.1] Papan Bergambar:** ikon keluhan dan kebutuhan (nyeri, haus, toilet, ulang). Menekan ikon menampilkan teks besar untuk petugas dan, bila dibuka dari kunjungan, mengirimnya ke panel [T7] petugas.
- **[P15.2] Teks ke Suara:** ketik atau pilih kalimat, [Ucapkan] memutar suara untuk petugas dan mengirim teksnya ke panel [T7] (bila dari kunjungan).
- **[P15.3] Teks Langsung dari Ucapan Petugas:** ucapan petugas tampil sebagai teks besar, dengan peringatan "Alat bantu, bukan pengganti juru bahasa isyarat". Bila akurasi rendah: [Ulangi] atau minta petugas menulis.
- **[P15.4] Frasa BISINDO (Could):** klip video pendek frasa medis umum untuk ditunjukkan ke petugas.
- **Aksi Alternatif:** jika mikrofon atau browser tidak mendukung, teks langsung dinonaktifkan dengan pesan jelas dan tersedia input ketik.
- **Navigasi:** setelah pelayanan selesai, notifikasi permintaan konfirmasi membuka [P16].
- **US:** P-09, P-10, P-11.

### [P16] Konfirmasi CareProof
- **Tampilan:** "Apakah kebutuhan Anda terpenuhi?" dengan tiga ikon besar: terpenuhi, sebagian, belum. Daftar bantuan yang dicatat petugas ditampilkan agar pasien bisa menilai.
- **Aksi Utama:** pilih ikon. Bila "sebagian" atau "belum", muncul daftar kebutuhan yang belum terpenuhi (ikon, catatan opsional), lalu [Kirim].
- **Aksi Alternatif atau Error:** tidak menjawab → status tetap "belum dikonfirmasi" dan **tidak** dihitung terpenuhi. Pasien dapat meminta pendamping menjawab (ditandai "oleh pendamping"), atau menjawab di tempat lewat ikon yang ditunjukkan petugas (ditandai "di tempat"). Jawaban saat offline masuk antrean lokal dan tersinkron saat online.
- **Navigasi:** → [P17].
- **US:** P-07, D-03.
- **Cakupan Bagian 8 (13 Okt 2026) [Diputuskan untuk rilis ini]:** daftar kunjungan tercatat 30 hari terakhir yang (a) belum dikonfirmasi, atau (b) dijawab pendamping/di tempat dan masih dapat ditimpa pasien (§9) → kartu "Konfirmasi Kunjungan" di [P4] menunjukkan jumlah menunggu. Pada layar detail, daftar kebutuhan yang belum terpenuhi hanya menampilkan kebutuhan milik pasien pada kategori yang relevan dengan kunjungan tersebut (dari consent atau bantuan yang dicatat), bukan seluruh kategori paspor. **Catatan bebas pasien di P16 TIDAK dibuat hari ini** (di luar cakupan K-8/catatan opsional unmet-need tetap ditunda); antrean offline untuk jawaban P16 juga belum dibuat (Bagian 9).

### [P17] Selesai dan Status Tindak Lanjut
- **Tampilan:** ucapan terima kasih, ringkasan konfirmasi, daftar kebutuhan belum terpenuhi beserta status (Diterima, Sedang Ditindaklanjuti, Selesai).
- **Aksi Utama:** [Kembali ke Beranda]. Status tindak lanjut dapat dibuka lagi dari beranda.
- **Navigasi:** → [P4]; status diperbarui saat admin menandai tindak lanjut.
- **US:** P-08.
- **Cakupan Bagian 8 (13 Okt 2026) [Diputuskan untuk rilis ini]:** versi minimal P-07 saja — `StatusBanner` sukses "Terima kasih, jawaban tersimpan" + ringkasan status dan daftar kebutuhan belum terpenuhi yang dipilih pasien + [Kembali ke Beranda]. **Diperbarui 15 Okt 2026:** status tindak lanjut (Diterima/Sedang Ditindaklanjuti/Selesai) dan catatan langkah fasilitas kini ditampilkan, bersumber dari tindak lanjut fasilitas di [A8] (P-08).

---

## Alur Pasien C: Kontrol Akses dan Akun (P18–P23)

Pasien tetap memegang kendali atas data dan siapa yang bisa bertindak atas namanya.

### [P18] Kontrol Akses
- **Tampilan:** dua kartu: [Riwayat Akses] dan [QR Aktif], dengan penanda jika ada QR yang masih berlaku.
- **Navigasi:** Riwayat Akses → [P19]; QR Aktif → [P20].
- **US:** P-05, P-06.

### [P19] Riwayat Akses (Audit Log)
- **Tampilan:** daftar kronologis setiap pembukaan data: tanggal dan jam, nama petugas, fasilitas, dan data yang dilihat. Filter periode (7 hari, 30 hari, semua waktu) dan fasilitas.
- **Aksi Utama:** membaca riwayat. [Cabut Semua QR] → konfirmasi di dialog → mencabut semua ConsentQR aktif dan mencatat kejadian `qr_revoked`. Tombol [Laporkan] belum dibuat hari ini karena belum ada layar admin yang menerima laporan, agar tidak menjanjikan tindak lanjut yang belum tersedia.
- **Aksi Alternatif:** daftar kosong → "Belum ada akses". Riwayat akses dan kunjungan dibatasi 10 item per halaman dengan tombol Sebelumnya/Berikutnya. **[Disetujui, 15 Okt 2026]**
- **Navigasi:** [Cabut Semua QR] membuka konfirmasi langsung di P19.
- **US:** P-06.
- **Riwayat Kunjungan:** pada layar yang sama tersedia daftar kunjungan milik pasien yang bantuannya sudah dicatat, dengan tautan ke ringkasan baca-saja. Ringkasan menampilkan fasilitas, waktu kunjungan dan pencatatan, bantuan yang dicatat, serta status CareProof bila tersedia. Status pencatatan kunjungan tidak menyiratkan bahwa ConsentQR otomatis dicabut. Data dokter, rating, durasi konsultasi, dan status pencabutan QR tidak ditampilkan bila tidak tersedia dari sumber yang berwenang.

### [P20] QR Aktif dan Cabut
- **Tampilan:** daftar QR yang belum kedaluwarsa dengan sisa waktu, fasilitas, dan data yang dibagikan.
- **Tampilkan QR:** tiap QR aktif punya tombol [Tampilkan QR] (pasien dan pendamping). Token hanya disimpan sebagai hash, jadi tombol ini mencabut QR lama dan membuat QR baru untuk fasilitas yang sama dengan isian dan masa berlaku yang sama, lalu langsung menampilkannya (tercatat `qr_revoked` dan `qr_created`). **[Disetujui, 15 Okt 2026]**
- **Aksi Utama:** [Cabut] pada satu QR → pop-up "QR ini tidak akan bisa dipakai lagi." → [Ya, Cabut].
- **Aksi Alternatif:** [Batal] menutup pop-up. Setelah dicabut, QR ditolak saat dipindai dan pencabutan tercatat di [P19].
- **Navigasi:** → [P18].
- **US:** P-05.

### [P21] Pendamping
- **Tampilan:** daftar pendamping tertaut dengan status (Aktif, Menunggu Persetujuan), [Tambah Pendamping] menampilkan kode tautan.
- **Aksi Utama:** pasien memeriksa nama pendamping lalu [Setujui]. Dapat dilakukan lewat pembaca layar atau dengan bantuan.
- **Aksi Alternatif:** [Tolak] menolak permintaan. [Cabut Tautan] pada pendamping aktif → konfirmasi → akses pendamping berakhir langsung dan tercatat.
- **Navigasi:** → [P4].
- **US:** D-01, P-16.

### [P22] Pengaturan Akun dan Privasi
- **Tampilan:** ubah kontak, bahasa dan aksesibilitas (seperti [P2]), pemulihan akses, tautan ke [P23].
- **Aksi Utama:** ubah pengaturan lalu [Simpan].
- **Navigasi:** → [P23] atau → [P4].
- **US:** P-15 (pintu masuk).

### [P23] Hapus Data dan Akun
- **Tampilan:** penjelasan akibat penghapusan: paspor, profil, tautan pendamping, dan catatan kunjungan yang terkait identitas dihapus; semua QR dicabut. Yang tersisa hanya angka agregat anonim fasilitas (tanpa baris per pasien, kelompok kecil disembunyikan), dan hanya bila pasien menyetujui statistik anonim saat daftar. Identitas pasien dipisahkan dari audit log. **[Verifikasi]** Konfirmasi teks ini dengan UU Pelindungan Data Pribadi sebelum dipakai sungguhan.
- **Aksi Utama:** [Hapus Akun] → konfirmasi dengan kode verifikasi → pesan selesai.
- **Aksi Alternatif:** [Batal] → [P22]. Jeda tenggang pembatalan bila tim memutuskannya.
- **Navigasi:** setelah selesai → [P1] sebagai pengguna baru.
- **US:** P-15.

---

## Alur Pendamping (D1–D8)

Pendamping bertindak atas nama pasien hanya setelah pasien menyetujui tautan, dan setiap tindakannya ditandai "oleh pendamping".

### [D1] Splash Screen
- **Tampilan:** sama dengan [P1].
- **Navigasi:** belum masuk → [D2]; sudah masuk → [D4].

### [D2] Daftar atau Masuk sebagai Pendamping
- **Tampilan:** pilihan peran [Pasien] atau [Pendamping], lalu nomor HP atau email dan kode verifikasi. Onboarding aksesibilitas ringkas seperti [P2].
- **Aksi Utama:** daftar atau masuk.
- **Aksi Alternatif atau Error:** kode salah → pesan dan kirim ulang.
- **Navigasi:** akun baru → [D3]; akun lama → [D4].
- **US:** D-01.

### [D3] Tautkan ke Pasien
- **Tampilan:** kolom input kode tautan 8 karakter Crockford Base32 dari pasien (tanpa pemindai kamera). Status "Menunggu persetujuan pasien" setelah dikirim.
- **Aksi Utama:** masukkan kode, [Ajukan Tautan]. Pasien menyetujui di [P21].
- **Aksi Alternatif atau Error:** kode salah, kedaluwarsa, atau sudah terpakai → pesan generik identik ("Kode tidak dapat dipakai. Minta kode baru ke pasien."). **Pendamping belum bisa mengakses data apa pun sampai pasien menyetujui (ditegakkan RLS).**
- **Navigasi:** setelah disetujui → [D4].
- **US:** D-01.

### [D4] Beranda Pendamping
- **Tampilan:** daftar kartu pasien yang didampingi dengan status paspor dan jumlah konfirmasi CareProof menunggu, tombol [Tautkan Pasien]. Bila ada tautan yang berakhir: banner "Satu tautan telah berakhir." (tanpa identitas pasien).
- **Aksi Utama:** pilih kartu pasien untuk mengelola paspor, QR, atau konfirmasi CareProof.
- **Aksi Alternatif:** jika tautan dicabut pasien, kartu pasien langsung hilang dan akses DB seketika 0 baris.
- **Navigasi:** Paspor → [D5]; QR → [D6]; Konfirmasi CareProof → [D8].
- **US:** D-01, D-02, P-16.

### [D5] Kelola Paspor atas Nama Pasien
- **Tampilan:** editor paspor kebutuhan (P5/P6) dengan label "Atas nama [nama panggilan pasien]".
- **Aksi Utama:** ubah nama panggilan, kebutuhan, catatan bebas, lalu simpan.
- **Aksi Alternatif:** penyimpanan paspor mengisi `last_updated_by_companion_id` dan mencatat audit `profile_changed_by_companion` dengan actor_role `companion`. Pasien melihat "Terakhir diubah oleh pendamping [nama]" di [P4]/[P5] dan di riwayat [P19].
- **Navigasi:** → [D4].
- **US:** D-02, P-01, P-02.

### [D6] Kelola ConsentQR atas Nama Pasien
- **Tampilan:** alur [Buat ConsentQR] atas nama pasien (pemilihan faskes, durasi, kategori data) dan penampil QR aktif (P11/P12). Tanpa kartu cetak pada prototipe ini.
- **Aksi Utama:** buat QR atas nama pasien (`consents.created_by_user_id` adalah pendamping, `patient_user_id` pasien) lalu tunjukkan ke petugas.
- **Aksi Alternatif:** QR dapat dicabut oleh pasien maupun pendamping aktif.
- **Navigasi:** → [D4].
- **US:** D-02, P-03, P-14.

### [D7] Dampingi Kunjungan (Tidak Dibuat pada Prototipe)
- **Status:** Dilewati / Tidak dibuat pada prototipe (fitur status antrean / panggilan P-13 berada di roadmap).
- **US:** D-02, P-13.

### [D8] Konfirmasi CareProof atas Nama Pasien
- **Tampilan:** daftar kunjungan pasien tertaut dan formulir tiga opsi pelayanan (terpenuhi/sebagian/belum) berpenanda "Dijawab oleh pendamping". Bila pasien sudah menjawab, formulir menampilkan jawaban pasien dalam mode baca-saja dan tidak bisa diubah pendamping.
- **Aksi Utama:** pilih opsi kepuasan dan kebutuhan yang belum terpenuhi, lalu [Kirim].
- **Aksi Alternatif:** jawaban pendamping dicatat dengan `confirmed_by = 'companion'`. Bila pasien sudah mengonfirmasi duluan, pendamping ditolak (409 "Pasien sudah mengonfirmasi"). Jika pasien mengonfirmasi setelah pendamping, jawaban pasien menimpa jawaban pendamping.
- **Navigasi:** → [D4].
- **US:** D-03.

---

## Alur Petugas (T1–T9)

Dirancang ringan: pindai, lihat satu layar, layani, catat paling banyak tiga ketukan.

### [T1] Splash Screen
- **Tampilan:** sama dengan [P1].
- **Navigasi:** belum masuk → [T2]; sudah masuk → [T3].

### [T2] Login Petugas
- **Tampilan:** nomor HP dan kode verifikasi (OTP). Login email dan kata sandi tidak dibuat pada prototipe. Akun hanya dikenali bila sudah didaftarkan admin fasilitas; pendaftaran dan aktivasi lewat undangan ada di [A2]/[A4]. **[Disetujui, 15 Okt 2026]**
- **Aksi Utama:** masuk.
- **Aksi Alternatif atau Error:** akun nonaktif atau belum diaktivasi → "Hubungi admin fasilitas" dan tidak membuka layar berikutnya.
- **Navigasi:** berhasil → [T3].
- **US:** T-01, A-01.

### [T3] Beranda Petugas
- **Tampilan:** tombol besar [Pindai ConsentQR], daftar kunjungan fasilitas hari ini (jam, rujukan 4 karakter, status teks netral tanpa warna status demi §14: "Belum dicatat", "Menunggu konfirmasi", "Dikonfirmasi"). Daftar tidak menampilkan nama panggilan atau data profil pasien untuk menjaga kerahasiaan sebelum token dipindai. Tombol [Pasien dengan Kartu Cetak] membuka [T4b]. Tombol [Keluar] untuk membersihkan sesi di perangkat bersama.
- **Aksi Utama:** [Pindai ConsentQR].
- **Aksi Alternatif:** [Pasien dengan Kartu Cetak] → [T4b].
- **Navigasi:** pindai → [T4].
- **US:** T-02, P-12.

### [T4] Pindai ConsentQR
- **Tampilan:** pratinjau kamera (diaktifkan manual via [Mulai kamera], tidak otomatis demi privasi dan daya) dan opsi [Masukkan kode manual] selalu tersedia (kode 26 karakter). Di server sistem memeriksa: token valid, belum kedaluwarsa, tidak dicabut, akun petugas aktif, fasilitas sesuai.
- **Aksi Utama:** arahkan kamera ke QR pasien atau ketik kode manual. Setelah lolos, pembukaan tercatat di audit log (siapa, kapan, fasilitas mana).
- **Aksi Alternatif atau Error:**
  - QR kedaluwarsa atau dicabut, fasilitas tidak cocok, atau kode salah → ditolak dan percobaan tercatat. Petugas melihat **satu pesan generik** "QR Tidak Dapat Dipakai — minta pasien membuat ConsentQR baru" (422, K-4) + tombol [Pindai lagi] untuk mengosongkan input dan mengembalikan fokus.
  - Kamera ditolak peramban → status error ikon ban "Kamera Ditolak" + arahan izin peramban / gunakan kode manual.
  - Kamera tidak tersedia atau non-secure context → status error "Kamera Tidak Tersedia".
  - Terlalu banyak percobaan (429) → pesan pembatasan laju.
  - Sesi habis (401) → diarahkan ke login petugas dengan alasan sesi berakhir.
- **Navigasi:** berhasil → [T5].
- **US:** T-01, T-02, T-05, P-06.

### [T4b] Kunjungan dari Kartu Cetak
- **Tampilan:** isian Kode Kartu (8 karakter, huruf besar/kecil dan tanda hubung diabaikan), pilihan kebutuhan dari kartu, bantuan yang diberikan (saran aturan), dan catatan petugas opsional (maks 280 karakter).
- **Aksi Utama:** [Catat Kunjungan]. Server mencari pasien dari kode (fungsi khusus petugas, tidak membuka profil), membuat kunjungan `channel=kartu` tanpa consent, idempoten lewat `client_id`, dan mencatat audit `visit_recorded` tanpa isi catatan. Kode salah → pesan generik; percobaan dibatasi laju.
- **Cakupan:** versi online. Antrean offline (IndexedDB, `POST /api/sync`) menyusul pada Bagian 9.
- **Navigasi:** selesai → [T3]; pasien mengonfirmasi lewat [P16].
- **US:** T-05.

### [/s] URL Publik / Petugas (Tujuan ConsentQR)
- **Tampilan:** URL tertera pada QR fisik/digital (`https://.../s#<token>`).
- **Alur Client:** client membaca `location.hash` dan segera memanggil `history.replaceState(null, "", "/s")` sehingga token terhapus seketika dari address bar dan riwayat peramban.
- **Dengan Sesi Petugas:** token yang diekstrak langsung diproses ke POST `/api/scan` dan membuka [T5] Kebutuhan Pasien.
- **Tanpa Sesi Petugas:** menampilkan kartu informasi publik ("Halaman ini untuk petugas fasilitas. Bila Anda pasien, tunjukkan QR ini kepada petugas.") serta tautan [Masuk sebagai Petugas] dan [Kembali ke Beranda]. Token tidak dikirim ke server.
- **Privasi:** dikirim dengan header `Cache-Control: no-store`.

### [T5] Kebutuhan Pasien
- **Tampilan:** satu layar yang terbaca dalam hitungan detik: nama panggilan, kebutuhan (ikon dan teks besar), keterangan bahwa hanya data yang diizinkan pasien yang tampil. Tidak ada diagnosis.
- **Aksi Utama:** baca, lalu [Lihat Saran].
- **Navigasi:** → [T6].
- **US:** T-02.

### [T6] Saran Tindakan dan Panggilan
- **Tampilan:** saran tindakan dari Smart Accommodation Engine sesuai profil kebutuhan yang dibagikan pada pemindaian ini, berlabel "Saran, bukan instruksi klinis. Keputusan tetap di tangan tenaga kesehatan." Setiap saran memuat ikon, teks besar, serta versi dan sumber aturan. Kebutuhan tanpa aturan ditampilkan terpisah sebagai "belum ada saran". Teks panduan: "Panggil pasien secara langsung dan visual sesuai saran di atas."
- **Panggil Pasien:** tombol [Panggil Pasien] dengan isian ruangan opsional menampilkan giliran besar di HP pasien ([P14]).
- **KomunikaCare:** panel [T7] ditampilkan di layar ini dan di [T8].
- **Aksi Utama:** baca saran, lalu [Lanjut: Catat Bantuan].
- **Navigasi:** → [T8].
- **US:** T-03.

### [T7] Layani Pasien (KomunikaCare)
- **Tampilan:** panel di [T6] dan [T8]: riwayat percakapan dengan pasien, kalimat cepat petugas, kolom tulis (maks 300 karakter) dan [Kirim ke Pasien].
- **Sinkron dua perangkat [Disetujui, 15 Okt 2026]:** KomunikaCare di HP pasien ([P15], dibuka dengan `?kunjungan=`) dan panel petugas saling terhubung. Gambar papan dan teks "Ucapkan" pasien muncul di panel petugas; tulisan petugas tampil besar di HP pasien. Polling tiap 2 detik saat tab terlihat.
- **Privasi:** hanya teks atau pilihan gambar yang dikirim, tidak pernah suara. Pesan disimpan sementara di server, hanya terbaca pasien pemilik dan petugas fasilitas yang sama, tidak masuk audit log, dihapus saat petugas menyelesaikan pelayanan, dan tidak dibaca lagi setelah 12 jam. Hasil pengenalan suara ([P15.3]) tetap hanya di perangkat.
- **Navigasi:** tetap di layar petugas; pelayanan selesai menutup percakapan.

### [T8] Catat Bantuan (≤ 3 Ketukan)
- **Tampilan:** daftar saran tindakan dari [T6] disajikan melalui `ChoiceGroup` dengan **semua opsi tercentang di awal** [Usulan] dan instruksi "Hapus centang bantuan yang tidak diberikan." Catatan petugas bersifat opsional via varian textarea `TextField` (maks 280 karakter, dengan penghitung karakter dan teks bantuan "Jangan menulis diagnosis atau data sensitif.").
- **Aksi Utama:** paling banyak tiga ketukan (misal: 1 ketuk hapus centang bantuan yang tidak diberikan + 1 ketuk [Simpan] = 2 ketukan, ≤ 3). Tombol [Simpan] memiliki status `aria-busy` dan cegah double-click.
- **Catatan Implementasi:** draft lokal dan antrean offline dilewati hari ini (dijadwalkan pada Bagian 9). Bila gagal jaringan, isian formulir tetap dipertahankan di memori dengan pesan "Tidak ada koneksi. Coba simpan lagi."
- **Navigasi:** berhasil disimpan → [T9]. Jika kunjungan sudah dicatat sebelumnya (409 Conflict), UI menawarkan langsung lanjut ke [T9].
- **US:** T-04.

### [T9] Kirim Permintaan Konfirmasi
- **Tampilan:** ringkasan bantuan yang dicatat (tanpa menyertakan catatan petugas ke audit log) dengan dua opsi konfirmasi:
  1. **[Kirim ke Pasien] / [Selesai dan Kembali ke Beranda]:** kunjungan beralih ke status "Menunggu konfirmasi pasien". Tanpa push notification; pasien akan melihat permintaan konfirmasi saat membuka aplikasinya ([P16]). Petugas kembali ke [T3] dan data pasien segera dibersihkan dari memori peramban.
  2. **[Konfirmasi di Tempat]:** membuka `CareProofScale` langsung di perangkat petugas dengan penanda jelas "Jawaban ini ditandai 'di tempat'". Jika pasien memilih "Sebagian" atau "Belum", pasien memilih kebutuhan yang belum terpenuhi dari daftar kebutuhan yang dibagikan pada kunjungan ini, lalu `confirmVisit(on_site)` disimpan dan kembali ke [T3] dengan status "Dikonfirmasi: Sebagian (di tempat)" atau "Dikonfirmasi: Belum (di tempat)".
- **Navigasi:** → [T3].
- **US:** T-04, P-07, D-03.

---

## Alur Admin Fasilitas (A1–A8)

Mengelola akun petugas dan menindaklanjuti kebutuhan yang belum terpenuhi, tanpa melihat identitas pasien pada data agregat.

### [A1] Splash Screen
- **Tampilan:** sama dengan [P1].
- **Navigasi:** belum masuk → [A2]; sudah masuk → [A3].

### [A2] Login dan Aktivasi Admin
- **Tampilan:** login akun admin lewat halaman masuk petugas (nomor HP + kode verifikasi, sesuai [T2]). Fasilitas dan akun admin didaftarkan oleh admin sistem melalui onboarding.
- **Aksi Utama:** masuk. **Aktivasi petugas [Disetujui, 15 Okt 2026]:** petugas yang didaftarkan admin ([A5]) berstatus "Menunggu aktivasi" dan menjadi aktif otomatis saat masuk pertama kali dengan nomor HP yang didaftarkan (tanpa tautan atau SMS pada prototipe). Akun nonaktif tidak pernah diaktifkan oleh login.
- **Aksi Alternatif atau Error:** nomor tidak terdaftar atau akun nonaktif → satu pesan generik "Tidak dapat masuk. Hubungi admin fasilitas." Petugas yang dinonaktifkan saat sedang masuk ditolak di setiap halaman dan API berikutnya ("Akses akun ini ditutup").
- **Navigasi:** berhasil → [A3].
- **US:** A-01.

### [A3] Beranda Admin
- **Tampilan:** ringkasan bulan berjalan: jumlah kunjungan ber-AKSESPASS, Accommodation Fulfillment Rate, jumlah kebutuhan belum terpenuhi.
- **Navigasi:** Akun Petugas → [A4]; Dashboard → [A6]; Belum Terpenuhi → [A7].
- **US:** A-02.
- **Cakupan (diperbarui 15 Okt 2026):** ringkasan bulan berjalan (3 angka di atas, dari `get_facility_dashboard`; AFR tertulis "Disembunyikan" bila membuka kelompok kecil), menu Akun Petugas [A4], Dashboard [A6], Belum Terpenuhi [A7], Tindak Lanjut [A8], dan [Keluar].

### [A4] Kelola Akun Petugas
- **Tampilan:** daftar petugas fasilitas ini (semua dibuat oleh admin; petugas tidak mendaftar mandiri): nama, peran, unit, nomor HP disamarkan, status "Menunggu aktivasi", "Aktif", atau "Nonaktif" (ikon + teks). [Tambah Petugas].
- **Aksi Utama:** [Tambah Petugas], [Ubah] nama/unit, atau [Nonaktifkan] (misalnya resign atau pindah) dengan konfirmasi. Petugas nonaktif dapat [Aktifkan Kembali] (kembali "Menunggu aktivasi" bila belum pernah masuk). Setiap perubahan tercatat di audit (tanpa data pasien).
- **Aksi Alternatif:** setelah dinonaktifkan, akses ConsentQR petugas tertutup langsung; upaya pindai berikutnya ditolak dan tercatat.
- **Navigasi:** tambah → [A5].
- **US:** A-01.

### [A5] Tambah atau Ubah Petugas
- **Tampilan:** formulir nama, peran (tetap "Petugas"), unit, nomor HP (kontak sekaligus identitas login). Saat [Ubah], nomor ditampilkan disamarkan dan tidak dapat diubah (ganti nomor = nonaktifkan lalu daftarkan ulang).
- **Aksi Utama:** [Daftarkan Petugas]; status awal "Menunggu aktivasi" (aktif saat petugas masuk pertama kali, lihat [A2]). Nomor yang sudah dipakai ditolak dengan pesan generik.
- **Simpan Draft:** isian yang belum dikirim tersimpan otomatis di perangkat admin ini saja (penyimpanan peramban) dan dihapus saat dikirim atau [Batal].
- **Aksi Alternatif:** [Batal] → [A4].
- **Navigasi:** → [A4] dengan status "Menunggu aktivasi".
- **US:** A-01.

### [A6] Dashboard Kesenjangan Aksesibilitas
- **Tampilan:** Accommodation Fulfillment Rate, tren bulanan, rincian per kategori kebutuhan. Respons "oleh pendamping" atau "di tempat" ditandai terpisah.
- **Aksi Utama:** filter periode atau kategori, baca metrik. Semua data agregat dan anonim.
- **Aksi Alternatif:** data belum cukup → "Belum ada data kunjungan".
- **Navigasi:** → [A7] untuk rincian kebutuhan belum terpenuhi.
- **US:** A-02.
- **Privasi sel kecil (diperbarui 15 Okt 2026):** AFR tertulis "Disembunyikan" bila kelompok "terpenuhi" atau komplemennya berasal dari kurang dari 5 pasien berbeda, karena AFR akan membuka sel yang disembunyikan. Pada rincian status, bila tepat satu sel disembunyikan, sel terlihat terkecil ikut disembunyikan agar tidak dapat dihitung dari total. Judul layar dipersingkat menjadi "Dashboard Aksesibilitas".
- **Cakupan Bagian 8 (13 Okt 2026) [Diputuskan untuk rilis ini]:** filter periode terbatas pada bulan berjalan dan 2 bulan sebelumnya (tanpa filter kategori terpisah — rincian kategori sudah tampil sebagai satu tabel). AFR besar (angka + teks), tren bulanan sebagai tabel ber-caption dengan batang CSS (`aria-hidden`, angka selalu tertulis), rincian status, rincian penjawab (pasien/pendamping/di tempat, dengan keterangan tetap "Jawaban pendamping dan di tempat ditandai terpisah"), dan rincian per kategori. Sel di bawah ambang K-10 tertulis "Disembunyikan (kurang dari 5 pasien)"; periode tanpa kunjungan tertulis "Belum ada data kunjungan". Tombol [Lihat Kebutuhan Belum Terpenuhi] → [A7] (ditambahkan 15 Okt 2026).

### [A7] Kebutuhan Belum Terpenuhi
- **Tampilan:** enam kategori kebutuhan, terurut dari yang paling sering belum terpenuhi, dengan jumlah kunjungan dan tren dibanding bulan lalu (naik/turun/sama; "belum tersedia" bila salah satu bulan disembunyikan). Filter periode: bulan berjalan dan 2 bulan sebelumnya. Agregat anonim; kelompok kurang dari 5 pasien disembunyikan (memakai fungsi dashboard yang sama).
- **Aksi Utama:** pilih kategori, lalu [Buat Tindak Lanjut]; bila sudah ada tindak lanjut berjalan, tombol berubah menjadi [Lihat Tindak Lanjut].
- **Navigasi:** → [A8].
- **US:** A-03.

### [A8] Tindak Lanjut
- **Tampilan:** daftar tindak lanjut fasilitas per kategori kebutuhan (tabel `facility_actions`, terpisah dari `follow_ups` per pasien), dengan status (Baru, Sedang Dikerjakan, Selesai), catatan langkah (maks 280 karakter), tanggal dibuat/diperbarui/selesai. Satu tindak lanjut berjalan per kategori.
- **Aksi Utama:** tentukan langkah, ubah status, [Tandai Selesai]. **Ringkasan di [P17] [Disetujui, 15 Okt 2026]:** pasien yang melaporkan kebutuhan belum terpenuhi di kategori dan fasilitas yang sama melihat status tindak lanjut fasilitas dan catatan langkah (tanpa data pribadi lain). Tindak lanjut yang selesai sebelum laporan pasien dibuat tidak menutup laporan itu. Catatan dapat dibaca pasien terkait, sehingga admin diminta tidak menulis data pribadi.
- **Aksi Alternatif:** [Kembali] → [A7].
- **Navigasi:** → [A3].
- **US:** A-04, P-08.

---

## Alur Kurator Aturan (K1–K6)

Kurator adalah perwakilan komunitas disabilitas dan tenaga kesehatan yang menyusun serta mengesahkan aturan panduan tindakan; alur ini membuat saran ke petugas dapat dipertanggungjawabkan.

### [K1] Splash Screen
- **Tampilan:** sama dengan [P1].
- **Navigasi:** belum masuk → [K2]; sudah masuk → [K3].

### [K2] Login Kurator
- **Tampilan:** login akun kurator yang diundang admin sistem.
- **Aksi Alternatif atau Error:** akun tanpa hak kurator ditolak dengan pesan jelas.
- **Navigasi:** berhasil → [K3].
- **US:** K-01.

### [K3] Pustaka Aturan
- **Tampilan:** aturan dikelompokkan menurut profil kebutuhan (Tuli, autistik, low vision atau tunanetra, mobilitas). Tiap aturan menampilkan status (Draft, Dalam Tinjauan, Terbit) dan nomor versi.
- **Aksi Utama:** buka aturan, atau [Aturan Baru].
- **Navigasi:** baru atau ubah → [K4]; Dalam Tinjauan → [K5]; riwayat → [K6].
- **US:** K-01.

### [K4] Editor Aturan
- **Tampilan:** formulir: profil kebutuhan pemicu, saran tindakan untuk petugas (teks pendek dan ikon), sumber atau alasan, catatan perubahan.
- **Aksi Utama:** susun aturan lalu [Ajukan Tinjauan].
- **Simpan Draft:** perubahan tersimpan otomatis sebagai draft. Draft tidak memengaruhi saran yang dilihat petugas sampai disetujui.
- **Aksi Alternatif:** [Buang Draft] meminta konfirmasi.
- **Navigasi:** setelah diajukan → [K5].
- **US:** K-01.

### [K5] Tinjau dan Setujui
- **Tampilan:** isi aturan, komentar komunitas dan tenaga kesehatan, status persetujuan tiap peninjau.
- **Aksi Utama:** setelah peninjau menyetujui, [Setujui dan Terbitkan] dengan nomor versi, tanggal, dan pengesah. Aturan langsung dipakai Smart Accommodation Engine.
- **Aksi Alternatif:** [Minta Revisi] → [K4] dengan komentar. Versi lama tetap dipakai sampai versi baru terbit.
- **Navigasi:** terbit → [K3]; revisi → [K4].
- **US:** K-01.

### [K6] Riwayat Perubahan
- **Tampilan:** daftar versi dengan tanggal, pengesah, ringkasan perubahan; perbandingan antarversi.
- **Aksi Utama:** memeriksa jejak versi.
- **Aksi Alternatif:** [Pulihkan Versi Ini] setelah konfirmasi (dicatat sebagai versi baru).
- **Navigasi:** → [K3].
- **US:** K-02.

> Di prototipe, `architecture.md` §2 dan §16 menetapkan K3 baca-saja dengan aturan bawaan; K4–K6 masuk roadmap.

---

## Keputusan

**Sudah diputuskan:**
1. **QR pada kartu cetak:** ditunda, tidak dipakai untuk saat ini.
2. **Kunjungan jalur kartu cetak:** tetap membuat catatan kunjungan minimal (kode atau nama panggilan dan kebutuhan dari kartu) agar CareProof menempel dan masuk dashboard ([T4b]).
3. **Login pasien tanpa KTP:** nomor HP dengan kode verifikasi (OTP) ([P3]).
4. **Hapus akun dan data anonim (arah):** hapus data pribadi, simpan hanya agregat anonim dengan ambang kelompok kecil, persetujuan statistik terpisah dan opsional, identitas pasien dipisahkan dari audit log. **[Verifikasi]** UU PDP sebelum dipakai sungguhan ([P23]).

**Masih terbuka:**

5. **Cakupan prototipe:** layar mana yang benar-benar dibangun. Usulan: semua layar story Must, ditambah D-01 sampai D-03 dan A-03 bila waktu cukup; Pre-Arrival Brief ([P10]), Smart Queue Alert ([P14]), dan frasa BISINDO ([P15.4]) sebagai roadmap.
6. **Dukungan peramban:** teks langsung (speech-to-text) dan notifikasi bergetar berbeda antarperangkat, terutama iOS. Uji di perangkat demo dan siapkan alternatif ketik.
7. **Pendaftaran fasilitas dan kurator:** untuk prototipe cukup admin sistem secara manual; tulis sebagai proses onboarding di presentasi.
