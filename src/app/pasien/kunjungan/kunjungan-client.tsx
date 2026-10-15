"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, RadioList, TextField } from "@/components";
import type { FacilityOption } from "@/lib/facility";

export interface KunjunganClientProps {
  facilities: FacilityOption[];
  targetUrlPrefix?: string;
  /** Tombol "Pakai mode offline" (P8) dan "Tunjukkan kartu cetak" (P7). Hanya untuk pasien. */
  showPatientShortcuts?: boolean;
}

export function KunjunganClient({
  facilities,
  targetUrlPrefix = "/pasien/kunjungan/qr",
  showPatientShortcuts = false,
}: KunjunganClientProps) {
  const router = useRouter();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    facilities[0]?.id ?? ""
  );

  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleFacilities = normalizedQuery
    ? facilities.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
    : facilities;
  const selectedIsVisible = visibleFacilities.some(
    (f) => f.id === selectedFacilityId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !selectedIsVisible) return;
    router.push(`${targetUrlPrefix}?fasilitas=${encodeURIComponent(selectedFacilityId)}`);
  };

  const radioOptions = visibleFacilities.map((f) => ({
    value: f.id,
    label: f.name,
    description: "Fasilitas kesehatan aktif",
  }));

  return (
    <form
      method="GET"
      action={targetUrlPrefix}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 max-w-full w-full"
    >
      <input type="hidden" name="fasilitas" value={selectedFacilityId} />
      <TextField
        id="cari-fasilitas"
        label="Cari fasilitas"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        helperText="Ketik sebagian nama fasilitas untuk mempersempit daftar."
        autoComplete="off"
      />
      {visibleFacilities.length === 0 ? (
        <p role="status" className="text-base text-main">
          Tidak ada fasilitas yang cocok dengan &quot;{query.trim()}&quot;.
        </p>
      ) : (
      <RadioList
        name="fasilitas-radio"
        legend="Pilih Fasilitas Tujuan"
        helperText="Pilih fasilitas tempat Anda berkunjung untuk membuat ConsentQR."
        options={radioOptions}
        value={selectedFacilityId}
        onChange={setSelectedFacilityId}
      />
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          disabled={!selectedFacilityId || !selectedIsVisible}
          className="w-full sm:w-auto"
        >
          Saya sudah di fasilitas
        </Button>
      </div>

      {showPatientShortcuts && (
        <section
          aria-labelledby="heading-tanpa-sinyal"
          className="flex flex-col gap-3 border-t border-cyan-100 pt-6"
        >
          <h2 id="heading-tanpa-sinyal" className="text-base font-bold text-main">
            Tanpa sinyal atau ponsel bermasalah?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Berkas statis di luar rute Next.js: gunakan <a>, bukan next/link. */}
            <a
              href="/offline.html"
              className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900 text-center w-full sm:w-auto"
            >
              Pakai mode offline
            </a>
            <Link
              href="/pasien/kartu-cetak"
              className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900 text-center w-full sm:w-auto"
            >
              Tunjukkan kartu cetak
            </Link>
          </div>
        </section>
      )}
    </form>
  );
}
