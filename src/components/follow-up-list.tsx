import React from "react";
import type { OwnFollowUpItem, FollowUpStatus } from "@/lib/careproof";
import { getNeedSummaryIcon } from "./patient-needs-summary";

const STATUS_META: Record<
  FollowUpStatus,
  { label: string; hint: string }
> = {
  diterima: {
    label: "Diterima",
    hint: "Laporan Anda sudah masuk.",
  },
  ditindaklanjuti: {
    label: "Sedang Ditindaklanjuti",
    hint: "Fasilitas sedang menanggapi.",
  },
  selesai: {
    label: "Selesai",
    hint: "Tindak lanjut sudah selesai.",
  },
};

export interface FollowUpListProps {
  items: OwnFollowUpItem[];
  showFacility?: boolean;
}

/** Daftar kebutuhan yang belum terpenuhi beserta status tindak lanjut (P17). */
export function FollowUpList({ items, showFacility = false }: FollowUpListProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
      {items.map((item) => {
        const meta = STATUS_META[item.status];
        return (
          <li
            key={`${item.visitId}-${item.needCode}`}
            className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
          >
            {getNeedSummaryIcon(item.iconName)}
            <span className="break-words text-base font-bold leading-snug text-main">
              {item.needLabel}
            </span>
            <span className="text-sm font-bold text-cyan-900">Status: {meta.label}</span>
            <p className="text-sm text-secondary">
              {meta.hint}
              {showFacility ? ` ${item.facilityName}.` : ""}
            </p>
            {item.stepNote && (
              <p className="text-base text-main break-words">
                <span className="font-bold">Langkah fasilitas:</span> {item.stepNote}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
