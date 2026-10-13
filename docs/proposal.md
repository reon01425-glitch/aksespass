# AKSESPASS — Proposal (versi kanonik)

**Paspor Aksesibilitas Layanan Kesehatan Digital untuk Penyandang Disabilitas**
Tagline: "Setiap Pasien Berbeda, Setiap Pasien Berhak Dipahami"
Konteks: prototipe Hackathon JOINTS UGM 2026.

> **Sumber:** PDF hal. 5–11 (versi 9 fitur), dikonversi dari `docs/archive/aksespass-hal01-19.pdf`. Versi 11 fitur (hal. 1–4) dan 6 fitur (hal. 21–23) diarsipkan. Penomoran fitur di bawah mengikuti versi ini.
>
> **Sudah digantikan oleh dokumen lain** (jangan diikuti dari proposal ini):
> - Kartu cetak "ber-QR" → kartu **tanpa QR akses** (`architecture.md` §1, §16; `docs/user-flows.md` keputusan 1).
> - Backend Python (FastAPI) dan ConsentQR berbasis JWT → monolit Next.js [Usulan] dan token acak tak bermakna yang disimpan sebagai hash [Diputuskan] (`architecture.md` §3).
> - User flow lama (PDF hal. 12–13) → `docs/user-flows.md`.

## Deskripsi Ide

AKSESPASS adalah platform paspor aksesibilitas kesehatan digital yang membantu penyandang disabilitas menyampaikan kebutuhan komunikasi dan aksesibilitasnya kepada tenaga kesehatan di Puskesmas, klinik, dan rumah sakit, tanpa harus mengungkapkan diagnosis. Platform ini menghubungkan kebutuhan pasien, panduan tindakan petugas, dan verifikasi pelayanan ke dalam satu sistem layanan inklusif. Tahap awal difokuskan pada pasien Tuli, autistik, low vision atau tunanetra, dan hambatan mobilitas.

Berbeda dengan paspor kesehatan konvensional (kartu kertas maupun aplikasi di luar negeri) yang umumnya berhenti pada menyimpan dan menampilkan informasi, AKSESPASS bertindak sebagai **"penerjemah kebutuhan menjadi tindakan"**: mengubah kebutuhan pasien menjadi panduan tindakan bagi petugas, meminta pasien mengonfirmasi apakah bantuan benar-benar diterima, lalu merangkum hasilnya menjadi data perbaikan layanan bagi fasilitas. Berbeda pula dengan aplikasi kamus bahasa isyarat untuk komunikasi umum, AKSESPASS dirancang khusus untuk alur layanan kesehatan.

Latar masalah: SIMPD memperkirakan sekitar 22,3 juta penyandang disabilitas di Indonesia. Satu studi yang dikutip dalam pengabdian masyarakat ITS menyebut 64,7% dari 405 responden disabilitas rungu menilai akses layanan kesehatan masih sulit, dan hambatan komunikasi berkontribusi pada kesalahpahaman hingga kesalahan diagnosis. Diskusi Ombudsman Jawa Barat (Agustus 2026) menyoroti agar penyandang disabilitas tidak harus berulang kali menjelaskan kebutuhannya, serta kendala dukungan bahasa isyarat di Puskesmas dan aksesibilitas Mobile JKN bagi pengguna pembaca layar. Akibatnya pasien merasa tidak dipahami, petugas tidak punya panduan yang jelas, dan fasilitas tidak punya data tentang kebutuhan yang belum terpenuhi. **[Verifikasi]** Angka-angka ini berasal dari hasil pencarian dan belum dicek ke dokumen asli; cantumkan sumbernya.

Pendekatan: Human-Centered Design yang melibatkan komunitas disabilitas dan tenaga kesehatan.

## Fitur Utama

1. **MyCare Passport** — "Jelaskan Kebutuhan Sekali, Dipahami di Mana Saja". Pasien mengisi kebutuhan komunikasi dan aksesibilitas lewat pilihan sederhana (BISINDO, instruksi tertulis, bantuan mobilitas, pendampingan, lingkungan lebih tenang). Tidak ada isian diagnosis. Formulir aksesibel: pembaca layar, kontras tinggi, huruf besar, bahasa sederhana.
   *Dampak:* pasien tidak mengulang penjelasan; privasi terjaga karena hanya kebutuhan layanan yang tercatat; pasien lebih mandiri.
2. **ConsentQR** — "Akses Cepat, Aman, dan Sepenuhnya di Tangan Pasien". Pasien membagikan kebutuhan lewat QR sementara yang dipindai petugas berwenang. Cakupan data dibatasi pada kebutuhan layanan, token kedaluwarsa otomatis, dapat dicabut kapan saja, setiap pembukaan tercatat di audit log. Tanpa KTP atau rekam medis.
   *Dampak:* petugas mendapat informasi dalam hitungan detik; data minimal; pasien memegang kendali.
3. **Smart Accommodation Engine** — "Dari Kebutuhan Pasien Menjadi Tindakan Petugas". Mesin berbasis aturan (rule-based) menerjemahkan profil kebutuhan menjadi panduan tindakan, misalnya:
   - Tuli: antrean visual, komunikasi tertulis, petugas menghadap pasien saat berbicara.
   - Autistik: penjelasan bertahap, lingkungan lebih tenang, waktu respons cukup.
   - Low vision atau tunanetra: panduan verbal, huruf besar, pendampingan di fasilitas.
   - Mobilitas terbatas: jalur akses, ruang periksa terjangkau, bantuan transfer.

   Panduan disajikan sebagai **saran, bukan instruksi klinis**; keputusan tetap di tangan tenaga kesehatan.
   *Dampak:* petugas tahu apa yang disiapkan tanpa pelatihan panjang; layanan konsisten antarpetugas/shift; risiko salah paham berkurang.
4. **KomunikaCare** — "Komunikasi Dua Arah yang Setara". Papan komunikasi bergambar, teks besar, dan teks-ke-suara untuk pasien. Arah sebaliknya: teks langsung dari ucapan petugas (speech-to-text) dengan peringatan bahwa ini alat bantu, bukan pengganti juru bahasa isyarat. Dilengkapi pustaka frasa medis BISINDO berupa klip video pendek yang direkam bersama penutur Tuli (bukan terjemahan otomatis).
   *Dampak:* komunikasi tanpa bergantung pada pendamping; menghindari salah makna terjemahan otomatis; pemahaman instruksi medis meningkat.
5. **CareProof** — "Bantuan Dianggap Selesai Setelah Pasien Mengonfirmasi". Petugas mencatat bantuan, lalu pasien (atau pendampingnya) mengonfirmasi lewat skala ikon apakah kebutuhannya terpenuhi. Jika belum, kebutuhan tercatat sebagai tindak lanjut. Status "belum dikonfirmasi" **tidak** dihitung berhasil.
   *Dampak:* layanan inklusif terukur; pasien punya suara langsung; kebutuhan terlewat tidak hilang.
6. **Pre-Arrival Brief dan Smart Queue Alert** — "Siap Sebelum Pasien Tiba, Dipanggil Sesuai Kebutuhan". Pasien dapat mengirim kebutuhan sebelum datang; petugas pendaftaran melihat ringkasan satu layar. Setelah terdaftar, Smart Queue Alert memanggil pasien lewat notifikasi visual dan getar (opsional layar LED di ruang tunggu).
   *Dampak:* fasilitas siap sebelum pasien tiba; pasien Tuli dan low vision tahu gilirannya tanpa panggilan suara; beban petugas berkurang.
7. **Accessibility Gap Dashboard** — "Data Pasien untuk Perbaikan Layanan Nyata". Data CareProof yang dianonimkan diolah menjadi dashboard bagi Puskesmas dan dinas kesehatan: Accommodation Fulfillment Rate (persentase kunjungan yang kebutuhannya terpenuhi), kebutuhan yang paling sering tidak terpenuhi, dan tren per bulan.
   *Dampak:* pengelolaan berbasis data pengalaman pasien; dasar bukti bagi anggaran dan kebijakan; akuntabilitas fasilitas.
8. **Community-Validated Accommodation Library** — "Aturan yang Disusun Bersama Pemilik Pengalaman". Setiap aturan panduan disusun bersama komunitas disabilitas dan tenaga kesehatan, memiliki versi, tanggal, dan pengesah, serta dapat diperbarui.
   *Dampak:* panduan dapat dipertanggungjawabkan; partisipasi bermakna komunitas; profil kebutuhan baru tanpa mengubah kode.
9. **Mode Offline dan Dukungan Pendamping** — "Tetap Bisa Dipakai Tanpa Sinyal dan Tanpa Smartphone". Kartu paspor cetak dengan ringkasan kebutuhan (tanpa QR, lihat catatan di atas), mode offline (PWA), dan akses pendamping resmi.
   *Dampak:* berfungsi di area koneksi terbatas; menjangkau literasi digital rendah; sesuai kondisi Puskesmas.

## Alur Utama

Pasien Mengisi Kebutuhan → Pre-Arrival Brief / ConsentQR → Petugas Menerima Rekomendasi → Pelayanan Disesuaikan → Pasien Mengonfirmasi (CareProof) → Data Masuk Dashboard Fasilitas

Rincian per layar: `docs/user-flows.md`.

## Use Case (ringkasan diagram PDF hal. 12)

- **Pasien** dan **Pendamping Resmi:** mengelola MyCare Passport, membuat dan mencabut ConsentQR, menggunakan KomunikaCare, menerima Smart Queue Alert, mengonfirmasi CareProof, menggunakan mode offline dan kartu.
- **Petugas:** login dan verifikasi petugas, memindai QR dan melihat kebutuhan, melihat saran akomodasi, memicu panggilan antrean, mencatat bantuan dan tindak lanjut, menggunakan KomunikaCare.

## Rencana Validasi dan Metrik Dampak

Prototipe diuji dengan pengguna dari tiap profil (Tuli, autistik, low vision, mobilitas) dan petugas Puskesmas. Metrik pilot yang diusulkan (**target, bukan hasil**): Accommodation Fulfillment Rate, waktu petugas memahami kebutuhan pasien, skor kegunaan (SUS) pasien dan petugas, serta persentase kebutuhan belum terpenuhi yang berhasil ditindaklanjuti.

## Tech Stack di Proposal (sebagian sudah digantikan)

| Bagian | Isi proposal | Status sekarang |
| :--- | :--- | :--- |
| Aplikasi pasien dan petugas | PWA (React/Next.js), offline, target WCAG 2.2 AA | Tetap (`architecture.md`) |
| Backend dan rule engine | Python (FastAPI), aturan berversi JSON/YAML | Digantikan monolit Next.js [Usulan A1] |
| Database | PostgreSQL/MySQL | PostgreSQL [Usulan A2] |
| ConsentQR | JWT berkedaluwarsa | Digantikan token acak + hash [Diputuskan A4] |
| Teks langsung | Web Speech API, dengan peringatan akurasi istilah medis | Belum dirancang di arsitektur |
| Notifikasi dan getar | Web Push, Vibration API; opsional ESP32 + LED | Belum dirancang; P-13 berstatus Could |
| Dashboard | Chart.js/Recharts, data agregat anonim | Belum dirancang |
| Target deploy | PWA pasien (Android/iOS), web dashboard petugas dan admin | Tetap |

## Catatan dari Proposal

- **[Verifikasi]** Dukungan Web Speech API untuk bahasa Indonesia dan Web Push berbeda antarperangkat dan browser (misalnya iOS). Uji di perangkat demo; siapkan alternatif ketik manual.
- Kalau waktu mepet, fitur 6 (bagian Smart Queue Alert dengan ESP32), fitur 8, dan pustaka frasa BISINDO bisa diturunkan ke roadmap. **Jangan dikorbankan: fitur 1, 2, 3, 5, dan 7.**
