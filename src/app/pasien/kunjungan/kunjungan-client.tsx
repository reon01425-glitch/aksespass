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
      className="flex flex-col gap-5 max-w-full w-full"
    >
      <input type="hidden" name="fasilitas" value={selectedFacilityId} />
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
      <TextField
        id="cari-fasilitas"
        label="Cari fasilitas"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        helperText="Ketik sebagian nama fasilitas untuk mempersempit daftar."
        autoComplete="off"
      />
      </div>
      {visibleFacilities.length === 0 ? (
        <p role="status" className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-6 text-center text-sm font-bold text-main">
          Tidak ada fasilitas yang cocok dengan &quot;{query.trim()}&quot;.
        </p>
      ) : (
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
      <RadioList
        name="fasilitas-radio"
        legend="Pilih Fasilitas Tujuan"
        helperText="Pilih fasilitas tempat Anda berkunjung untuk membuat ConsentQR."
        options={radioOptions}
        value={selectedFacilityId}
        onChange={setSelectedFacilityId}
      />
      </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={!selectedFacilityId || !selectedIsVisible}
          className="w-full"
        >
          Saya sudah di fasilitas
        </Button>
      </div>

      {showPatientShortcuts && (
        <section
          aria-labelledby="heading-tanpa-sinyal"
          className="flex flex-col gap-3"
        >
          <h2 id="heading-tanpa-sinyal" className="text-base font-bold text-main">
            Tanpa sinyal atau ponsel bermasalah?
          </h2>
          <div className="flex flex-col gap-3">
            {/* Berkas statis di luar rute Next.js: gunakan <a>, bukan next/link. */}
            <a
              href="/offline.html"
              className="inline-flex w-full items-center justify-center min-h-12 rounded-2xl border border-cyan-800 bg-white px-6 py-2.5 text-center font-bold text-cyan-900 hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              Pakai mode offline
            </a>
            <Link
              href="/pasien/kartu-cetak"
              className="inline-flex w-full items-center justify-center min-h-12 rounded-2xl border border-cyan-800 bg-white px-6 py-2.5 text-center font-bold text-cyan-900 hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              Tunjukkan kartu cetak
            </Link>
          </div>
        </section>
      )}
    </form>
  );
}
