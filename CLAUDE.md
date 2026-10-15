# CLAUDE.md — AKSESPASS

## Instruksi awal
Sebelum mengubah kode:
1. Baca `AGENTS.md`.
2. Baca **hanya** bagian yang relevan menurut peta di bawah, bukan seluruh dokumen.
3. Periksa implementasi, skrip, dan pola yang benar-benar ada di repository.
4. Tentukan apakah tugas menyentuh data pasien, persetujuan, autentikasi, audit log, sinkronisasi offline, atau aksesibilitas.

`AGENTS.md` adalah panduan lintas agent. Instruksi ini melengkapi panduan tersebut untuk workflow Claude Code dan tidak menggantikan kedua spesifikasi. `SOUL.md` berisi prinsip pengambilan keputusan; baca bila ada keraguan soal privasi, kejujuran klaim, atau scope.

### Dokumen
| File | Isi |
| :--- | :--- |
| `architecture.md` | Batasan, aktor, keputusan arsitektur (A1–A7), model data, keamanan |
| `design.md` | Token warna, tipografi, komponen, aksesibilitas |
| `docs/user-flows.md` | Alur per layar (P1–P23, D1–D8, T1–T9, A1–A8, K1–K6) dan keputusan produk |
| `docs/user-stories.md` | User story (P-01, T-01, …), prioritas M/S/C, layar terkait, cakupan prototipe |
| `docs/implementation-plan.md` | Urutan kerja, checklist, dan verifikasi per bagian. Baca tabel status + bagian aktif saja; centang hanya dengan bukti |
| `docs/proposal.md` | Latar dan fitur produk; bukan spesifikasi teknis |
| `docs/archive/` | **Jangan dibaca.** PDF sumber yang sudah dikonversi |

Kode bertanda hubung (`P-05`) = user story. Kode tanpa tanda hubung (`P16`, `T4b`) = layar. `A1`–`A7` di `architecture.md` §3 = keputusan arsitektur, bukan layar admin.

### Peta tugas → bagian yang dibaca
| Tugas menyentuh | `architecture.md` | `design.md` | Lainnya |
| :--- | :--- | :--- | :--- |
| ConsentQR, pindai, baca profil | §5, §6, §7, §11, §13 | §2B, §4B | Layar P11–P12, P18–P20, T4–T5 |
| Login, sesi, peran, pemulihan, delegasi | §2, §3, §10, §13 | — | Layar P3, D2–D3, T2, A2, K2 |
| Pendamping | §2, §6, §10, §11 | — | Layar P21, D1–D8 |
| Kunjungan, CareProof, offline/sinkron | §6, §9, §11 | §2B | Layar P8, P16–P17, T4b, T8–T9 |
| Saran tindakan, aturan kurator | §2, §6 | — | Layar T6, K1–K6 |
| Dashboard, tindak lanjut | §2, §6 | — | Layar A3, A6–A8, P17 |
| Brief | §8 | — | Layar P10, T3 |
| UI atau komponen apa pun | §14 | §1–§6 (§6 = gaya seragam semua peran) | Layar yang dibangun |
| Hapus akun | §6, §11, §13 | — | Layar P22–P23 |
| Tes atau verifikasi | §15 | §1 | — |

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
- Status disampaikan lewat `StatusBanner` dengan judul teks yang bermakna (palet Cyan tanpa ikon sejak 16 Okt 2026, `design.md` §2B); jangan hanya mengandalkan warna dan jangan menambah warna status inline.
- Gunakan komponen bersama untuk pola berulang, terutama banner status. Halaman baru dibungkus `PageShell` (otomatis memakai `AppHeader`) dengan salah satu `patientNav`, `companionNav`, `petugasNav`, atau `adminNav` bila itu layar awal peran; kartu teal utama beranda memakai `HeroCard`; kode OTP memakai `OtpCodeInput`.
- Ikuti gaya seragam di `design.md` §6: kartu putih bergaris `border-cyan-800`, daftar dua kolom dengan kartu ganjil terakhir memanjang (`[&>*:last-child:nth-child(odd)]:col-span-2`), tanpa ikon dekoratif, pilihan terpilih = border tebal (bukan isian biru). Jangan menaruh `legend` sebagai anak langsung grid.
- Lapisan CSS global (`globals.css`) tidak berlapis: aturan elemen `p`, `h1`–`h3` mengalahkan utilitas Tailwind seperti `text-sm`; gunakan akhiran `!` (mis. `text-xl!`) bila perlu menimpa.
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
