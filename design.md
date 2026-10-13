# AKSESPASS Design System & UI Specifications (`design.md`)

**Versi:** 0.4 (Atkinson Hyperlegible Next, WCAG 2.2 AA Verified, Mobile PWA Optimized)  
**Target Kompatibilitas:** WCAG 2.2 Level AA  
**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React (Ikon)

---

## 1. Prinsip Utama Desain & Aksesibilitas
1. **WCAG 2.2 Level AA Compliance:**
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

### A. Palet Warna Utama (Cyan System - Lolos WCAG AA)
| Token Name | Tailwind Class / Hex | Rasio Kontras & Aturan Penggunaan |
| :--- | :--- | :--- |
| `bg-page` | `bg-cyan-50` (`#ECFEFF`) | Latar belakang utama seluruh aplikasi. Safe & clean. |
| `bg-surface` | `bg-cyan-100` (`#CFFAFE`) | Latar chip, latar pilihan, kartu pendukung, dan state aktif. **Dilarang untuk teks putih**. |
| `border-decorative` | `border-cyan-400` (`#22D3EE`) | **Hanya untuk elemen dekoratif/garis** ($\sim 1.8:1$, dilarang untuk teks/input control). |
| `border-input` | `border-cyan-800` (`#155E75`) | Batas tepi elemen input form ($\ge 3:1$ terhadap latar putih). |
| `icon-accent` | `text-cyan-600` (`#0891B2`) | Digunakan untuk ikon mandiri atau teks tebal berukuran besar ($\ge 24\text{ px}$). |
| `btn-primary` | `bg-cyan-700` (`#0E7490`) | Tombol Utama (CTA). Dipasangkan wajib dengan **teks putih tebal** ($\sim 5.4:1$). |
| `btn-secondary` | `bg-cyan-100` (`#CFFAFE`) | Tombol Sekunder. Dipasangkan dengan border `border-cyan-700` & teks `text-cyan-900`. |
| `text-main` | `text-cyan-900` (`#164E63`) | Judul, *heading*, dan teks utama ($\sim 9:1$, sangat aman terhadap latar putih/Cyan-50). |
| `text-secondary`| `text-slate-600` (`#475569`) | Teks sekunder/metadata ($\sim 6.8:1$ di atas latar `bg-surface` Cyan-100, memenuhi syarat minimum 4.5:1). |
| `text-link` | `text-cyan-800` (`#155E75`) | Taut/Link interaktif dengan underline. |
| `disabled-surface`| `bg-slate-200` (`#E2E8F0`) | Latar belakang elemen nonaktif. |
| `disabled-text` | `text-slate-500` (`#64748B`) | Teks/Ikon elemen nonaktif. |
| **Penting:** | *Placeholder abu-abu muda (`#94A3B8`) dilarang keras* karena gagal kontras 4.5:1. Gunakan teks penjelas di luar input jika diperlukan. |

### B. Warna Status & Umpan Balik (Wajib: Ikon + Teks)
| Status | Latar Container | Teks & Ikon | Ikon Wajib | Contoh Label |
| :--- | :--- | :--- | :--- | :--- |
| **Sukses (Success)** | `bg-emerald-50` (`#ECFDF5`) | `text-emerald-700` (`#047857`) | `CheckCircle2` | "QR Valid", "Tersinkron" |
| **Peringatan (Warning)**| `bg-amber-50` (`#FFFBEB`) | `text-amber-700` (`#B45309`) | `AlertTriangle` | "Hampir Kedaluwarsa", "Menunggu Sinkron" |
| **Galat (Error)** | `bg-red-50` (`#FEF2F2`) | `text-red-700` (`#B91C1C`) | `XCircle` / `Ban` | "QR Kedaluwarsa", "Kamera Ditolak" |

---

## 3. Aturan Tipografi & Skala Modular (Atkinson Hyperlegible Next)

### A. Prinsip & Keputusan Desain Tipografi
1. **Font tunggal:** Menggunakan **Atkinson Hyperlegible Next** untuk seluruh antarmuka. Karakter huruf dirancang khusus untuk menghindari kebingungan visual (seperti `I`/`l`/`1` atau `O`/`0`), sehingga tidak memerlukan *monospace* terpisah untuk nomor antrean atau kode verifikasi.
2. **Skala Modular:** Menggunakan rasio *Major Third* ($\times 1,25$) dengan basis dasar `16 px` (`1 rem`), memastikan seluruh ukuran teks berbasis *rem* agar mendukung *text scaling* 200%.
3. **Pengaturan Spasi & Huruf:**
   * **Letter-spacing:** Ditetapkan `0` di semua level karena keunggulan Atkinson berada pada proporsi bentuk huruf aslinya.
   * **Hindari ALL CAPS:** Label dan tombol tidak menggunakan huruf kapital semua demi kenyamanan pembaca *low-vision*.
   * **Bobot Font:** Dibatasi hanya menggunakan bobot `400` (Body) dan `700` (Heading/CTA) untuk menciptakan kontras visual yang tegas.
4. **Panjang Baris & Spasi Putih:**
   * `max-width: 60ch` untuk paragraf isi (*body*).
   * Spasi paragraf bawah `16 px`. Jarak atas *heading* lebih besar ($\approx 32\text{ px}$) daripada jarak bawahnya ($8\text{–}12\text{ px}$).

### B. Skala Tipografi Resmi
| Level | Ukuran (Rem / Fluid) | Line-Height | Weight | Catatan Khusus |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `clamp(1.75rem, 1.55rem + 0.8vw, 1.95rem)` | `1.2` | 700 | Skala fluid (Mobile $\approx 28\text{ px}$, Desktop $\approx 31\text{ px}$). Wajib menyertakan *rem* di dalam `clamp()`. |
| **H2** | `1.5625rem` ($\approx 25\text{ px}$) | `1.3` | 700 | Judul seksi utama & modal. |
| **H3** | `1.25rem` ($20\text{ px}$) | `1.4` | 700 | Naik dari bobot 600 untuk ketegasan visual maksimal. |
| **Body** | `1rem` ($16\text{ px}$) | `1.6` | 400 | Digunakan untuk paragraf teks dan elemen *input* form (mencegah *auto-zoom* iOS Safari). |
| **Caption/Label** | `0.875rem` ($14\text{ px}$) | `1.5` | 500 | Sengaja menggunakan line-height 1,5 (sedikit di atas standar) demi kenyamanan audiens *low-vision*. |

---

## 4. Spesifikasi Komponen Utama (UI Kits & Pattern)

### A. Tombol Utama & Sekunder
* **Primary Button:** `h-12 px-6 bg-cyan-700 text-white font-semibold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2`
* **Secondary Button:** `h-12 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-semibold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900`

### B. Status Banner / Alert Card (Hasil Pindai T4/T4b)
```tsx
<div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200" role="alert">
  <XCircle aria-hidden="true" className="w-6 h-6 text-red-700 shrink-0"/>
  <div className="flex flex-col">
    <span className="text-sm font-bold text-red-700">QR Kedaluwarsa</span>
    <span className="text-sm text-red-700">Minta pasien memperbarui ConsentQR di aplikasinya.</span>
  </div>
</div>