"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, ShieldPlus, UserRound } from "lucide-react";

/** Tujuan ikon notifikasi dan profil per peran, ditentukan dari awalan alamat halaman. */
function roleLinks(pathname: string): { bell: string; profile: string } | null {
  if (pathname.startsWith("/pasien")) return { bell: "/pasien/akses/riwayat", profile: "/pasien/akun" };
  if (pathname.startsWith("/pendamping")) return { bell: "/pendamping", profile: "/pendamping" };
  if (pathname.startsWith("/petugas")) return { bell: "/petugas", profile: "/petugas" };
  if (pathname.startsWith("/admin")) return { bell: "/admin/tindak-lanjut", profile: "/admin" };
  return null;
}

export interface AppHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  titleTabIndex?: number;
}

/** Header putih seragam untuk semua peran: tombol kembali, logo, label AKSESPASS, dan judul halaman. */
export function AppHeader({
  title,
  backHref,
  backLabel = "Kembali",
  titleRef,
  titleTabIndex,
}: AppHeaderProps) {
  const links = roleLinks(usePathname() ?? "");
  const ICON =
    "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-100 bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-main hover:bg-cyan-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
          >
            <ArrowLeft aria-hidden="true" className="h-6 w-6" />
          </Link>
        )}
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-200 text-cyan-900"
        >
          <ShieldPlus className="h-6 w-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-secondary">
            AKSESPASS
          </span>
          <h1
            ref={titleRef}
            tabIndex={titleTabIndex}
            className="min-w-0 break-words text-xl! font-bold leading-7! text-main focus:outline-none"
          >
            {title}
          </h1>
        </div>
        {links && (
          <>
            <Link href={links.bell} aria-label="Notifikasi" className={`${ICON} text-main hover:bg-cyan-100`}>
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link href={links.profile} aria-label="Akun saya" className={`${ICON} bg-cyan-800 text-white hover:bg-cyan-900`}>
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
