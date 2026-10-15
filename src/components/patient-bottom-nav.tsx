"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, History, House, QrCode, Users } from "lucide-react";

const ITEMS = [
  { href: "/pasien", label: "Beranda", Icon: House },
  { href: "/pasien/paspor", label: "Paspor", Icon: FileText },
  { href: "/pasien/akses/qr", label: "QR Akses", Icon: QrCode },
  { href: "/pasien/pendamping", label: "Pendamping", Icon: Users },
  { href: "/pasien/akses/riwayat", label: "Riwayat", Icon: History },
] as const;

/** Navigasi bawah melayang untuk pasien, gayanya sama dengan petugas, pendamping, dan admin. */
export function PatientBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi Utama Pasien"
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-cyan-800 bg-white shadow-lg"
    >
      <ul className="m-0 flex h-16 list-none items-center justify-between p-0 px-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/pasien" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                  active ? "font-bold text-cyan-700" : "text-secondary hover:text-main"
                }`}
              >
                <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
                <span className="text-[11px] leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
