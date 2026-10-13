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
