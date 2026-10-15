"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Printer, WifiOff } from "lucide-react";
import { Button, PageShell, StatusBanner } from "@/components";
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
  textSize,
  contrast,
}: KartuCetakClientProps) {
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
    setStored(loadOfflineSummary());
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
        textSize,
        contrast,
        savedAt: new Date(0).toISOString(),
        syncedAt: new Date(0).toISOString(),
      }),
    [
      allSelected,
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
      <PageShell title="Kartu Cetak" backHref="/pasien" backLabel="Kembali ke beranda">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
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
    <PageShell title="Kartu Cetak" backHref="/pasien" backLabel="Kembali ke beranda">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <section aria-labelledby="kartu-isi" className="flex flex-col gap-3">
          <h2 id="kartu-isi" className="text-xl font-bold text-main">
            Isi Kartu
          </h2>
          <p className="text-base text-main">
            Pilih kebutuhan yang ingin dicetak. Kartu hanya memuat ringkasan
            kebutuhan, tanpa QR akses.
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Kebutuhan yang dicetak di kartu</legend>
            {passportNeeds.map((need) => {
              const checked = selected.has(need.code);
              return (
                <label
                  key={need.code}
                  htmlFor={`kartu-${need.code}`}
                  className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 focus-within:ring-4 focus-within:ring-cyan-900 ${
                    checked
                      ? "border-cyan-700 bg-cyan-100 text-main"
                      : "border-cyan-400 bg-white text-secondary"
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
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      checked ? "bg-cyan-700 text-white" : "bg-cyan-100 text-transparent"
                    }`}
                  >
                    {checked && <Check className="h-5 w-5" />}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {note && (
            <label
              htmlFor="kartu-sertakan-catatan"
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-cyan-800 bg-white px-4 py-3 focus-within:ring-4 focus-within:ring-cyan-900"
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
            className="flex flex-col gap-3 rounded-2xl border-2 border-cyan-800 bg-white p-5"
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
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-decorative bg-surface p-4">
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
    </PageShell>
  );
}
