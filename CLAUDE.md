# CLAUDE.md — AKSESPASS

## Instruksi awal
Sebelum mengubah kode:
1. Baca `AGENTS.md`.
2. Baca bagian relevan dari `architecture.md` dan `design.md`.
3. Periksa implementasi, skrip, dan pola yang benar-benar ada di repository.
4. Tentukan apakah tugas menyentuh data pasien, persetujuan, autentikasi, audit log, sinkronisasi offline, atau aksesibilitas.

`AGENTS.md` adalah panduan lintas agent. Instruksi ini melengkapi panduan tersebut untuk workflow Claude Code dan tidak menggantikan kedua spesifikasi.

## Workflow implementasi
- Mulai dengan memahami konteks dan batasan tugas sebelum mengedit.
- Buat perubahan sekecil mungkin yang menyelesaikan kebutuhan.
- Ikuti pola dan dependensi repository yang ada.
- Jangan menjalankan refactor luas atau menambah dependensi tanpa alasan yang jelas.
- Jangan menganggap usulan dalam `architecture.md` sebagai keputusan final.
- Jika dokumen saling bertentangan atau keputusan berdampak pada privasi, keamanan, atau alur produk belum ditetapkan, jelaskan masalahnya dan minta arahan.
- Jangan mengklaim pengujian, pemeriksaan, atau implementasi telah berhasil tanpa bukti.

## Area yang membutuhkan perhatian khusus
### ConsentQR dan data pasien
- QR tidak boleh berisi data pasien.
- Validasi token, consent, masa berlaku, pencabutan, peran, dan fasilitas dilakukan di server.
- Semua pembacaan profil oleh pihak lain harus melalui jalur layanan consent yang mencatat audit.
- Jangan membocorkan keberadaan token melalui pesan kesalahan.
- Jangan menambahkan diagnosis ke database server, QR, log, analitik, URL, atau cache.

### Audit dan privasi
- Audit log mencatat siapa, apa jenis peristiwanya, kapan, dan fasilitas yang terkait sesuai rancangan, tanpa menyalin isi data pasien.
- Pertahankan pola append-only dan jangan menambahkan jalur tulis yang melewati modul audit.
- Hindari data sensitif dalam log aplikasi, pelacak galat, dan analitik.

### Offline
- Pemindaian ConsentQR membutuhkan server.
- Catatan kunjungan offline harus menggunakan antrean lokal dan sinkronisasi idempoten sesuai arsitektur.
- Jangan menganggap penyimpanan browser sebagai cadangan permanen.
- Status sinkronisasi harus mengikuti pola status di `design.md`.

### UI dan aksesibilitas
- Ikuti `design.md` untuk token warna, Atkinson Hyperlegible Next, skala tipografi, target sentuh 48 × 48 px, input minimal 16 px, focus ring, reduced motion, viewport 320 px, dan pembesaran teks 200%.
- Status selalu menggunakan ikon + teks + warna.
- Gunakan komponen bersama untuk pola berulang, terutama banner status.
- Jangan menyatakan WCAG 2.2 AA terverifikasi tanpa pengujian yang mendukung klaim tersebut.

## Pemeriksaan
Jalankan skrip yang tersedia di repository untuk lint, typecheck, test, dan build sesuai relevansi. Temukan perintah dari `package.json` atau dokumentasi proyek; jangan mengarang nama skrip. Jika tidak dapat menjalankan suatu pemeriksaan, sebutkan secara eksplisit.

## Saat menyelesaikan tugas
Laporkan:
- Perubahan utama.
- File yang disentuh.
- Pemeriksaan yang benar-benar dijalankan.
- Hasil dan masalah yang tersisa.
- Asumsi atau keputusan yang masih perlu persetujuan.
