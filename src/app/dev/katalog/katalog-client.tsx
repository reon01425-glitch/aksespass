"use client";

import React, { useRef, useState } from "react";
import {
  Button,
  TextLink,
  TextField,
  ChoiceChip,
  ChoiceGroup,
  Toggle,
  StatusBanner,
  ConfirmDialog,
  CareProofScale,
  type CareProofValue,
  PageShell,
  LogoutButton,
  PatientNeedsSummary,
  RadioList,
} from "@/components";
import { MessageSquare, Eye, Volume2, Move } from "lucide-react";

export function KatalogClient() {
  // State for interactive components
  const [textVal, setTextVal] = useState("");
  const [telVal, setTelVal] = useState("081234567890");
  const [otpVal, setOtpVal] = useState("123456");
  const [textareaVal, setTextareaVal] = useState("Bantuan berjalan lancar.");
  const [isErrorShown, setIsErrorShown] = useState(true);

  // Choice chips
  const [selectedChips, setSelectedChips] = useState<Record<string, boolean>>({
    komunikasi: true,
    penglihatan: false,
    pendengaran: false,
    mobilitas: false,
  });

  const toggleChip = (id: string, checked: boolean) => {
    setSelectedChips((prev) => ({ ...prev, [id]: checked }));
  };

  // Toggle switch
  const [isToggleActive, setIsToggleActive] = useState(true);

  // CareProofScale
  const [careProofVal, setCareProofVal] = useState<CareProofValue>("terpenuhi");

  // RadioList
  const [radioListVal, setRadioListVal] = useState("faskes-1");

  // ConfirmDialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogOutcome, setDialogOutcome] = useState<string | null>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <PageShell
      title="Katalog Komponen UI AKSESPASS"
      backHref="/"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-10 pb-20">
        <section className="flex flex-col gap-2">
          <p className="text-base text-main">
            Halaman ini menampilkan seluruh komponen bersama AKSESPASS dalam semua
            keadaannya untuk verifikasi aksesibilitas dan kepatuhan desain.
          </p>
        </section>

        {/* 1. BUTTON */}
        <section aria-labelledby="section-button" className="flex flex-col gap-4">
          <h2 id="section-button" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            1. Button & TextLink (§4A)
          </h2>
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-main">Tombol Primer</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primer Normal</Button>
              <Button variant="primary" disabled>
                Primer Nonaktif
              </Button>
              <Button variant="primary" isLoading>
                Primer Memproses
              </Button>
            </div>

            <h3 className="text-base font-bold text-main">Tombol Sekunder</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary">Sekunder Normal</Button>
              <Button variant="secondary" disabled>
                Sekunder Nonaktif
              </Button>
              <Button variant="secondary" isLoading>
                Sekunder Memproses
              </Button>
            </div>

            <h3 className="text-base font-bold text-main">TextLink</h3>
            <div className="flex flex-wrap items-center gap-4">
              <TextLink href="#section-button" standalone>
                Tautan Mandiri 1 (≥ 48×48 px)
              </TextLink>
              <TextLink href="#section-textfield" standalone>
                Tautan Mandiri 2 (ke TextField, ≥ 48×48 px)
              </TextLink>
            </div>

            <h3 className="text-base font-bold text-main">Tombol Keluar (§4A)</h3>
            <div className="flex flex-wrap items-center gap-3">
              <LogoutButton redirectTo="/masuk" />
            </div>
          </div>
        </section>

        {/* 2. TEXTFIELD */}
        <section aria-labelledby="section-textfield" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
            <h2 id="section-textfield" className="text-xl font-bold text-main">
              2. TextField (§5)
            </h2>
            <Button
              variant="secondary"
              onClick={() => setIsErrorShown((prev) => !prev)}
            >
              {isErrorShown ? "Sembunyikan Galat" : "Tampilkan Galat"}
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <TextField
              id="katalog-text-normal"
              label="Nama Lengkap Pasien"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              helperText="Tuliskan nama lengkap sesuai kartu identitas."
            />

            <TextField
              id="katalog-text-error"
              label="Nama Panggilan (Contoh Galat)"
              value="AB"
              error={isErrorShown ? "Nama panggilan minimal 3 karakter." : undefined}
              helperText="Nama yang dipanggil petugas di fasilitas."
            />

            <TextField
              id="katalog-tel"
              label="Nomor Telepon (Varian Telepon)"
              variant="tel"
              value={telVal}
              onChange={(e) => setTelVal(e.target.value)}
              helperText="Format nomor Indonesia: 08xx atau +628xx."
            />

            <TextField
              id="katalog-otp"
              label="Kode Verifikasi OTP (Varian OTP)"
              variant="otp"
              value={otpVal}
              onChange={(e) => setOtpVal(e.target.value)}
              helperText="Satu kolom 6 digit, angka saja."
            />

            <TextField
              id="katalog-textarea"
              label="Catatan Bebas Petugas (Varian Textarea)"
              variant="textarea"
              value={textareaVal}
              onChange={(e) => setTextareaVal(e.target.value)}
              maxLength={280}
              helperText="Jangan menulis diagnosis atau data sensitif."
            />
          </div>
        </section>

        {/* 3. CHOICE CHIP & GROUP */}
        <section aria-labelledby="section-chips" className="flex flex-col gap-4">
          <h2 id="section-chips" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            3. ChoiceChip & ChoiceGroup (§5)
          </h2>
          <ChoiceGroup
            legend="Pilih Kebutuhan Layanan (Checkbox Asli dalam Fieldset)"
            helperText="Pilih semua kebutuhan yang sesuai. Tekan Spasi untuk memilih."
          >
            <ChoiceChip
              id="chip-komunikasi"
              name="kebutuhan"
              value="komunikasi"
              label="Komunikasi (BISINDO / Tulisan)"
              icon={<MessageSquare className="w-5 h-5 text-icon-accent" aria-hidden="true" />}
              checked={selectedChips.komunikasi}
              onChange={(e) => toggleChip("komunikasi", e.target.checked)}
            />
            <ChoiceChip
              id="chip-penglihatan"
              name="kebutuhan"
              value="penglihatan"
              label="Penglihatan (Teks Besar)"
              icon={<Eye className="w-5 h-5 text-icon-accent" aria-hidden="true" />}
              checked={selectedChips.penglihatan}
              onChange={(e) => toggleChip("penglihatan", e.target.checked)}
            />
            <ChoiceChip
              id="chip-pendengaran"
              name="kebutuhan"
              value="pendengaran"
              label="Pendengaran (Visual Alert)"
              icon={<Volume2 className="w-5 h-5 text-icon-accent" aria-hidden="true" />}
              checked={selectedChips.pendengaran}
              onChange={(e) => toggleChip("pendengaran", e.target.checked)}
            />
            <ChoiceChip
              id="chip-mobilitas"
              name="kebutuhan"
              value="mobilitas"
              label="Mobilitas (Kursi Roda)"
              icon={<Move className="w-5 h-5 text-icon-accent" aria-hidden="true" />}
              checked={selectedChips.mobilitas}
              onChange={(e) => toggleChip("mobilitas", e.target.checked)}
            />
            <ChoiceChip
              id="chip-disabled"
              name="kebutuhan"
              value="disabled"
              label="Pilihan Nonaktif"
              disabled
              checked={false}
            />
          </ChoiceGroup>
        </section>

        {/* 4. TOGGLE */}
        <section aria-labelledby="section-toggle" className="flex flex-col gap-4">
          <h2 id="section-toggle" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            4. Toggle Switch (§5)
          </h2>
          <div className="flex flex-col gap-3">
            <Toggle
              id="katalog-toggle-active"
              label="Bagikan kebutuhan komunikasi ke petugas"
              checked={isToggleActive}
              onChange={(e) => setIsToggleActive(e.target.checked)}
            />
            <Toggle
              id="katalog-toggle-inactive"
              label="Bagikan catatan bebas ke petugas"
              checked={false}
            />
            <Toggle
              id="katalog-toggle-disabled"
              label="Fitur sedang diproses (Nonaktif)"
              checked={false}
              disabled
            />
          </div>
        </section>

        {/* 5. STATUS BANNER */}
        <section aria-labelledby="section-status" className="flex flex-col gap-4">
          <h2 id="section-status" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            5. StatusBanner (§4B, architecture §14)
          </h2>
          <div className="flex flex-col gap-3">
            <StatusBanner
              variant="success"
              title="QR Valid"
              message="Data kebutuhan layanan berhasil dibaca oleh petugas."
            />
            <StatusBanner
              variant="warning"
              title="Menunggu Sinkron"
              message="Catatan kunjungan tersimpan di perangkat lokal dan akan disinkronkan saat online."
            />
            <StatusBanner
              variant="error"
              title="QR Tidak Dapat Dipakai"
              message="Minta pasien membuat ConsentQR baru di aplikasinya."
            />
            <StatusBanner
              variant="error"
              icon="ban"
              title="Kamera Ditolak"
              message="Izin akses kamera tidak diberikan pada browser."
              action={
                <Button
                  variant="secondary"
                  onClick={() => alert("Membuka input manual")}
                  className="bg-white"
                >
                  Masukkan kode manual
                </Button>
              }
            />
          </div>
        </section>

        {/* 6. CAREPROOF SCALE */}
        <section aria-labelledby="section-careproof" className="flex flex-col gap-4">
          <h2 id="section-careproof" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            6. CareProofScale (§5, P16, D8, T9)
          </h2>
          <CareProofScale
            name="careproof-katalog"
            legend="Apakah kebutuhan akomodasi Anda terpenuhi hari ini?"
            value={careProofVal}
            onChange={(val) => setCareProofVal(val)}
          />
          <p className="text-sm font-normal text-secondary">
            Nilai terpilih saat ini: <span className="font-bold text-main">{careProofVal}</span>
          </p>
        </section>

        {/* 7. CONFIRM DIALOG */}
        <section aria-labelledby="section-dialog" className="flex flex-col gap-4">
          <h2 id="section-dialog" className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            7. ConfirmDialog (§5, P20)
          </h2>
          <div>
            <Button
              ref={dialogTriggerRef}
              variant="secondary"
              onClick={() => setIsDialogOpen(true)}
            >
              Buka Konfirmasi Cabut QR
            </Button>
            {dialogOutcome && (
              <p className="text-sm font-bold text-main mt-2">
                Hasil tindakan: {dialogOutcome}
              </p>
            )}
          </div>
          <ConfirmDialog
            isOpen={isDialogOpen}
            title="Cabut ConsentQR?"
            description="QR ini tidak akan bisa dipakai lagi oleh petugas di fasilitas kesehatan mana pun."
            confirmLabel="Ya, Cabut"
            cancelLabel="Batal"
            triggerRef={dialogTriggerRef}
            onClose={() => {
              setIsDialogOpen(false);
              setDialogOutcome("Dibatalkan (atau Esc)");
            }}
            onConfirm={() => {
              setIsDialogOpen(false);
              setDialogOutcome("Dikonfirmasi ('Ya, Cabut')");
            }}
          />
        </section>

        {/* 11. PatientNeedsSummary */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            11. PatientNeedsSummary (Pratinjau Kebutuhan Pasien)
          </h2>
          <PatientNeedsSummary
            preferredName="Pasien Contoh"
            needs={[
              {
                code: "komunikasi_bisindo",
                label: "Komunikasi dengan BISINDO",
                iconName: "Hand",
                category: "komunikasi",
              },
              {
                code: "komunikasi_tertulis",
                label: "Instruksi dan penjelasan tertulis",
                iconName: "FileText",
                category: "komunikasi",
              },
              {
                code: "antrean_visual_getar",
                label: "Panggilan giliran visual atau getar",
                iconName: "BellRing",
                category: "pendengaran",
              },
            ]}
            patientNote="Mohon panggil giliran lewat tanda visual atau tepuk bahu pelan."
          />
        </section>

        {/* 12. RadioList (Pilihan Tunggal Bertumpuk) */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-main border-b border-cyan-100 pb-2">
            12. RadioList (Pilihan Fasilitas & Masa Berlaku)
          </h2>
          <RadioList
            name="demo-facility-radio"
            legend="Pilih Fasilitas Kesehatan"
            helperText="Pilih faskes tujuan untuk membagikan data kebutuhan layanan."
            value={radioListVal}
            onChange={setRadioListVal}
            options={[
              {
                value: "faskes-1",
                label: "Puskesmas Contoh A",
                description: "Jl. Sehat No. 1, Buka 24 jam",
              },
              {
                value: "faskes-2",
                label: "Klinik Contoh B",
                description: "Jl. Melati No. 42, Buka 08:00–16:00 WIB",
              },
              {
                value: "faskes-nonaktif",
                label: "Puskesmas Cadangan (Tutup)",
                description: "Sedang renovasi",
                disabled: true,
              },
            ]}
          />
          <p className="text-sm text-secondary">
            Terpilih saat ini: <strong className="text-main">{radioListVal}</strong>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
