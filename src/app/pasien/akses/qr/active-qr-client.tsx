"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ConfirmDialog, StatusBanner } from "@/components";
import { TampilkanQr } from "./tampilkan-qr";
import type { ActiveQrItem } from "@/lib/consent";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  History,
  House,
  QrCode,
  ShieldCheck,
  ShieldPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

const NAV_ITEMS: {
  href: string;
  label: string;
  Icon: LucideIcon;
  emphasis?: boolean;
}[] = [
  { href: "/pasien", label: "Beranda", Icon: House },
  { href: "/pasien/paspor", label: "Paspor", Icon: FileText },
  { href: "/pasien/akses/qr", label: "QR Akses", Icon: QrCode, emphasis: true },
  { href: "/pasien/pendamping", label: "Pendamping", Icon: Users },
  { href: "/pasien/akses/riwayat", label: "Riwayat", Icon: History },
];

export interface ActiveQrClientProps {
  initialQrs: ActiveQrItem[];
}

export function ActiveQrClient({ initialQrs }: ActiveQrClientProps) {
  const [qrs, setQrs] = useState<ActiveQrItem[]>(initialQrs);
  const [confirmTarget, setConfirmTarget] = useState<ActiveQrItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  // id QR terbaru per baris setelah "Tampilkan QR" (baris tetap, id server berganti).
  const [currentIds, setCurrentIds] = useState<Record<string, string>>({});

  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const handleRevoke = async () => {
    if (!confirmTarget || isRevoking) return;
    setIsRevoking(true);

    try {
      const res = await fetch(`/api/pasien/qr/${currentIds[confirmTarget.id] ?? confirmTarget.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mencabut QR.");
      }

      setQrs((prev) => prev.filter((item) => item.id !== confirmTarget.id));
      setStatusMessage({
        title: "QR dicabut",
        message: "ConsentQR telah dicabut dan tidak dapat digunakan lagi.",
      });
      setConfirmTarget(null);

      setTimeout(() => {
        listHeadingRef.current?.focus();
      }, 50);
    } catch {
      setStatusMessage({
        title: "Gagal mencabut QR",
        message: "Terjadi kesalahan saat mencabut QR. Silakan coba lagi.",
      });
      setConfirmTarget(null);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-page text-main">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-200 text-cyan-900"
            >
              <ShieldPlus className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                AKSESPASS Pasien
              </span>
              <h1 className="truncate text-xl font-bold leading-7 text-main">
                QR Akses
              </h1>
            </div>
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Riwayat akses"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main ${FOCUS_RING}`}
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white ${FOCUS_RING}`}
            >
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex w-full flex-1 flex-col gap-5 px-4 pb-28 pt-24 focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/pasien/akses"
              aria-label="Kembali ke kontrol akses"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-main ${FOCUS_RING}`}
            >
              <ArrowLeft aria-hidden="true" className="h-6 w-6" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm text-secondary">Akses Darurat &amp; Pemeriksaan</p>
              <h2 className="text-xl font-bold leading-tight text-main">
                ConsentQR Pasien
              </h2>
            </div>
          </div>

          {statusMessage && (
            <StatusBanner
              variant={statusMessage.title.includes("Gagal") ? "error" : "success"}
              title={statusMessage.title}
              message={statusMessage.message}
            />
          )}

          <section
            aria-label="Status ConsentQR"
            className={`flex gap-3 rounded-2xl border p-4 ${
              qrs.length > 0
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                qrs.length > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {qrs.length > 0 ? (
                <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
              ) : (
                <AlertCircle aria-hidden="true" className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-main">
                  {qrs.length > 0 ? "QR Valid & Aman" : "Belum ada QR aktif"}
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    qrs.length > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {qrs.length > 0
                    ? `${qrs.length} AKTIF`
                    : "TIDAK AKTIF"}
                </span>
              </div>
              <p className="mt-1 text-sm text-secondary">
                ConsentQR berisi token acak dan tidak menyimpan rekam medis
                langsung pada kode.
              </p>
            </div>
          </section>

          {qrs.length === 0 ? (
            <section className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-900">
                  <QrCode aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-main">
                    Tidak ada ConsentQR yang berlaku
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    Buat QR saat Anda siap membagikan kebutuhan layanan kepada
                    petugas.
                  </p>
                </div>
              </div>
              <Link
                href="/pasien/kunjungan"
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-cyan-800 ${FOCUS_RING}`}
              >
                <QrCode aria-hidden="true" className="h-5 w-5" />
                Buat ConsentQR
              </Link>
            </section>
          ) : (
            <section aria-labelledby="heading-qr-aktif">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  ref={listHeadingRef}
                  id="heading-qr-aktif"
                  tabIndex={-1}
                  className="text-lg font-bold text-main focus:outline-none"
                >
                  Daftar QR Aktif
                </h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-cyan-900 shadow-sm">
                  {qrs.length} QR
                </span>
              </div>
              <ul
                aria-label="Daftar ConsentQR Aktif"
                className="flex flex-col gap-4"
              >
                {qrs.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-wide text-secondary">
                        <ShieldCheck
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 text-cyan-800"
                        />
                        Akses medis resmi
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        Aktif
                      </span>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
                        <QrCode aria-hidden="true" className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-secondary">
                          Fasilitas layanan
                        </p>
                        <h3 className="break-words text-base font-bold text-main">
                          {item.facilityName}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-cyan-100 pt-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                        Data yang dibagikan
                      </span>
                      <p className="break-words text-sm text-main">
                        {item.sharedFieldLabels.length > 0
                          ? item.sharedFieldLabels.join(", ")
                          : "Nama panggilan saja"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-100 pt-3">
                      <span className="flex items-center gap-2 text-sm font-bold text-secondary">
                        <Clock3
                          aria-hidden="true"
                          className="h-5 w-5 text-cyan-800"
                        />
                        Kedaluwarsa otomatis
                      </span>
                      <span className="text-sm font-bold text-main">
                        {item.remainingTimeText}
                      </span>
                    </div>
                    <p className="text-sm text-secondary">{item.expiryText}</p>

                    <TampilkanQr
                      qrId={currentIds[item.id] ?? item.id}
                      facilityName={item.facilityName}
                      onReplaced={(newId) =>
                        setCurrentIds((prev) => ({ ...prev, [item.id]: newId }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmTarget(item)}
                      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-800 ${FOCUS_RING}`}
                    >
                      <AlertCircle aria-hidden="true" className="h-5 w-5" />
                      Cabut Akses QR Sekarang
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {qrs.length > 0 && (
            <Link
              href="/pasien/kunjungan"
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-cyan-800 ${FOCUS_RING}`}
            >
              <QrCode aria-hidden="true" className="h-5 w-5" />
              Buat QR Baru
            </Link>
          )}

          <Link
            href="/pasien/akses/riwayat"
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-1 text-sm font-bold text-cyan-900 underline underline-offset-2 ${FOCUS_RING}`}
          >
            Lihat riwayat akses
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </main>

        <nav
          aria-label="Navigasi Utama Pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-cyan-200 bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              const isActive = href === "/pasien/akses/qr";
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg ${FOCUS_RING} ${
                      isActive
                        ? "font-bold text-cyan-900"
                        : "text-secondary hover:text-main"
                    }`}
                  >
                    {emphasis ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-white shadow-sm">
                        <Icon aria-hidden="true" className="h-6 w-6" />
                      </span>
                    ) : (
                      <Icon
                        aria-hidden="true"
                        className="h-[22px] w-[22px]"
                      />
                    )}
                    <span className="text-[11px] leading-tight">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        title="Cabut QR ini?"
        description="QR ini tidak akan bisa dipakai lagi."
        confirmLabel="Ya, Cabut"
        cancelLabel="Batal"
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
