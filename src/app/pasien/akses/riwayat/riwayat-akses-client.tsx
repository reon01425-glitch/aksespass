"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ConfirmDialog, StatusBanner } from "@/components";
import type { AccessHistoryEntry } from "@/lib/audit";
import type { OwnVisitHistoryItem } from "@/lib/careproof";
import { formatDateTimeWib } from "@/lib/consent/time";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FileText,
  History,
  House,
  Info,
  QrCode,
  ShieldPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

const PATIENT_NAV_ITEMS: {
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

export interface RiwayatAksesClientProps {
  initialHistory: AccessHistoryEntry[];
  initialActiveCount: number;
  availableFacilities: string[];
  initialVisits: OwnVisitHistoryItem[];
}

function getVisitAnswerLabel(visit: OwnVisitHistoryItem): string {
  if (!visit.currentAnswer) return "Belum dikonfirmasi";
  switch (visit.currentAnswer.status) {
    case "terpenuhi":
      return "Kebutuhan terpenuhi";
    case "sebagian":
      return "Sebagian kebutuhan terpenuhi";
    case "belum":
      return "Kebutuhan belum terpenuhi";
  }
}

function getVisitAnswerActor(visit: OwnVisitHistoryItem): string | null {
  if (!visit.currentAnswer) return null;
  switch (visit.currentAnswer.confirmedBy) {
    case "patient":
      return "Dikonfirmasi oleh Anda";
    case "companion":
      return "Dikonfirmasi oleh pendamping";
    case "on_site":
      return "Dikonfirmasi di tempat";
  }
}

function isWithinPeriod(
  occurredAt: string,
  periodFilter: "all" | "7d" | "30d",
  nowTimestamp: number
): boolean {
  if (periodFilter === "all") return true;
  const age = nowTimestamp - new Date(occurredAt).getTime();
  const periodMilliseconds =
    periodFilter === "7d"
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return age <= periodMilliseconds;
}

interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  id: string;
  labelId: string;
  options: FilterDropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

function FilterDropdown({
  id,
  labelId,
  options,
  value,
  onChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const openDropdown = (index = selectedIndex) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const selectOption = (option: FilterDropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (currentIndex) =>
          (currentIndex + offset + options.length) % options.length
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[activeIndex]);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-controls={`${id}-options`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-cyan-800 bg-cyan-50 py-3 pl-4 pr-4 text-left text-base text-main shadow-sm transition-colors hover:bg-white ${FOCUS_RING}`}
        id={id}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openDropdown(
              (selectedIndex +
                (event.key === "ArrowDown" ? 0 : -1) +
                options.length) %
                options.length
            );
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="min-w-0 flex-1">{selectedOption?.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-cyan-900 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-cyan-200 bg-white p-1.5 shadow-lg"
          id={`${id}-options`}
          onKeyDown={handleListboxKeyDown}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                aria-selected={isSelected}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cyan-900 ${
                  isSelected
                    ? "bg-cyan-100 font-bold text-cyan-900"
                    : "text-main hover:bg-cyan-50"
                } focus:bg-cyan-100 focus:outline-none`}
                key={option.value}
                onClick={() => selectOption(option)}
                onFocus={() => setActiveIndex(index)}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                tabIndex={activeIndex === index ? 0 : -1}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-cyan-800"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RiwayatAksesClient({
  initialHistory,
  initialActiveCount,
  availableFacilities,
  initialVisits,
}: RiwayatAksesClientProps) {
  const [history, setHistory] = useState<AccessHistoryEntry[]>(initialHistory);
  const [hasActiveQrs, setHasActiveQrs] = useState(initialActiveCount > 0);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [nowTimestamp] = useState(() => Date.now());
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d">("all");
  const [facilityFilter, setFacilityFilter] = useState("all");

  const filteredHistory = useMemo(
    () =>
      history.filter(
        (item) =>
          isWithinPeriod(item.occurredAt, periodFilter, nowTimestamp) &&
          (facilityFilter === "all" || item.facilityName === facilityFilter)
      ),
    [history, periodFilter, facilityFilter, nowTimestamp]
  );

  const filteredVisits = useMemo(
    () =>
      initialVisits.filter(
        (visit) =>
          isWithinPeriod(visit.recordedAt, periodFilter, nowTimestamp) &&
          (facilityFilter === "all" || visit.facilityName === facilityFilter)
      ),
    [initialVisits, periodFilter, facilityFilter, nowTimestamp]
  );

  const handleRevokeAll = async () => {
    if (isRevokingAll) return;
    setIsRevokingAll(true);

    try {
      const res = await fetch("/api/pasien/qr/revoke-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Gagal mencabut semua QR.");

      setHasActiveQrs(false);
      setStatusBanner({
        variant: "success",
        title: "Semua QR dicabut",
        message: "Semua ConsentQR aktif berhasil dicabut dan tidak dapat digunakan lagi.",
      });
      setIsConfirmDialogOpen(false);

      try {
        const historyRes = await fetch("/api/pasien/akses/riwayat");
        if (historyRes.ok) {
          const json = await historyRes.json();
          if (json.ok && Array.isArray(json.data)) setHistory(json.data);
        }
      } catch {
        // Riwayat akan diperbarui saat halaman dimuat kembali.
      }
    } catch {
      setStatusBanner({
        variant: "error",
        title: "Gagal mencabut QR",
        message:
          "Terjadi kesalahan saat memproses pencabutan semua QR. Silakan coba lagi.",
      });
      setIsConfirmDialogOpen(false);
    } finally {
      setIsRevokingAll(false);
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
                Riwayat Kunjungan
              </h1>
            </div>
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Riwayat akses"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
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
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${FOCUS_RING}`}
            >
              <ArrowLeft aria-hidden="true" className="h-6 w-6" />
            </Link>
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold leading-tight text-main">
                Audit Log Akses
              </h2>
            </div>
          </div>

          {statusBanner && (
            <StatusBanner
              variant={statusBanner.variant}
              title={statusBanner.title}
              message={statusBanner.message}
            />
          )}

          <section aria-labelledby="heading-kronologi">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                id="heading-kronologi"
                className="flex items-center gap-2 text-base font-bold text-main"
              >
                <History aria-hidden="true" className="h-5 w-5" />
                Kronologi Aktivitas
              </h3>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-900 shadow-sm">
                {filteredHistory.length} Aktivitas
              </span>
            </div>

            <details className="mb-4 rounded-xl border border-cyan-100 bg-white">
              <summary
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm font-bold text-main ${FOCUS_RING}`}
              >
                Filter riwayat
                <ChevronRight aria-hidden="true" className="h-5 w-5 rotate-90" />
              </summary>
              <div className="grid gap-3 border-t border-cyan-100 p-4">
                <div className="flex flex-col gap-1">
                  <label
                    id="filter-periode-label"
                    htmlFor="filter-periode"
                    className="text-sm font-bold text-secondary"
                  >
                    Periode
                  </label>
                  <FilterDropdown
                    id="filter-periode"
                    labelId="filter-periode-label"
                    options={[
                      { value: "all", label: "Semua Waktu" },
                      { value: "7d", label: "7 Hari Terakhir" },
                      { value: "30d", label: "30 Hari Terakhir" },
                    ]}
                    value={periodFilter}
                    onChange={(value) =>
                      setPeriodFilter(value as "all" | "7d" | "30d")
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    id="filter-fasilitas-label"
                    htmlFor="filter-fasilitas"
                    className="text-sm font-bold text-secondary"
                  >
                    Fasilitas
                  </label>
                  <FilterDropdown
                    id="filter-fasilitas"
                    labelId="filter-fasilitas-label"
                    options={[
                      { value: "all", label: "Semua Fasilitas" },
                      ...availableFacilities.map((facility) => ({
                        value: facility,
                        label: facility,
                      })),
                    ]}
                    value={facilityFilter}
                    onChange={setFacilityFilter}
                  />
                </div>
              </div>
            </details>

            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border border-cyan-100 bg-white p-6 text-center">
                <Info
                  aria-hidden="true"
                  className="mx-auto mb-2 h-7 w-7 text-cyan-800"
                />
                <p className="font-bold text-main">Belum ada aktivitas akses</p>
                <p className="mt-1 text-sm text-secondary">
                  {history.length === 0
                    ? "Belum ada riwayat pembukaan data atau penggunaan ConsentQR."
                    : "Tidak ada aktivitas yang cocok dengan filter yang dipilih."}
                </p>
              </div>
            ) : (
              <ol
                aria-label="Daftar kronologis aktivitas akses"
                className="flex flex-col gap-3"
              >
                {filteredHistory.map((item, index) => {
                  const wasRead = item.eventType === "profile_read";
                  const badgeLabel = wasRead
                    ? "Terbaca via ConsentQR"
                    : item.title;
                  const BadgeIcon = wasRead ? CheckCircle2 : AlertCircle;

                  return (
                    <li
                      key={item.id}
                      className="flex min-w-0 items-start gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <time
                            dateTime={item.occurredAt}
                            className="text-sm font-bold text-main"
                          >
                            {item.timeTextWib}
                          </time>
                          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-900">
                            <BadgeIcon
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0"
                            />
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-secondary">
                          {item.facilityName ? "Fasilitas Layanan" : "Aktivitas"}
                        </p>
                        <h4 className="break-words text-base font-bold text-main">
                          {item.facilityName || item.title}
                        </h4>
                        {item.actorLabel && item.actorLabel !== "Anda" && (
                          <p className="mt-2 break-words text-sm text-secondary">
                            Pelaku: {item.actorLabel}
                          </p>
                        )}
                        {item.fieldLabels.length > 0 && (
                          <div className="mt-3 rounded-xl bg-cyan-50 p-3">
                            <p className="text-xs font-bold text-secondary">
                              Data kebutuhan dibaca:
                            </p>
                            <p className="mt-1 break-words text-sm font-bold text-main">
                              {item.fieldLabels.join(", ")}
                            </p>
                          </div>
                        )}
                        {!wasRead && item.facilityName && (
                          <p className="mt-2 text-sm text-secondary">
                            {item.title}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="heading-riwayat-kunjungan">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                id="heading-riwayat-kunjungan"
                className="flex items-center gap-2 text-base font-bold text-main"
              >
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                Kunjungan Tercatat
              </h3>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-900 shadow-sm">
                {filteredVisits.length}
              </span>
            </div>

            {filteredVisits.length === 0 ? (
              <div className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm text-secondary">
                {initialVisits.length === 0
                  ? "Belum ada kunjungan tercatat."
                  : "Tidak ada kunjungan yang cocok dengan filter yang dipilih."}
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {filteredVisits.map((visit) => (
                  <li
                    key={visit.visitId}
                    className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                          Fasilitas Layanan
                        </p>
                        <h4 className="break-words text-base font-bold text-main">
                          {visit.facilityName}
                        </h4>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-900">
                        {visit.currentAnswer ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        ) : (
                          <AlertCircle
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        )}
                        {getVisitAnswerLabel(visit)}
                      </span>
                    </div>
                    <time
                      dateTime={visit.recordedAt}
                      className="mt-2 block text-sm text-secondary"
                    >
                      {formatDateTimeWib(new Date(visit.recordedAt))}
                    </time>
                    {visit.currentAnswer && (
                      <p className="mt-1 text-sm text-secondary">
                        {getVisitAnswerActor(visit)}
                      </p>
                    )}
                    {visit.assistance.length > 0 && (
                      <p className="mt-2 line-clamp-2 break-words text-sm text-secondary">
                        Bantuan:{" "}
                        {visit.assistance.map((item) => item.actionText).join(", ")}
                      </p>
                    )}
                    <Link
                      href={`/pasien/kunjungan/riwayat/${encodeURIComponent(visit.visitId)}`}
                      className={`mt-3 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 font-bold text-cyan-900 underline ${FOCUS_RING}`}
                    >
                      Lihat detail kunjungan
                      <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="heading-kendali-qr"
            className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-5 text-center shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
              <QrCode aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <h3 id="heading-kendali-qr" className="font-bold text-main">
                Pusat Kendali Otoritas Pasien
              </h3>
              <p className="mt-1 text-sm text-secondary">
                Jika Anda melihat akses yang tidak dikenali, Anda dapat
                mencabut QR aktif kapan saja.
              </p>
            </div>
            <Link
              href="/pasien/kunjungan"
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-100 px-4 py-3 text-center font-bold text-cyan-900 ${FOCUS_RING}`}
            >
              <QrCode aria-hidden="true" className="h-5 w-5 shrink-0" />
              Buat ConsentQR Baru
            </Link>
            {hasActiveQrs && (
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={isRevokingAll}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-700 px-4 py-3 font-bold text-cyan-900 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
              >
                Cabut Semua QR Aktif
              </button>
            )}
          </section>
        </main>

        <nav
          aria-label="Navigasi utama pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-cyan-200 bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {PATIENT_NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              const isActive = href === "/pasien/akses/riwayat";
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg ${FOCUS_RING} ${
                      isActive
                        ? "font-bold text-cyan-700"
                        : "text-secondary hover:text-main"
                    }`}
                  >
                    {emphasis ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-white shadow-sm">
                        <Icon aria-hidden="true" className="h-6 w-6" />
                      </span>
                    ) : (
                      <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
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
        isOpen={isConfirmDialogOpen}
        title="Cabut semua QR aktif?"
        description="Semua QR tidak bisa dipakai lagi."
        confirmLabel="Ya, Cabut Semua"
        cancelLabel="Batal"
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleRevokeAll}
      />
    </div>
  );
}
