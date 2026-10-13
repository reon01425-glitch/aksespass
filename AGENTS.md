# AGENTS.md — AKSESPASS

## Tujuan file
Dokumen ini adalah panduan kerja lintas coding agent untuk repository AKSESPASS. Gunakan bersama `design.md` dan `architecture.md`. Dokumen ini tidak menggantikan spesifikasi produk atau keputusan arsitektur.

## Sumber acuan dan urutan keputusan
1. `architecture.md`: batasan produk, alur data, aktor, izin akses, keamanan, dan status keputusan.
2. `design.md`: design system, token warna, tipografi, komponen, dan persyaratan aksesibilitas.
3. Instruksi ini: cara kerja dan standar implementasi AI.
4. Implementasi yang ada: periksa sebelum mengubah; jangan menganggap kode yang ada otomatis sesuai dokumen.

Jika ada konflik atau persyaratan belum jelas, jangan diam-diam memilih salah satu. Jelaskan konfliknya dan minta keputusan jika berdampak pada produk, privasi, keamanan, atau arsitektur.

## Status keputusan
- `[Diputuskan]`: pertahankan sebagai batasan.
- `[Usulan]`: jangan dianggap final tanpa persetujuan.
- `[Verifikasi]`: jangan membuat klaim keberhasilan sebelum diuji.
- Jangan mengubah status keputusan hanya berdasarkan preferensi implementasi.

## Konteks produk
AKSESPASS adalah PWA seluler untuk membantu pasien menyampaikan kebutuhan layanan kepada petugas tanpa harus mengulang cerita, dengan kontrol persetujuan berada pada pasien.

Batasan inti:
- Data kebutuhan dibaca saat ConsentQR dipindai; data pasien tidak ditanamkan ke QR.
- Diagnosis tidak disimpan di server dan tidak dimasukkan ke QR. Fitur diagnosis lokal terenkripsi masih berada di roadmap.
- Pembacaan data oleh pihak lain harus dicatat dalam audit log.
- Kartu cetak berisi ringkasan kebutuhan tanpa QR akses dan harus dapat dibaca tanpa internet.
- Ikuti pembagian peran dan batas akses di `architecture.md`.

## Teknologi dan struktur
Spesifikasi saat ini menyebut Next.js App Router, TypeScript, Tailwind CSS, dan Lucide React. Database dan hosting masih berstatus usulan di `architecture.md`; jangan memilih penyedia sebagai keputusan final tanpa persetujuan.

Ikuti struktur repository yang benar-benar ada. Struktur `src/app`, `src/components`, `src/lib`, `src/db`, dan `src/sw` dalam `architecture.md` adalah usulan, bukan alasan untuk memindahkan kode tanpa kebutuhan.

## Aturan arsitektur dan data
- Semua pembacaan data pasien oleh pihak lain harus melalui satu jalur layanan di `lib/consent` atau padanan yang telah disetujui, dengan pemeriksaan izin dan pencatatan audit.
- Jangan membuat kueri langsung dari halaman petugas ke tabel profil pasien.
- Terapkan pemeriksaan izin di server; penyaringan data sensitif tidak boleh hanya mengandalkan UI atau klien.
- ConsentQR berisi token acak yang tidak bermakna, bukan data pasien. Simpan hash token, bukan token asli.
- Periksa sesi, peran, fasilitas, persetujuan, masa berlaku, dan status pencabutan sebelum data dikembalikan.
- Respons kegagalan pemindaian tidak boleh membocorkan apakah token tertentu pernah ada.
- Audit log harus mencatat peristiwa akses tanpa menyalin isi data pasien. Pertahankan sifat append-only sesuai rancangan.
- Jangan memasukkan diagnosis atau data sensitif ke log, analitik, pelacak galat, URL, atau cache.
- Terapkan rate limit pada percobaan pemindaian sesuai rancangan.
- Catatan bebas petugas harus mengikuti batas panjang dan peringatan yang ditentukan spesifikasi.
- Jangan memperluas hak admin fasilitas melebihi data agregat yang diizinkan.

## Offline dan sinkronisasi
- ConsentQR tidak dapat divalidasi secara offline karena memerlukan pemeriksaan server dan data terkini.
- Pencatatan kunjungan dapat diantrekan secara lokal sesuai rancangan, lalu disinkronkan saat online.
- Gunakan ID klien yang stabil untuk deduplikasi sinkronisasi dan pastikan operasi sinkron idempoten.
- Batasi data lokal ke yang diperlukan, lindungi aksesnya, dan hapus sesuai kebijakan setelah sinkronisasi.
- Jangan mengklaim ketahanan penyimpanan offline iOS Safari sebelum pengujian perangkat nyata.

## Design system dan aksesibilitas
`design.md` adalah acuan visual. Pertahankan ketentuan berikut:
- Font Atkinson Hyperlegible Next dimuat secara lokal sesuai rancangan.
- Ukuran teks menggunakan `rem`; uji pembesaran teks hingga 200% dan viewport selebar 320 px tanpa horizontal scroll.
- Target sentuh minimum 48 × 48 px sesuai spesifikasi proyek.
- Input form minimal 16 px.
- Fokus keyboard harus terlihat dan `prefers-reduced-motion` harus dihormati.
- Status tidak boleh disampaikan hanya dengan warna. Gunakan ikon, teks, dan warna melalui pola komponen status yang konsisten.
- Gunakan token warna dari `design.md`; jangan memilih warna berdasarkan perkiraan kontras.
- Pertahankan font weight dan skala tipografi sesuai `design.md`.
- Jangan menyatakan WCAG 2.2 AA telah terpenuhi hanya karena token atau komponen sudah dibuat. Lakukan pengujian otomatis dan manual yang relevan.

## Cara bekerja
1. Baca `architecture.md`, `design.md`, dan kode terkait sebelum melakukan perubahan.
2. Tentukan scope dan dampak perubahan, terutama terhadap izin, data pribadi, offline, dan aksesibilitas.
3. Utamakan perubahan kecil yang sesuai pola repository saat ini.
4. Gunakan kembali komponen, utilitas, dan dependensi yang sudah tersedia.
5. Jangan menambah dependensi atau melakukan refactor luas tanpa alasan dan persetujuan yang jelas.
6. Jangan mengarang API, konfigurasi, hasil tes, atau perilaku runtime.
7. Jangan menghapus fitur atau mengubah kontrak API secara diam-diam.
8. Jika ada persyaratan yang ambigu dan berdampak besar, tanyakan sebelum menerapkan asumsi.
9. Perbarui dokumentasi bila perilaku, keputusan, atau cara menjalankan proyek berubah.

## Verifikasi sebelum menyelesaikan tugas
- Jalankan perintah lint, typecheck, test, dan build yang tersedia dan relevan.
- Jangan mengklaim perintah berhasil jika tidak benar-benar dijalankan.
- Laporkan perintah yang dijalankan, hasilnya, dan pemeriksaan yang belum dilakukan.
- Untuk perubahan UI, periksa keyboard focus, label form, status, responsivitas 320 px, pembesaran teks, dan reduced motion sesuai ruang lingkup.
- Untuk perubahan akses data, uji kasus izin yang lolos dan ditolak, termasuk fasilitas yang tidak cocok, consent kedaluwarsa, dan consent dicabut.
- Untuk sinkronisasi, uji pengiriman duplikat dan pemulihan saat koneksi terputus.
- Gunakan data sintetis dalam tes dan jangan memakai data pasien nyata.

## Format laporan akhir
Ringkas:
- Apa yang diubah dan alasannya.
- File utama yang diubah.
- Tes yang dijalankan dan hasilnya.
- Risiko, asumsi, atau keputusan yang masih menunggu persetujuan.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
