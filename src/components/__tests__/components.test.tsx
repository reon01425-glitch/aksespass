import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Button,
  CareProofScale,
  ChoiceChip,
  ChoiceGroup,
  ConfirmDialog,
  PageShell,
  StatusBanner,
  TextField,
  TextLink,
  Toggle,
} from "../index";

describe("Komponen UI Bersama (renderToStaticMarkup, tanpa DOM)", () => {
  describe("StatusBanner", () => {
    it("galat → role='alert', ikon aria-hidden, judul dan pesan ada", () => {
      const html = renderToStaticMarkup(
        <StatusBanner
          variant="error"
          title="QR Tidak Dapat Dipakai"
          message="Minta pasien membuat ConsentQR baru."
        />
      );

      expect(html).toContain('role="alert"');
      expect(html).not.toContain('role="status"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("QR Tidak Dapat Dipakai");
      expect(html).toContain("Minta pasien membuat ConsentQR baru.");
    });

    it("sukses dan peringatan → role='status'", () => {
      const successHtml = renderToStaticMarkup(
        <StatusBanner
          variant="success"
          title="QR Valid"
          message="Data dibaca."
        />
      );
      expect(successHtml).toContain('role="status"');
      expect(successHtml).not.toContain('role="alert"');
      expect(successHtml).toContain('aria-hidden="true"');

      const warningHtml = renderToStaticMarkup(
        <StatusBanner
          variant="warning"
          title="Hampir Kedaluwarsa"
          message="Sisa waktu 10 menit."
        />
      );
      expect(warningHtml).toContain('role="status"');
      expect(warningHtml).not.toContain('role="alert"');
    });

    it("galat dengan ikon ban untuk kamera ditolak", () => {
      const html = renderToStaticMarkup(
        <StatusBanner
          variant="error"
          icon="ban"
          title="Kamera Ditolak"
          message="Izin ditolak."
          action={<button type="button">Masukkan kode</button>}
        />
      );
      expect(html).toContain('role="alert"');
      expect(html).toContain("Kamera Ditolak");
      expect(html).toContain("Masukkan kode");
    });
  });

  describe("TextField", () => {
    it("label for = id input dan tidak ada atribut placeholder", () => {
      const html = renderToStaticMarkup(
        <TextField id="nama-input" label="Nama Pasien" />
      );

      expect(html).toContain('for="nama-input"');
      expect(html).toContain('id="nama-input"');
      expect(html).not.toMatch(/\splaceholder=/);
    });

    it("helper text sebagai placeholder abu-abu, tetap tersedia untuk teknologi bantu", () => {
      const html = renderToStaticMarkup(
        <TextField
          id="nama-panggilan"
          label="Nama panggilan"
          helperText="Boleh nama panggilan, tidak perlu nama lengkap."
          helperTextAsPlaceholder
        />
      );

      expect(html).toContain(
        'placeholder="Boleh nama panggilan, tidak perlu nama lengkap."'
      );
      expect(html).toContain("placeholder:text-slate-600");
      expect(html).toContain('aria-describedby="nama-panggilan-helper"');
      expect(html).toContain('id="nama-panggilan-helper" class="sr-only"');
    });

    it("helper text textarea dapat ditampilkan sebagai placeholder", () => {
      const html = renderToStaticMarkup(
        <TextField
          id="catatan"
          label="Catatan"
          variant="textarea"
          helperText="Tuliskan preferensi layanan."
          helperTextAsPlaceholder
        />
      );

      expect(html).toContain('placeholder="Tuliskan preferensi layanan."');
      expect(html).toContain("placeholder:text-slate-600");
    });

    it("saat galat: aria-invalid='true' dan aria-describedby menunjuk id pesan", () => {
      const html = renderToStaticMarkup(
        <TextField
          id="otp-input"
          label="Kode OTP"
          error="Kode OTP harus 6 angka"
          helperText="Cek SMS Anda"
        />
      );

      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="otp-input-error otp-input-helper"');
      expect(html).toContain('id="otp-input-error"');
      expect(html).toContain("Kode OTP harus 6 angka");
      expect(html).not.toMatch(/\splaceholder=/);
    });

    it("varian telepon memiliki type='tel' dan autocomplete='tel'", () => {
      const html = renderToStaticMarkup(
        <TextField id="tel-input" label="Nomor Telepon" variant="tel" />
      );

      expect(html).toContain('type="tel"');
      expect(html).toMatch(/autocomplete="tel"/i);
    });

    it("varian OTP memiliki satu kolom dengan inputMode numeric, autocomplete one-time-code, maxLength 6", () => {
      const html = renderToStaticMarkup(
        <TextField id="otp-input-field" label="OTP" variant="otp" />
      );

      expect(html).toMatch(/inputmode="numeric"/i);
      expect(html).toMatch(/autocomplete="one-time-code"/i);
      expect(html).toMatch(/maxlength="6"/i);
    });
  });

  describe("Button", () => {
    it("default type='button'", () => {
      const html = renderToStaticMarkup(<Button>Kirim</Button>);
      expect(html).toContain('type="button"');
      expect(html).toContain("Kirim");
    });

    it("memproses dengan aria-busy dan teks 'Memproses…'", () => {
      const html = renderToStaticMarkup(
        <Button isLoading>Simpan Data</Button>
      );

      expect(html).toContain('aria-busy="true"');
      expect(html).toContain("Memproses…");
      expect(html).not.toContain("Simpan Data");
      expect(html).toContain("disabled");
    });
  });

  describe("ConfirmDialog", () => {
    it("<dialog> dengan aria-labelledby dan label tombol aksi sesuai prop", () => {
      const html = renderToStaticMarkup(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Cabut ConsentQR?"
          description="QR ini tidak dapat dipakai lagi."
          confirmLabel="Ya, Cabut"
          cancelLabel="Batal"
        />
      );

      expect(html).toContain("<dialog");
      expect(html).toContain('aria-labelledby="confirm-dialog-title"');
      expect(html).toContain('id="confirm-dialog-title"');
      expect(html).toContain("Cabut ConsentQR?");
      expect(html).toContain("Ya, Cabut");
      expect(html).toContain("Batal");
    });
  });

  describe("CareProofScale", () => {
    it("fieldset + legend + 3 radio berlabel", () => {
      const html = renderToStaticMarkup(
        <CareProofScale
          name="careproof-test"
          legend="Apakah kebutuhan Anda terpenuhi?"
          value="terpenuhi"
          onChange={() => {}}
        />
      );

      expect(html).toContain("<fieldset");
      expect(html).toContain("<legend");
      expect(html).toContain("Apakah kebutuhan Anda terpenuhi?");

      expect(html).toContain('type="radio"');
      expect(html).toContain('value="terpenuhi"');
      expect(html).toContain('value="sebagian"');
      expect(html).toContain('value="belum"');

      expect(html).toContain("Terpenuhi");
      expect(html).toContain("Sebagian");
      expect(html).toContain("Belum");
    });
  });

  describe("Toggle & ChoiceChip & PageShell & TextLink", () => {
    it("Toggle: checkbox role='switch' dengan label teks dan tulisan status", () => {
      const html = renderToStaticMarkup(
        <Toggle id="test-toggle" label="Bagikan Data" checked={true} onChange={() => {}} />
      );
      expect(html).toContain('role="switch"');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("Bagikan Data");
      expect(html).toContain("Aktif");
    });

    it("ChoiceChip & ChoiceGroup: fieldset dengan checkbox asli", () => {
      const html = renderToStaticMarkup(
        <ChoiceGroup legend="Pilihan Kebutuhan">
          <ChoiceChip
            id="c1"
            name="k"
            value="v1"
            label="BISINDO"
            checked={true}
            onChange={() => {}}
          />
        </ChoiceGroup>
      );
      expect(html).toContain("<fieldset");
      expect(html).toContain("<legend");
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("BISINDO");
    });

    it("PageShell: header, back link, H1, main content", () => {
      const html = renderToStaticMarkup(
        <PageShell title="Judul Halaman" backHref="/kembali">
          <p>Konten halaman</p>
        </PageShell>
      );
      expect(html).toContain("<header");
      expect(html).toContain('href="/kembali"');
      expect(html).toContain('aria-label="Kembali"');
      expect(html).toContain("<h1");
      expect(html).toContain("Judul Halaman");
      expect(html).toContain('id="main-content"');
      expect(html).toContain("Konten halaman");
    });

    it("TextLink: tautan dengan class text-link dan underline", () => {
      const html = renderToStaticMarkup(
        <TextLink href="/info" standalone>
          Informasi
        </TextLink>
      );
      expect(html).toContain('href="/info"');
      expect(html).toContain("text-link");
      expect(html).toContain("underline");
    });

    it("PatientNeedsSummary: merender nama panggilan, kebutuhan terkelompok, catatan, dan privasi", async () => {
      const { PatientNeedsSummary } = await import("../patient-needs-summary");
      const html = renderToStaticMarkup(
        <PatientNeedsSummary
          preferredName="Budi Prakoso"
          needs={[
            {
              code: "komunikasi_bisindo",
              label: "Komunikasi dengan BISINDO",
              iconName: "Hand",
              category: "komunikasi",
            },
          ]}
          patientNote="Catatan khusus"
          showPrivacyNotes={true}
        />
      );

      expect(html).toContain("Budi Prakoso");
      expect(html).toContain("Komunikasi dengan BISINDO");
      expect(html).toContain("Catatan khusus");
      expect(html).toContain("Diagnosis tidak diminta");
      expect(html).toContain("Petugas hanya melihat bagian yang Anda pilih");
    });

    it("RadioList: merender fieldset, legend, radio inputs, dan status terpilih", async () => {
      const { RadioList } = await import("../radio-list");
      const html = renderToStaticMarkup(
        <RadioList
          name="faskes-test"
          legend="Pilih Fasilitas"
          helperText="Keterangan fasilitas"
          value="f1"
          onChange={() => {}}
          options={[
            { value: "f1", label: "Puskesmas Contoh A", description: "Buka 24 jam" },
            { value: "f2", label: "Klinik Contoh B", disabled: true },
          ]}
        />
      );

      expect(html).toContain("<fieldset");
      expect(html).toContain("<legend");
      expect(html).toContain("Pilih Fasilitas");
      expect(html).toContain("Keterangan fasilitas");
      expect(html).toContain('type="radio"');
      expect(html).toContain('value="f1"');
      expect(html).toContain("checked");
      expect(html).toContain("Puskesmas Contoh A");
      expect(html).toContain("Buka 24 jam");
      expect(html).toContain('value="f2"');
      expect(html).toContain("disabled");
    });
  });
});
