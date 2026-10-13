# AKSESPASS

Aplikasi web seluler (PWA) untuk membantu pasien menyampaikan kebutuhan layanan kepada petugas fasilitas kesehatan tanpa harus mengulang cerita, dengan kontrol persetujuan di tangan pasien.

> **Penting:** Data pasien nyata dilarang keras dimasukkan ke kode, database lokal, seed, tes, atau log. Selalu gunakan **data sintetis**.

## Prasyarat

- **Node.js** ≥ 20
- **pnpm** ≥ 10
- **PostgreSQL 16** lokal (misalnya melalui Homebrew)

## Instalasi

1. Pasang dependensi:
   ```bash
   pnpm install
   ```
2. Salin konfigurasi lingkungan contoh:
   ```bash
   cp .env.example .env
   ```
   Lalu isi `DATABASE_URL` sesuai database PostgreSQL 16 lokal (digunakan mulai Bagian 2).

## Perintah Utama

- `pnpm dev` — Menjalankan server pengembangan lokal (`http://localhost:3000`).
- `pnpm lint` — Menjalankan pemeriksaan ESLint.
- `pnpm typecheck` — Menjalankan pemeriksaan tipe TypeScript (`tsc --noEmit`).
- `pnpm test` — Menjalankan pengujian otomatis menggunakan Vitest (`vitest run`).
- `pnpm build` — Membangun aplikasi untuk produksi (`next build`).
- `pnpm start` — Menjalankan hasil build produksi.

## Catatan Keamanan (Content-Security-Policy)

- Header keamanan dasar (`Content-Security-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`) dikonfigurasi di `next.config.ts` dengan `default-src 'self'` dan `font-src 'self'`.
- Pada mode pengembangan (`NODE_ENV === "development"`), direktif `script-src` menambahkan `'unsafe-eval'` agar fitur *fast refresh* / *source map* Next.js dapat berjalan.
- Penerapan CSP berbasis *nonce* untuk menghilangkan `'unsafe-inline'` pada skrip/gaya ditunda sebagai sisa pekerjaan.

## Mode Demo Dua Perangkat

Akses kamera peramban dibatasi secara ketat oleh spesifikasi Web API hanya pada **Secure Context** (HTTPS atau `localhost`).

### Skenario yang Disarankan (Laptop Petugas + Ponsel Pasien)
1. **Laptop Petugas (Pemindai):**
   - Buka `http://localhost:3000` di laptop bertugas. Kamera laptop (`localhost`) diperlakukan sebagai secure context sehingga peramban mengizinkan akses kamera pemindai.
2. **Ponsel Pasien (Penampil QR):**
   - Buka `http://<IP-LAN>:3000` di peramban ponsel pasien yang terhubung ke jaringan Wi-Fi / hotspot yang sama.
   - Pasien membuat ConsentQR dan menampilkannya di layar ponsel. Pasien **tidak memerlukan kamera**, sehingga koneksi HTTP biasa tidak memblokir alur pasien.
3. **Konfigurasi Lingkungan (`.env`):**
   - Atur daftar origin yang diizinkan pada variabel `APP_ORIGINS`:
     ```bash
     APP_ORIGINS="http://localhost:3000,http://<IP-LAN>:3000"
     ```
   - Bangun dan jalankan server produksi yang mendengarkan di seluruh antarmuka jaringan:
     ```bash
     pnpm build
     pnpm start -H 0.0.0.0 -p 3000
     ```

### Peringatan Keamanan & Privasi Jaringan
> [!WARNING]
> - **Jangan gunakan Wi-Fi publik/bersama:** Pada Wi-Fi bersama, siapa pun di jaringan dapat membuka server dan melihat kode OTP tiruan di layar pengembangan.
> - Selalu gunakan **hotspot pribadi portabel**.
> - Gunakan **HANYA data sintetis**.
> - Segera matikan server (`Ctrl+C`) setelah demo selesai.
> - **Dilarang keras** menggunakan layanan *tunneling* publik (ngrok, localtunnel, Cloudflare Tunnel, dsb.) tanpa persetujuan tim privasi.

### Opsi Khusus: Ponsel sebagai Pemindai
Jika ingin menggunakan ponsel sebagai pemindai kamera pada jaringan lokal (HTTP):
- **Android:** Buka `chrome://flags` di Chrome Android, cari `Insecure origins treated as secure`, tambahkan `http://<IP-LAN>:3000`, lalu aktifkan dan muat ulang peramban.
- **iOS Safari:** Tidak memiliki padanan opsi ini (hanya mendukung kamera pada origin HTTPS atau localhost via Web Inspector).

