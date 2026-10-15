# AKSESPASS — User Story

> **Sumber:** PDF hal. 14–19 (`docs/archive/aksespass-hal01-19.pdf`). Kolom "Layar" diambil dari tabel pemetaan di `docs/user-flows.md`.

## Konvensi kode

| Bentuk | Arti | Contoh | Didefinisikan di |
| :--- | :--- | :--- | :--- |
| Huruf-tanda hubung-angka | **User story** | `P-05`, `T-01`, `A-02` | File ini |
| Huruf+angka, tanpa tanda hubung | **Layar** | `P16`, `T4b`, `K3` | `docs/user-flows.md` |
| `A1`–`A7` di `architecture.md` §3 | **Keputusan arsitektur** (bukan layar admin) | `A4` = token QR acak | `architecture.md` |

Huruf aktor: **P** pasien, **D** pendamping, **T** petugas, **A** admin fasilitas, **K** kurator aturan.
Prioritas: **M** = Must (wajib di prototipe), **S** = Should (diusahakan), **C** = Could (roadmap atau bonus).

## Pasien

| ID | User story | Prio | Layar |
| :--- | :--- | :--- | :--- |
| P-01 | Sebagai pasien, saya ingin mendaftar dan memilih kebutuhan komunikasi dan aksesibilitas tanpa mengisi diagnosis, agar privasi saya terjaga. | M | P2, P3, P5, P6, D5 |
| P-02 | Sebagai pasien, saya ingin mengubah profil kebutuhan saya kapan saja, agar paspor selalu sesuai kondisi saya. | M | P5, P6, D5 |
| P-03 | Sebagai pasien, saya ingin membagikan kebutuhan lewat QR sementara dengan masa berlaku yang saya tentukan, agar saya tidak perlu menjelaskan ulang di tiap layanan. | M | P9, P11, P12, D6 |
| P-04 | Sebagai pasien, saya ingin memilih data apa saja yang dibagikan lewat QR, agar saya hanya membuka yang perlu. | S | P11 |
| P-05 | Sebagai pasien, saya ingin mencabut akses QR kapan saja, agar saya tetap memegang kendali atas data saya. | M | P12, P20 |
| P-06 | Sebagai pasien, saya ingin melihat riwayat siapa yang membuka data saya, agar saya bisa memeriksa penyalahgunaan. | M | P12, P19, T4 |
| P-07 | Sebagai pasien, saya ingin mengonfirmasi lewat ikon apakah kebutuhan saya terpenuhi, agar kekurangan layanan tercatat. | M | P16, T9 |
| P-08 | Sebagai pasien, saya ingin melihat status tindak lanjut kebutuhan yang belum terpenuhi, agar saya tahu laporan saya ditanggapi. | S | P17, A8 |
| P-09 | Sebagai pasien, saya ingin berkomunikasi lewat papan bergambar dan teks-ke-suara, agar percakapan berjalan tanpa petugas harus memahami bahasa isyarat. | S | P13, P15.1–P15.2, T7 |
| P-10 | Sebagai pasien Tuli, saya ingin membaca ucapan petugas sebagai teks langsung, agar saya memahami penjelasan tanpa pendamping. | S | P15.3, T7 |
| P-11 | Sebagai pasien Tuli, saya ingin memakai frasa medis BISINDO bergambar atau video, agar saya bisa menyampaikan keluhan umum dengan cepat. | C | P15.4 |
| P-12 | Sebagai pasien, saya ingin mengirim kebutuhan sebelum datang (Pre-Arrival Brief), agar fasilitas sudah siap saat saya tiba. | C | P9, P10, T3 |
| P-13 | Sebagai pasien, saya ingin dipanggil lewat notifikasi visual dan getar sesuai kebutuhan saya, agar tidak terlewat antrean. *Syarat: browser mendukung notifikasi; jika tidak, pasien dipanggil lewat layar atau petugas.* | C | P13, P14, T6, D7 |
| P-14 | Sebagai pasien, saya ingin memiliki kartu cetak ber-QR dan mode offline, agar tetap bisa dilayani saat ponsel atau sinyal bermasalah. **Catatan: QR pada kartu ditunda (keputusan 1 di `user-flows.md`); kartu hanya berisi ringkasan.** | S | P7, P8, P9, D6 |
| P-15 | Sebagai pasien, saya ingin menghapus data dan akun saya, agar saya berhak mengakhiri penggunaan. *(Cek ketentuan UU PDP.)* | S | P22, P23 |
| P-16 | Sebagai pasien, saya ingin mencabut tautan pendamping kapan saja, agar akses mereka tidak permanen. | S | P21, D4 |

## Pendamping

| ID | User story | Prio | Layar |
| :--- | :--- | :--- | :--- |
| D-01 | Sebagai pendamping, saya ingin ditautkan ke pasien atas persetujuan pasien (diajukan pasien atau pendamping, disetujui pasien secara aksesibel), agar saya sah bertindak atas namanya. | S | D2, D3, D4, P21 |
| D-02 | Sebagai pendamping, saya ingin mengelola paspor dan QR atas nama pasien, agar pasien yang kesulitan memakai smartphone tetap terlayani. | S | D4, D5, D6, D7 |
| D-03 | Sebagai pendamping, saya ingin mengonfirmasi CareProof atas nama pasien, agar pasien yang tidak bisa menjawab sendiri tetap punya suara. *Konfirmasi ditandai "oleh pendamping" dan dipisahkan dalam data dashboard.* | S | D8, P16, T9 |

## Petugas

| ID | User story | Prio | Layar |
| :--- | :--- | :--- | :--- |
| T-01 | Sebagai petugas, saya ingin login dengan akun terverifikasi, agar akses ke data pasien hanya oleh yang berwenang. | M | T2, T4 |
| T-02 | Sebagai petugas, saya ingin memindai QR dan langsung melihat kebutuhan pasien, agar tidak perlu bertanya berulang. | M | T3, T4, T5 |
| T-03 | Sebagai petugas, saya ingin melihat saran tindakan sesuai profil pasien, agar saya tahu apa yang perlu disiapkan. | M | T6 |
| T-04 | Sebagai petugas, saya ingin mencatat bantuan yang diberikan dengan tidak lebih dari 3 ketukan, agar tidak menambah beban kerja. | M | T8, T9 |
| T-05 | Sebagai petugas, saya ingin membaca ringkasan kebutuhan dari kartu cetak tanpa internet, agar pasien tetap terlayani saat sinyal buruk. | S | T4b, P7 |

## Admin Fasilitas

| ID | User story | Prio | Layar |
| :--- | :--- | :--- | :--- |
| A-01 | Sebagai admin, saya ingin mendaftarkan dan menonaktifkan akun petugas, agar hanya petugas aktif yang bisa memindai QR. | S | A2, A4, A5, T2 |
| A-02 | Sebagai admin, saya ingin melihat Accommodation Fulfillment Rate dan tren per bulan, agar saya tahu kinerja aksesibilitas fasilitas. | M | A3, A6 |
| A-03 | Sebagai admin, saya ingin melihat daftar kebutuhan yang paling sering belum terpenuhi dalam bentuk agregat anonim, agar saya bisa memprioritaskan perbaikan tanpa melihat identitas pasien. | S | A7 |
| A-04 | Sebagai admin, saya ingin menandai kebutuhan yang sudah ditindaklanjuti, agar tindak lanjut tertutup bisa diukur. | S | A8 |

## Kurator Aturan (perwakilan komunitas disabilitas dan tenaga kesehatan)

| ID | User story | Prio | Layar |
| :--- | :--- | :--- | :--- |
| K-01 | Sebagai kurator, saya ingin menyusun, menyetujui, dan memberi versi pada aturan panduan tindakan, agar saran ke petugas dapat dipertanggungjawabkan. | S | K2, K3, K4, K5 |
| K-02 | Sebagai kurator, saya ingin melihat riwayat perubahan aturan, agar setiap panduan punya jejak pengesah. | C | K6 |

## Kebutuhan Nonfungsional (berlaku untuk semua story)

- Aksesibel: kompatibel pembaca layar, kontras tinggi, teks dapat diperbesar, target sentuh cukup besar (target WCAG 2.2 AA; rinciannya di `design.md`).
- Bahasa antarmuka sederhana, dengan dukungan ikon.
- Mode offline untuk kartu cetak dan ringkasan kebutuhan.
- Data minimal: tidak menyimpan diagnosis. Data disabilitas dianggap sensitif; pastikan kesesuaian dengan UU PDP.
- Semua akses data tercatat dalam audit log.

## Cakupan Prototipe (dari PDF)

- **Wajib selesai:** semua story Must — P-01, P-02, P-03, P-05, P-06, P-07, T-01, T-02, T-03, T-04, A-02.
- **Diusahakan:** story Should yang paling mendukung demo: P-09, P-10, P-14, D-01 sampai D-03, dan A-03.
- **Roadmap:** story Could dan fitur IoT opsional.
- **Jangan dikorbankan walau waktu mepet:** P-05, P-06, T-01, A-02 (menjawab pertanyaan juri soal privasi dan dashboard).

Usulan cakupan per layar yang belum diputuskan: keputusan terbuka 5 di `docs/user-flows.md`.

## Status Implementasi (16 Okt 2026)

Berdasarkan kode di repository; **bukan** klaim terverifikasi (bukti pengujian dicatat di `docs/implementation-plan.md`).

| Status di kode | Story |
| :--- | :--- |
| Dibangun | Semua Must (P-01, P-02, P-03, P-05, P-06, P-07, T-01, T-02, T-03, T-04, A-02); P-04, P-08, P-09, P-15, P-16; D-01–D-03; A-01, A-03, A-04 |
| Dibangun sebagian | P-10 (teks langsung; kolom tulis petugas menunggu keputusan), P-14 dan T-05 (kartu cetak ringkasan tanpa QR dan ringkasan offline ada; antrean pencatatan offline penuh dan PDF belum) |
| Belum dibangun | P-11, P-12, P-13, K-01, K-02 |

Tampilan semua story di atas mengikuti gaya seragam `design.md` §6.
