# AKSESPASS Design System & UI Specifications (`design.md`)

**Versi:** 0.5 (Atkinson Hyperlegible Next, Mobile PWA)
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
   * Dilarang menyampaikan status hanya melalui warna. Semua indikator status wajib menggabungkan **Ikon + Teks + Warna**.
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

### B. Warna Status & Umpan Balik (Wajib: Ikon + Teks)
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
   * `max-width: 60ch` untuk paragraf isi (*body*).
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
| Input teks / kode OTP | P3, D2, T2, A5 | Teks 16 px; `border-input`; tinggi ≥ 48 px; label terlihat di luar input (bukan placeholder); pesan galat di bawah input dengan ikon + teks |
| Pilihan bergambar / chip | P5, P7 | Area ≥ 48 × 48 px; state terpilih memakai `bg-surface` **dan** ikon centang (bukan warna saja); dapat dioperasikan keyboard |
| Tombol geser (toggle) | P11 | Area sentuh ≥ 48 × 48 px; label teks di sebelahnya; status Aktif/Nonaktif ditulis, bukan hanya posisi |
| Skala ikon CareProof | P16, D8, T9 | Tiga tombol besar berlabel teks: Terpenuhi (pola Sukses, `CheckCircle2`), Sebagian (pola Peringatan, `AlertTriangle`), Belum (pola Galat, `XCircle`) |
| Pop-up konfirmasi tindakan merusak | P20, P21, P23, A4, K4 | Fokus pindah ke pop-up; tombol batal selalu ada; tombol aksi menyebut tindakannya ("Ya, Cabut"), bukan "OK" |

*Catatan implementasi:* Seluruh komponen turunan di atas telah diimplementasikan sebagai komponen bersama di `src/components/` pada Prompt 8 (status spesifikasi tetap **[Usulan]** hingga seluruh alur diverifikasi penuh).
