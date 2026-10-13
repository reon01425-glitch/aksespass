"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, RadioList } from "@/components";
import type { FacilityOption } from "@/lib/facility";

export interface KunjunganClientProps {
  facilities: FacilityOption[];
  targetUrlPrefix?: string;
}

export function KunjunganClient({
  facilities,
  targetUrlPrefix = "/pasien/kunjungan/qr",
}: KunjunganClientProps) {
  const router = useRouter();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    facilities[0]?.id ?? ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId) return;
    router.push(`${targetUrlPrefix}?fasilitas=${encodeURIComponent(selectedFacilityId)}`);
  };

  const radioOptions = facilities.map((f) => ({
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
      <RadioList
        name="fasilitas-radio"
        legend="Pilih Fasilitas Tujuan"
        helperText="Pilih fasilitas tempat Anda berkunjung untuk membuat ConsentQR."
        options={radioOptions}
        value={selectedFacilityId}
        onChange={setSelectedFacilityId}
      />

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          disabled={!selectedFacilityId}
          className="w-full sm:w-auto"
        >
          Saya sudah di fasilitas
        </Button>
      </div>
    </form>
  );
}
