import React from "react";
import { CheckCircle2, Clock, Inbox } from "lucide-react";
import type { OwnFollowUpItem, FollowUpStatus } from "@/lib/careproof";
import { getNeedSummaryIcon } from "./patient-needs-summary";

const STATUS_META: Record<
  FollowUpStatus,
  { label: string; Icon: typeof Inbox; hint: string }
> = {
  diterima: {
    label: "Diterima",
    Icon: Inbox,
    hint: "Laporan Anda sudah masuk.",
  },
  ditindaklanjuti: {
    label: "Sedang Ditindaklanjuti",
    Icon: Clock,
    hint: "Fasilitas sedang menanggapi.",
  },
  selesai: {
    label: "Selesai",
    Icon: CheckCircle2,
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
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const meta = STATUS_META[item.status];
        const Icon = meta.Icon;
        return (
          <li
            key={`${item.visitId}-${item.needCode}`}
            className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-cyan-700"
          >
            <div className="flex items-center gap-3">
              {getNeedSummaryIcon(item.iconName)}
              <span className="text-base font-bold text-main break-words flex-1">
                {item.needLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-900">
              <Icon aria-hidden="true" className="w-5 h-5 shrink-0" />
              <span>Status: {meta.label}</span>
            </div>
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
