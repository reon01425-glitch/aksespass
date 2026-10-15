import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface HeroCardProps {
  Icon: LucideIcon;
  title: string;
  description?: string;
  /** Bila diisi, kartu menjadi tautan. */
  href?: string;
  /** Teks kecil tambahan di bawah deskripsi. */
  note?: string;
  className?: string;
}

const BASE =
  "flex w-full flex-col gap-3 rounded-2xl bg-cyan-700 p-5 text-white shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2";

/**
 * Kartu teal utama di beranda setiap peran: ubin ikon putih, judul besar,
 * lalu keterangan kecil. Gayanya sama dengan kartu "Pindai ConsentQR" petugas.
 */
export function HeroCard({ Icon, title, description, href, note, className = "" }: HeroCardProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-white"
      >
        <Icon className="h-8 w-8 text-cyan-800" />
      </span>
      <span className="text-lg font-bold text-white">{title}</span>
      {description && <span className="text-sm text-white">{description}</span>}
      {note && <span className="text-sm text-white">{note}</span>}
    </>
  );
  const cls = `${BASE} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={`${cls} transition-colors hover:bg-cyan-800`}>
        {body}
      </Link>
    );
  }
  return <section className={cls}>{body}</section>;
}
