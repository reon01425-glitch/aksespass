"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LogOut, UserPlus } from "lucide-react";
import { performLogout } from "./logout-button";

const ITEMS = [
  { href: "/pendamping", label: "Beranda", Icon: House },
  { href: "/pendamping/tautkan", label: "Tautkan", Icon: UserPlus },
] as const;

const ITEM_BASE =
  "flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

/** Navigasi bawah melayang untuk alur pendamping, gayanya sama dengan navigasi pasien. */
export function CompanionBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu pendamping"
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-cyan-800 bg-white shadow-lg"
    >
      <ul className="m-0 flex h-16 list-none items-center justify-between p-0 px-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_BASE} ${
                  active ? "font-bold text-cyan-700" : "text-secondary hover:text-main"
                }`}
              >
                <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
                <span className="text-[11px] leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => void performLogout("/masuk")}
            className={`${ITEM_BASE} w-full text-secondary hover:text-main`}
          >
            <LogOut aria-hidden="true" className="h-[22px] w-[22px]" />
            <span className="text-[11px] leading-tight">Keluar</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
