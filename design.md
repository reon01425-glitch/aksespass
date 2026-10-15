# AKSESPASS Design System & UI Specifications (`design.md`)

**Versi:** 0.6 (Atkinson Hyperlegible Next, Mobile PWA; gaya tampilan seragam §6, 16 Okt 2026)
**Target Kompatibilitas:** WCAG 2.2 Level AA — **target, belum diverifikasi**. Kepatuhan baru boleh diklaim setelah pengujian otomatis dan manual (`architecture.md` §15).
**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React (Ikon)
**Penanda status:** sama dengan `architecture.md` — **[Diputuskan]**, **[Usulan]**, **[Verifikasi]**. Bagian tanpa penanda di dokumen ini dianggap spesifikasi yang berlaku.

---

## 1. Prinsip Utama Desain & Aksesibilitas
1. **Target WCAG 2.2 Level AA:**
   * Kombinasi warna teks dan latar memiliki rasio kontras minimum **4.5:1** (teks normal) dan **3:1** (teks besar/elemen UI).
   * Mendukung pembesaran teks (*text scaling*) hingga **200%** tanpa merusak tata letak atau fungsionalitas.
   * Responsif dan bebas *horizontal scroll* pada lebar layar minimum **320 px**.
   * *Focus ring* keyboard terlihat jelas pada semua elemen interaktif.
   * Menghormati pengaturan animasi sistem (`prefers-reduced-motion`).
2. **Standard Target Sentuh (Touch Target):**
   * Semua area interaktif (tombol, *chip*, ikon, tab, kontrol form) memiliki dimensi minimum **48 × 48 px**.
3. **Penyampaian Status Multimodal:**
   * Dilarang menyampaikan status hanya melalui warna. Indikator status menggabungkan **Ikon + Teks + Warna**; pengecualian (16 Okt 2026): `StatusBanner` memakai teks judul pada palet Cyan tanpa ikon (lihat §2B).
4. **Optimasi Low-Vision & iOS Safari:**
   * Menggunakan tipografi khusus **Atkinson Hyperlegible Next** untuk memaksimalkan keterbacaan audiens *low-vision*.
   * Semua elemen *input* form wajib berukuran **16 px** untuk mencegah pemicu *auto-zoom* otomatis di iOS Safari.

---

## 2. Color Palette & Token Design (COPALS)

### A. Palet Warna Utama (Cyan System)
Rasio kontras di tabel adalah hasil perhitungan, **[Verifikasi]** dengan alat uji kontras sebelum diklaim.

| Token Name | Tailwind Class / Hex | Rasio Kontras & Aturan Penggunaan |
| :--- | :--- | :--- |
| `bg-page` | `bg-cyan-50` (`#ECFEFF`) | Latar belakang utama seluruh aplikasi. |
| `bg-surface` | `bg-cyan-100` (`#CFFAFE`) | Latar chip, latar pilihan, kartu pendukung, dan state aktif. **Dilarang untuk teks putih**. |
| `border-decorative` | `border-cyan-400` (`#22D3EE`) | **Hanya untuk elemen dekoratif/garis** (~1.8:1, dilarang untuk teks/input control). |
| `border-input` | `border-cyan-800` (`#155E75`) | Batas tepi elemen input form (≥ 3:1 terhadap latar putih). |
| `icon-accent` | `text-cyan-600` (`#0891B2`) | Ikon mandiri atau teks tebal berukuran besar (≥ 24 px). |
| `btn-primary` | `bg-cyan-700` (`#0E7490`) | Tombol Utama (CTA). Wajib dipasangkan dengan **teks putih tebal** (~5.4:1). |
| `btn-secondary` | `bg-cyan-100` (`#CFFAFE`) | Tombol Sekunder. Dipasangkan dengan border `border-cyan-700` & teks `text-cyan-900`. |
| `text-main` | `text-cyan-900` (`#164E63`) | Judul, *heading*, dan teks utama (~9:1 terhadap latar putih/Cyan-50). |
| `text-secondary`| `text-slate-600` (`#475569`) | Teks sekunder/metadata (~6.8:1 di atas `bg-surface` Cyan-100). |
| `text-link` | `text-cyan-800` (`#155E75`) | Taut/Link interaktif dengan underline. |
| `disabled-surface`| `bg-slate-200` (`#E2E8F0`) | Latar belakang elemen nonaktif. |
| `disabled-text` | `text-slate-500` (`#64748B`) | Teks/Ikon elemen nonaktif. |
| **Penting:** | *Placeholder abu-abu muda (`#94A3B8`) dilarang keras* karena gagal kontras 4.5:1. Gunakan teks penjelas di luar input jika diperlukan. |

### B. Warna Status & Umpan Balik
> **[Diubah 16 Okt 2026, atas permintaan pemilik produk]** Notifikasi `StatusBanner` memakai palet Cyan (tabel A: `bg-cyan-100`, `border-cyan-800`, `text-cyan-900`), **tanpa ikon dan tanpa warna status**. **[Diubah 16 Okt 2026]** Notifikasi berlatar abu muda (`bg-slate-200`), melayang turun dari atas layar lalu hilang sendiri (sukses 6 dtk, peringatan 8 dtk, galat 10 dtk; berhenti menghitung saat disorot atau difokus; gerak mati bila `prefers-reduced-motion`). Notifikasi yang memuat tombol aksi tetap di tempat dan tidak hilang. Risiko diketahui: pesan yang hilang sendiri sulit dibaca pengguna yang lambat membaca (WCAG 2.2.1); **[Verifikasi]** durasinya dengan pengguna. Makna dibawa oleh judul teks ("Berhasil", "Gagal Menyimpan", "Hampir Kedaluwarsa"); galat memakai `role="alert"` dan tepi 2 px. Tabel di bawah tetap berlaku untuk `CareProofScale` (P16, D8, T9). Risiko diketahui: tanpa ikon dan warna, pembeda tingkat keparahan hanya teks dan tepi; **[Verifikasi]** dengan pengguna sebelum mengklaim kepatuhan WCAG 1.4.1.
| Status | Latar Container | Teks & Ikon | Ikon Wajib | Contoh Label |
| :--- | :--- | :--- | :--- | :--- |
| **Sukses (Success)** | `bg-emerald-50` (`#ECFDF5`) | `text-emerald-700` (`#047857`) | `CheckCircle2` | "QR Valid", "Tersinkron" |
| **Peringatan (Warning)**| `bg-amber-50` (`#FFFBEB`) | `text-amber-700` (`#B45309`) | `AlertTriangle` | "Hampir Kedaluwarsa", "Menunggu Sinkron" |
| **Galat (Error)** | `bg-red-50` (`#FEF2F2`) | `text-red-700` (`#B91C1C`) | `XCircle` / `Ban` | "QR Tidak Dapat Dipakai" (petugas), "QR Kedaluwarsa" (layar pasien sendiri, P12), "Kamera Ditolak" |

*Catatan padanan ikon Lucide React (v1.x):* `CheckCircle2` ↔ `CircleCheck`, `AlertTriangle` ↔ `TriangleAlert`, `XCircle` ↔ `CircleX`. Semua ikon dekoratif wajib `aria-hidden="true"`.

### C. Token Siap Pakai
Nilai sama persis dengan tabel A dan B. Bentuk integrasi ke Tailwind mengikuti versi Tailwind yang dipakai saat scaffold.

```css
:root {
  --bg-page: #ECFEFF;
  --bg-surface: #CFFAFE;
  --border-decorative: #22D3EE;
  --border-input: #155E75;
  --icon-accent: #0891B2;
  --btn-primary: #0E7490;
  --text-main: #164E63;
  --text-secondary: #475569;
  --text-link: #155E75;
  --disabled-surface: #E2E8F0;
  --disabled-text: #64748B;

  --success-bg: #ECFDF5;  --success-fg: #047857;
  --warning-bg: #FFFBEB;  --warning-fg: #B45309;
  --error-bg:   #FEF2F2;  --error-fg:   #B91C1C;

  /* Token Tambahan [Usulan] (Prompt 8) */
  --bg-surface-hover: #A5F3FC; /* Hover tombol sekunder di §4A */
  --success-border: #A7F3D0;   /* Border kontainer status sukses */
  --warning-border: #FDE68A;   /* Border kontainer status peringatan */
  --error-border:   #FECACA;   /* Border kontainer status galat (§4B border-red-200) */
  --color-white:    #FFFFFF;   /* Putih: teks tombol primer, latar input */
}
```

### D. Preferensi Tampilan Pengguna [Usulan] (Prompt 9)

Preferensi disimpan pada cookie `aksespass_pref` (HttpOnly, SameSite=Lax) dan dipasang pada elemen `<html>` di server untuk mencegah kedipan visual:
1. **Mode Kontras Tinggi (`data-contrast="high"`):**
   * Latar belakang kanvas murni putih (`#FFFFFF`), menggantikan `bg-page` (`#ECFEFF`).
   * Seluruh teks utama dan sekunder dipaksa menggunakan `text-main` (`#164E63`) untuk rasio kontras maksimal (~9:1).
   * Border input form ditingkatkan menjadi 2 px (`border-cyan-800`).
   * Menghilangkan warna latar dekoratif halus (tetap mempertahankan semantik warna status `StatusBanner`).
2. **Pilihan Ukuran Teks (`data-text-size="100|150|200"`):**
   * `100`: Skala standar (font-size 100% / 16 px basis).
   * `150`: Skala 1,5× (font-size 150% / 24 px basis).
   * `200`: Skala 2,0× (font-size 200% / 32 px basis).
   * Seluruh tata letak fleksibel dan bebas *horizontal scroll* pada layar 320 px untuk seluruh tingkat pembesaran.

---

## 3. Aturan Tipografi & Skala Modular (Atkinson Hyperlegible Next)

### A. Prinsip & Keputusan Desain Tipografi
1. **Font tunggal:** **Atkinson Hyperlegible Next** untuk seluruh antarmuka, dimuat lokal (`architecture.md` §14). Bentuk hurufnya membedakan `I`/`l`/`1` dan `O`/`0`, sehingga tidak perlu *monospace* terpisah untuk nomor antrean atau kode verifikasi.
2. **Skala Modular:** rasio *Major Third* (×1,25) dengan basis `16 px` (`1 rem`). Seluruh ukuran teks berbasis *rem* agar mendukung *text scaling* 200%.
3. **Pengaturan Spasi & Huruf:**
   * **Letter-spacing:** `0` di semua level karena keunggulan Atkinson berada pada proporsi bentuk huruf aslinya.
   * **Hindari ALL CAPS:** label dan tombol tidak memakai huruf kapital semua demi kenyamanan pembaca *low-vision*.
   * **Bobot Font:** hanya `400` (Body, Caption/Label) dan `700` (Heading, CTA/tombol, label status). Di Tailwind: `font-normal` dan `font-bold`; **jangan** memakai `font-medium` atau `font-semibold`.
4. **Panjang Baris & Spasi Putih:**
   * Paragraf isi (*body*) mengikuti lebar kolom halaman (`max-w-2xl`, di ponsel selebar layar) sehingga tepi teks sejajar dengan tepi kartu; tidak ada batas `60ch` tambahan.
   * Spasi paragraf bawah `16 px`. Jarak atas *heading* lebih besar (≈ 32 px) daripada jarak bawahnya (8–12 px).

### B. Skala Tipografi Resmi
| Level | Ukuran (Rem / Fluid) | Line-Height | Weight | Catatan Khusus |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `clamp(1.75rem, 1.55rem + 0.8vw, 1.95rem)` | `1.2` | 700 | Skala fluid (mobile ≈ 28 px, desktop ≈ 31 px). Wajib menyertakan *rem* di dalam `clamp()`. |
| **H2** | `1.5625rem` (≈ 25 px) | `1.3` | 700 | Judul seksi utama & modal. |
| **H3** | `1.25rem` (20 px) | `1.4` | 700 | Naik dari bobot 600 untuk ketegasan visual maksimal. |
| **Body** | `1rem` (16 px) | `1.6` | 400 | Paragraf dan elemen *input* form (mencegah *auto-zoom* iOS Safari). |
| **Caption/Label** | `0.875rem` (14 px) | `1.5` | 400 | Line-height 1,5 demi kenyamanan audiens *low-vision*. Bila label perlu penekanan, pakai 700. |

---

## 4. Spesifikasi Komponen Utama (UI Kits & Pattern)

### A. Tombol Utama & Sekunder
* **Primary Button:** `h-12 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2`
* **Secondary Button:** `h-12 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900`

### B. Status Banner / Alert Card (Hasil Pindai T4/T4b)
`StatusBanner` adalah satu-satunya cara menampilkan status (`architecture.md` §14).

```tsx
<div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200" role="alert">
  <XCircle aria-hidden="true" className="w-6 h-6 text-red-700 shrink-0"/>
  <div className="flex flex-col">
    <span className="text-sm font-bold text-red-700">QR Tidak Dapat Dipakai</span>
    <span className="text-sm text-red-700">Minta pasien membuat ConsentQR baru.</span>
  </div>
</div>
```

**[Usulan]** `role="alert"` hanya untuk Galat; Sukses dan Peringatan memakai `role="status"` agar pembaca layar tidak menyela untuk setiap perubahan status.

---

## 5. Komponen Turunan **[Usulan]**

Belum ada spesifikasi visual final. Aturan di bawah hanya menurunkan prinsip §1–§4 agar komponen yang dibutuhkan `docs/user-flows.md` tidak dirancang ulang setiap kali.

| Komponen | Dipakai di | Aturan minimum |
| :--- | :--- | :--- |
| Input teks / kode OTP | P3, D2, T2, A5, P22, P23 | Teks 16 px; `border-input`; tinggi ≥ 48 px; label terlihat di luar input (bukan placeholder); pesan galat memakai `StatusBanner` (lihat §2B). **[Diubah 16 Okt 2026]** Kode OTP selalu memakai `OtpCodeInput` (§6.6): enam kotak `rounded-2xl` di atas satu input asli, sama di semua peran |
| Pilihan bergambar / chip | P5, P7 | Area ≥ 48 × 48 px; dapat dioperasikan keyboard. **[Diubah 16 Okt 2026, atas permintaan pemilik produk]** state terpilih = latar putih, border tebal `border-2 border-cyan-800`, teks tebal; tidak terpilih = `border-cyan-200`. Tanpa ikon centang dan tanpa isian biru (lihat §6.3). **[Verifikasi]** keterbacaan state terpilih dengan pengguna low-vision |
| Tombol geser (toggle) | P11 | Area sentuh ≥ 48 × 48 px; label teks di sebelahnya; status Aktif/Nonaktif ditulis, bukan hanya posisi |
| Skala ikon CareProof | P16, D8, T9 | Tiga tombol besar berlabel teks, satu palet Cyan tanpa warna status **[Diubah 16 Okt 2026, atas permintaan pemilik produk]**: belum dipilih `bg-white border-cyan-800 text-cyan-900`, terpilih `bg-cyan-900 text-white`. Pembeda tetap ikon dan teks: Terpenuhi (`CircleCheck`), Sebagian (`TriangleAlert`), Belum (`CircleX`). **[Verifikasi]** keterbacaan tanpa warna dengan pengguna |
| Pop-up konfirmasi tindakan merusak | P20, P21, P23, A4, K4 | Fokus pindah ke pop-up; tombol batal selalu ada; tombol aksi menyebut tindakannya ("Ya, Cabut"), bukan "OK" |
| Navigasi bawah (semua peran) | T3, T4, T4b, P4, D4, A3 | **[Diubah 16 Okt 2026]** Bar melayang membulat (`fixed bottom-3`, `rounded-2xl border border-cyan-800 bg-white shadow-lg`) dengan ikon 22 px + teks 11 px, tinggi 64 px, tab aktif `font-bold text-cyan-700` dan `aria-current="page"`; gayanya identik untuk semua peran (§6.5). Hanya di layar awal tiap peran, tidak di langkah alur sementara |
| Kartu dan notifikasi melayang (alur petugas) | T3–T4b | Kartu `rounded-2xl` dengan ikon dalam kotak `bg-cyan-100`, tanpa foto; notifikasi tetap `StatusBanner` (opsi `floating`: menempel di atas saat digulir, bayangan) dengan palet Cyan tanpa ikon (lihat §2B) |

*Catatan implementasi:* Seluruh komponen turunan di atas telah diimplementasikan sebagai komponen bersama di `src/components/` pada Prompt 8 (status spesifikasi tetap **[Usulan]** hingga seluruh alur diverifikasi penuh).

---

## 6. Gaya Tampilan Seragam ("Gaya Petugas") **[Diubah 16 Okt 2026, atas permintaan pemilik produk]**

Seluruh layar pasien, pendamping, petugas, dan admin memakai satu bahasa visual yang sama, mengikuti beranda petugas. Aturan ini menggantikan tampilan lama yang berbeda per peran (header melayang pasien, kartu tanpa garis, ikon dekoratif). Kode acuan ada di `src/components/`.

### 6.1 Kartu
* **Kartu putih:** `rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm`. Untuk penekanan memakai `border-2`. Setiap butir isi berada di kartunya sendiri; tidak ada kotak bertumpuk di dalam kartu.
* **Kartu teal terisi:** `bg-cyan-700 text-white shadow-md`, hanya untuk satu ringkasan atau aksi utama per layar (§6.4) dan angka ringkasan dashboard.
* **Paragraf sebagai kartu** tidak perlu `max-w-none`; aturan global `p` memakai `max-width: 100%` (§3A).
* Bila `fieldset` berlegenda dibingkai, bingkai dipasang pada `div` pembungkus dan `fieldset` dibuat tanpa border agar legenda tidak memotong garis.

### 6.2 Daftar kartu dua kolom
Daftar kartu memakai `grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2`: dua kolom, dan bila jumlahnya ganjil kartu terakhir memanjang penuh. Di kartu setengah lebar, ikon di atas dan teks di bawah. Aturan hitungan anak: jangan menaruh `legend` atau elemen lain sebagai anak langsung grid, karena ikut terhitung dan menggeser ganjil-genap. Jarak antarbagian halaman `gap-5`.

### 6.3 Ikon dan pilihan
* Tidak ada ikon dekoratif (centang, silang, panah, chevron, perisai, mata, dan sejenisnya) pada tombol, kartu, atau teks bantu. Ikon hanya dipakai bila membawa makna: ikon kebutuhan (`getNeedSummaryIcon`), ikon navigasi bawah, ikon skala CareProof (§5), dan logo header.
* Pilihan (chip, radio, kartu pilih): terpilih = putih dengan `border-2 border-cyan-800` dan teks tebal; tidak terpilih = `border-cyan-200`. Tidak ada isian biru dan tidak ada kotak centang. Untuk persetujuan opsional (mis. statistik anonim di halaman masuk), kartu pilih yang sama dipakai dan keadaannya juga ditulis ("Dipilih"/"Tidak dipilih").
* Tidak ada warna status inline (hijau, kuning, merah); status disampaikan lewat teks dan `StatusBanner`.

### 6.4 `HeroCard` (kartu teal utama)
Satu per beranda tiap peran. Susunan tetap: ubin ikon putih `h-14 w-14 rounded-xl` berisi ikon `h-8 w-8 text-cyan-800`, judul `text-lg font-bold`, lalu keterangan kecil `text-sm`; seluruhnya putih di atas `bg-cyan-700`. Bila diberi `href`, kartu menjadi tautan. Komponen: `HeroCard` (`src/components/hero-card.tsx`).

| Peran | Isi kartu |
| :--- | :--- |
| Pasien | Mulai Kunjungan (ikon QR) atau Lengkapi Paspor Layanan (ikon dokumen); baris kecil "Aplikasi ini tidak meminta diagnosis medis Anda." Juga di Kontrol Akses dan Pendamping |
| Pendamping | "N Pasien Tertaut Aktif" |
| Petugas | Pindai ConsentQR |
| Admin | Dashboard Fasilitas |

### 6.5 Header dan navigasi bawah
* **`AppHeader`** (`src/components/app-header.tsx`, dipakai `PageShell`): putih, **menempel di atas saat halaman digulir** (`sticky top-0 z-40`). Isinya: tombol kembali (bila ada), logo perisai dalam lingkaran `bg-cyan-200`, label kecil "AKSESPASS" (sama di semua peran), judul halaman `text-xl`, lalu ikon notifikasi dan akun di kanan. Tujuan ikon ditentukan dari awalan alamat: pasien → Riwayat Akses dan Akun; pendamping → Beranda Pendamping; petugas → Beranda Petugas; admin → Tindak Lanjut dan Beranda Admin. **[Usulan]** tujuan pendamping, petugas, dan admin masih sementara karena belum ada halaman notifikasi atau akun untuk peran itu. Ikon tidak muncul di halaman tanpa peran (masuk, pengaturan awal).
* Label kecil "AKSESPASS" memakai huruf kapital dan `tracking-wider`, satu-satunya pengecualian dari "hindari ALL CAPS" di §3A (label merek, bukan isi). **[Verifikasi]** keterbacaannya.
* **Navigasi bawah per peran:** pasien (Beranda, Paspor, QR Akses, Pendamping, Riwayat); pendamping (Beranda, Tautkan, Keluar); petugas (Beranda, Pindai, Kartu); admin (Beranda, Petugas, Dashboard, Kebutuhan, Tindak Lanjut). Gaya identik (lihat §5). `PageShell` menerima `patientNav`, `companionNav`, `petugasNav`, atau `adminNav` dan menambah `pb-28`. Layar alur sementara (menunggu, panggilan, detail konfirmasi, hapus akun, QR kunjungan) tidak menampilkannya.
* **Halaman masuk** (`/masuk`, `/masuk/petugas`) dan **pengaturan awal** (`/mulai`) memakai tata letak tengah dengan lengkung dekoratif; hanya isi kartunya mengikuti §6.1–6.3.

### 6.6 Kode verifikasi (OTP)
`OtpCodeInput` (`src/components/otp-code-input.tsx`): satu input asli `inputMode="numeric"` `autoComplete="one-time-code"` (mendukung isi otomatis SMS dan tempel) dengan enam kotak tampilan `rounded-2xl` di bawahnya, di dalam kartu bergaris. `DemoOtpNote` menampilkan kotak "Mode demo: SMS belum aktif. Kode Anda: …" dengan gaya yang sama. Dipakai di login pasien dan pendamping, login petugas, ubah kontak, hapus akun, dan pemulihan akun oleh pendamping (lewat `OtpActionForm`).

### 6.7 Grafik dashboard admin
Grafik garis SVG `viewBox 640×260`, garis cyan tebal, di dalam kartu (Tren Kunjungan dan Tren AFR); rincian status, penjawab, dan kebutuhan belum terpenuhi sebagai batang horizontal (`BarList`). Setiap grafik memakai `role="img"` dengan `aria-label` ringkasan teks. Bulan yang disembunyikan (kurang dari 5 pasien berbeda) digambar sebagai lingkaran putus-putus berlabel "(disembunyikan)", bukan titik nol. Data contoh untuk demo: `pnpm db:seed:dummy`.

### 6.8 Batasan yang diketahui
* **[Verifikasi]** Notifikasi yang hilang sendiri (WCAG 2.2.1), keterbacaan pilihan tanpa isian biru, dan pembeda status tanpa warna belum diuji dengan pengguna.
* Seluruh gaya ini belum diuji dengan pembaca layar maupun pembesaran teks 200% pada semua layar; jangan klaim kepatuhan WCAG 2.2 AA.
