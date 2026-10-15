"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, House, TriangleAlert, Users } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Beranda", Icon: House },
  { href: "/admin/petugas", label: "Petugas", Icon: Users },
  { href: "/admin/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/admin/belum-terpenuhi", label: "Kebutuhan", Icon: TriangleAlert },
  { href: "/admin/tindak-lanjut", label: "Tindak Lanjut", Icon: ClipboardList },
] as const;

/** Navigasi bawah melayang untuk admin fasilitas, gayanya sama dengan petugas dan pasien. */
export function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu admin"
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-cyan-800 bg-white shadow-lg"
    >
      <ul className="m-0 flex h-16 list-none items-center justify-between p-0 px-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
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
