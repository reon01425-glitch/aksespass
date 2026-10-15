"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer, WifiOff } from "lucide-react";
import { Button, ConfirmDialog, PageShell, StatusBanner } from "@/components";
import { formatCardCode } from "@/lib/card/format";
import type { NeedsCategoryGroup, OwnPassportData } from "@/lib/passport";
import {
  buildOfflineSummary,
  clearOfflineSummary,
  loadOfflineSummary,
  saveOfflineSummary,
  type OfflineSourceNeed,
  type OfflineSummary,
} from "@/lib/passport/offline-summary";
import type { ContrastMode, TextSize } from "@/lib/preferences";
import { formatDateTimeWib } from "@/lib/consent/time";

interface KartuCetakClientProps {
  passport: OwnPassportData | null;
  catalog: NeedsCategoryGroup[];
  /** Kode Kartu pasien (8 karakter), dicetak di kartu untuk jalur T4b. */
  cardCode: string | null;
  textSize: TextSize;
  contrast: ContrastMode;
}

/**
 * [P7] Kartu Cetak: ringkasan teks kebutuhan, TANPA QR akses. Dapat dicetak
 * (atau disimpan sebagai PDF lewat dialog cetak peramban) dan disimpan untuk
 * tampilan offline [P8].
 */
export function KartuCetakClient({
  passport,
  catalog,
  cardCode: initialCardCode,
  textSize,
  contrast,
}: KartuCetakClientProps) {
  const [cardCode, setCardCode] = useState<string | null>(initialCardCode);
  const [confirmNewCode, setConfirmNewCode] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const handleRenewCode = async () => {
    if (isRenewing) return;
    setIsRenewing(true);
    setRenewError(null);
    try {
      const res = await fetch("/api/pasien/kartu-cetak/kode", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setCardCode(data.code);
        // Ringkasan offline yang sudah tersimpan ikut memakai Kode Kartu terbaru.
        const existing = loadOfflineSummary();
        if (existing) {
          saveOfflineSummary({ ...existing, cardCode: data.code });
          setStored(loadOfflineSummary());
        }
      } else {
        setRenewError(data?.error || "Gagal membuat kode baru. Coba lagi.");
      }
    } catch {
      setRenewError("Gagal membuat kode baru. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsRenewing(false);
      setConfirmNewCode(false);
    }
  };

  const passportNeeds = useMemo<OfflineSourceNeed[]>(() => {
    const owned = new Set(passport?.needCodes ?? []);
    return catalog.flatMap((group) =>
      group.items
        .filter((item) => owned.has(item.code))
        .map((item) => ({
          code: item.code,
          label: item.label,
          categoryLabel: group.categoryLabel,
        }))
    );
  }, [catalog, passport]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(passportNeeds.map((need) => need.code))
  );
  const [includeNote, setIncludeNote] = useState(false);
  const [stored, setStored] = useState<OfflineSummary | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");

  // localStorage hanya ada di klien: dibaca setelah hidrasi.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let existing = loadOfflineSummary();
    // Ringkasan lama (sebelum Kode Kartu ikut tersimpan) dilengkapi saat halaman ini dibuka online.
    if (existing && cardCode && existing.cardCode !== cardCode) {
      if (saveOfflineSummary({ ...existing, cardCode })) existing = loadOfflineSummary();
    }
    setStored(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const note = passport?.patientNote?.trim() ?? "";
  const allSelected = selected.size === passportNeeds.length;

  const summary = useMemo(
    () =>
      buildOfflineSummary({
        preferredName: passport?.preferredName ?? "",
        needs: passportNeeds,
        note,
        selection: allSelected ? "all" : Array.from(selected),
        includeNote,
        cardCode,
        textSize,
        contrast,
        savedAt: new Date(0).toISOString(),
        syncedAt: new Date(0).toISOString(),
      }),
    [
      allSelected,
      cardCode,
      contrast,
      includeNote,
      note,
      passport?.preferredName,
      passportNeeds,
      selected,
      textSize,
    ]
  );

  const toggle = (code: string) => {
    setOfflineStatus("idle");
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSaveOffline = () => {
    const now = new Date().toISOString();
    const ok = saveOfflineSummary({
      ...summary,
      savedAt: now,
      syncedAt: now,
    });
    if (ok) {
      setStored(loadOfflineSummary());
      setOfflineStatus("saved");
    } else {
      setOfflineStatus("error");
    }
  };

  const handleClearOffline = () => {
    clearOfflineSummary();
    setStored(null);
    setOfflineStatus("idle");
  };

  if (!passport || passportNeeds.length === 0) {
    return (
      <PageShell title="Kartu Cetak" backHref="/pasien" backLabel="Kembali ke beranda" patientNav>
        <div className="flex w-full max-w-full flex-col gap-5">
          <StatusBanner
            variant="warning"
            title="Paspor belum diisi"
            message="Kartu cetak dibuat dari paspor Anda. Isi paspor dulu, lalu kembali ke sini."
          />
          <Link
            href="/pasien/paspor"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
          >
            Isi Paspor
          </Link>
        </div>
      </PageShell>
    );
  }

  const groups = catalog
    .map((group) => ({
      label: group.categoryLabel,
      needs: summary.needs.filter((n) => n.categoryLabel === group.categoryLabel),
    }))
    .filter((group) => group.needs.length > 0);

  return (
    <PageShell title="Kartu Cetak" backHref="/pasien" backLabel="Kembali ke beranda" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        <section aria-labelledby="kartu-isi" className="flex flex-col gap-3">
          <h2 id="kartu-isi" className="text-xl font-bold text-main">
            Isi Kartu
          </h2>
          <p className="text-base text-main">
            Pilih kebutuhan yang ingin dicetak. Kartu hanya memuat ringkasan
            kebutuhan, tanpa QR akses.
          </p>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">Kebutuhan yang dicetak di kartu</legend>
            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
            {passportNeeds.map((need) => {
              const checked = selected.has(need.code);
              return (
                <label
                  key={need.code}
                  htmlFor={`kartu-${need.code}`}
                  className={`flex min-h-20 min-w-0 cursor-pointer flex-col justify-center gap-1 rounded-2xl border-2 bg-white px-4 py-3 shadow-sm focus-within:ring-4 focus-within:ring-cyan-900 ${
                    checked
                      ? "border-cyan-800 text-main"
                      : "border-cyan-200 text-secondary"
                  }`}
                >
                  <input
                    id={`kartu-${need.code}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(need.code)}
                    className="peer sr-only"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                      {need.categoryLabel}
                    </span>
                    <span className={`block ${checked ? "font-bold" : ""}`}>
                      {need.label}
                    </span>
                  </span>
                </label>
              );
            })}
            </div>
          </fieldset>

          {note && (
            <label
              htmlFor="kartu-sertakan-catatan"
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-cyan-800 bg-white px-4 py-3 shadow-sm focus-within:ring-4 focus-within:ring-cyan-900"
            >
              <input
                id="kartu-sertakan-catatan"
                type="checkbox"
                checked={includeNote}
                onChange={(event) => {
                  setIncludeNote(event.target.checked);
                  setOfflineStatus("idle");
                }}
                className="mt-1 h-6 w-6 shrink-0 accent-btn-primary"
              />
              <span className="text-base text-main">
                <span className="block font-bold">Sertakan catatan pribadi</span>
                <span className="block text-sm text-secondary">
                  Kartu fisik bisa dibaca siapa pun yang memegangnya. Sertakan
                  hanya bila Anda nyaman.
                </span>
              </span>
            </label>
          )}
        </section>

        <section aria-labelledby="kartu-pratinjau" className="flex flex-col gap-3">
          <h2 id="kartu-pratinjau" className="text-xl font-bold text-main">
            Pratinjau Kartu
          </h2>

          <div
            id="kartu-cetak"
            data-testid="kartu-cetak"
            className="flex flex-col gap-3 rounded-2xl border-2 border-cyan-800 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold uppercase tracking-wider text-secondary">
              AKSESPASS · Ringkasan Kebutuhan Layanan
            </p>
            <p className="break-words text-3xl font-bold text-main">
              {summary.preferredName}
            </p>
            {groups.length === 0 ? (
              <p className="text-base text-secondary">
                Belum ada kebutuhan yang dipilih.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.needs.map((need) => (
                      <li
                        key={need.label}
                        className="rounded-lg border border-cyan-800 px-3 py-2 text-xl font-bold text-main"
                      >
                        {need.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
            {summary.note && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                  Catatan pribadi
                </p>
                <p className="break-words text-base italic text-main">
                  {summary.note}
                </p>
              </div>
            )}
            {cardCode && (
              <div className="flex flex-col gap-1 border-t border-cyan-800 pt-3">
                <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                  Kode Kartu
                </p>
                <p
                  data-testid="kode-kartu"
                  className="text-3xl font-bold tracking-widest text-main"
                >
                  {formatCardCode(cardCode)}
                </p>
                <p className="text-sm text-secondary">
                  Petugas memakai kode ini untuk mencatat kunjungan bila sinyal buruk.
                  Kode tidak berisi data Anda.
                </p>
              </div>
            )}
            <p className="border-t border-cyan-800 pt-3 text-sm text-secondary">
              Kartu ini hanya berisi ringkasan kebutuhan layanan.
              Tidak meminta diagnosis, dan tidak memuat QR akses.
              {passport.updatedAt
                ? ` Paspor diperbarui: ${formatDateTimeWib(new Date(passport.updatedAt))}.`
                : ""}
            </p>
          </div>
        </section>

        <section aria-labelledby="kartu-aksi" className="flex flex-col gap-3">
          <h2 id="kartu-aksi" className="sr-only">
            Aksi kartu
          </h2>

          {offlineStatus === "saved" && (
            <StatusBanner
              variant="success"
              title="Tersimpan untuk offline"
              message="Ringkasan ini bisa dibuka tanpa sinyal dari ikon aplikasi. Isinya ikut diperbarui saat Anda mengubah paspor dalam keadaan online."
            />
          )}
          {offlineStatus === "error" && (
            <StatusBanner
              variant="error"
              title="Tidak bisa menyimpan"
              message="Penyimpanan di perangkat ini penuh atau dinonaktifkan oleh peramban."
            />
          )}

          <Button
            onClick={() => window.print()}
            disabled={summary.needs.length === 0}
            className="w-full gap-2"
          >
            <Printer aria-hidden="true" className="h-5 w-5" />
            Cetak atau Simpan sebagai PDF
          </Button>
          <p className="text-sm text-secondary">
            Di dialog cetak, pilih printer atau &quot;Simpan sebagai PDF&quot;.
            Yang tercetak hanya kartu di atas.
          </p>

          {cardCode && (
            <div className="flex flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
              <p className="text-sm text-main">
                Kartu hilang atau terbaca orang lain? Buat Kode Kartu baru. Kode lama
                langsung tidak berlaku, dan kartu lama perlu dicetak ulang.
              </p>
              {renewError && (
                <StatusBanner variant="error" title="Gagal" message={renewError} />
              )}
              <Button
                variant="secondary"
                onClick={() => setConfirmNewCode(true)}
                disabled={isRenewing}
                className="w-full"
              >
                Buat Kode Kartu Baru
              </Button>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={handleSaveOffline}
            disabled={summary.needs.length === 0}
            className="w-full gap-2"
          >
            <WifiOff aria-hidden="true" className="h-5 w-5" />
            Simpan untuk Offline
          </Button>

          {stored && (
            <div className="flex flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
              <p className="text-sm text-main">
                Ada ringkasan offline di perangkat ini, terakhir disinkronkan{" "}
                {formatDateTimeWib(new Date(stored.syncedAt))}.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/offline.html"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-100 px-4 font-bold text-cyan-900 border border-cyan-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  Lihat tampilan offline
                </a>
                <Button variant="secondary" onClick={handleClearOffline}>
                  Hapus dari perangkat
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        isOpen={confirmNewCode}
        title="Buat Kode Kartu baru?"
        description="Kode lama langsung tidak berlaku. Cetak ulang kartu agar memuat kode yang baru."
        confirmLabel="Ya, Buat Baru"
        onClose={() => setConfirmNewCode(false)}
        onConfirm={handleRenewCode}
      />
    </PageShell>
  );
}
