"use client";

import React from "react";
import { renderRuleIcon } from "./petugas-pindai-flow";

/** Pratinjau saran seperti yang dilihat petugas di T6: ikon, teks besar, lalu sumber. */
export function RulePreview({
  iconName,
  actionText,
  rationale,
}: {
  iconName: string;
  actionText: string;
  rationale?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cyan-800 bg-white p-4">
      <span aria-hidden="true" className="mt-0.5">
        {renderRuleIcon(iconName)}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="break-words text-base font-bold text-main">{actionText || "Saran tindakan belum diisi"}</span>
        {rationale && <span className="break-words text-sm text-secondary">Sumber: {rationale}</span>}
      </div>
    </div>
  );
}
