"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FilePen } from "lucide-react";
import { isPassportDraftEmpty, loadPassportDraft } from "@/lib/passport/draft";

export interface PassportDraftBannerProps {
  ownerId: string;
}

/**
 * [P4] Banner "Lanjutkan draft paspor". Draft ada di perangkat ini saja,
 * jadi keberadaannya hanya bisa diketahui di sisi klien.
 */
export function PassportDraftBanner({ ownerId }: PassportDraftBannerProps) {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draft = loadPassportDraft(ownerId);
    // localStorage hanya ada di klien: dibaca setelah hidrasi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDraft(Boolean(draft && !isPassportDraftEmpty(draft)));
  }, [ownerId]);

  if (!hasDraft) return null;

  return (
    <Link
      href="/pasien/paspor"
      className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-cyan-700 bg-cyan-100 p-4 text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
    >
      <FilePen aria-hidden="true" className="h-6 w-6 shrink-0 text-cyan-900" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">Lanjutkan draft paspor</span>
        <span className="text-sm text-secondary">
          Ada isian yang belum disimpan di perangkat ini.
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" />
    </Link>
  );
}
