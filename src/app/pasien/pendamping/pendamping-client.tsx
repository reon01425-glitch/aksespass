"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  StatusBanner,
} from "@/components";
import type { PatientCompanionItem } from "@/lib/companions";
import { formatDateTimeWib } from "@/lib/consent/time";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  History,
  House,
  QrCode,
  ShieldCheck,
  UserRound,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Copy,
  Check,
  ShieldPlus,
} from "lucide-react";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

const PATIENT_NAV_ITEMS = [
  { href: "/pasien", label: "Beranda", Icon: House },
  { href: "/pasien/paspor", label: "Paspor", Icon: FileText },
  { href: "/pasien/akses/qr", label: "QR Akses", Icon: QrCode, emphasis: true },
  { href: "/pasien/pendamping", label: "Pendamping", Icon: Users },
  { href: "/pasien/akses/riwayat", label: "Riwayat", Icon: History },
];

export interface PendampingClientProps {
  initialCompanions: PatientCompanionItem[];
}

export function PendampingClient({
  initialCompanions,
}: PendampingClientProps) {
  const router = useRouter();
  const [companions, setCompanions] =
    useState<PatientCompanionItem[]>(initialCompanions);

  // State pembuatan kode baru
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    formattedCode: string;
    expiresAt: string;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // State dialog konfirmasi cabut tautan
  const [companionToRevoke, setCompanionToRevoke] =
    useState<PatientCompanionItem | null>(null);

  // State pemrosesan aksi
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setCodeError(null);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/pasien/pendamping/kode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal membuat kode tautan.");
      }
      setGeneratedCode({
        code: data.code,
        formattedCode: data.formattedCode,
        expiresAt: data.expiresAt,
      });
    } catch (err: unknown) {
      setCodeError(
        err instanceof Error ? err.message : "Gagal membuat kode tautan."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode.formattedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback bila clipboard API ditolak
    }
  };

  const handleApprove = async (companion: PatientCompanionItem) => {
    setActionLoadingId(companion.id);
    setBannerMessage(null);
    try {
      const res = await fetch(
        `/api/pasien/pendamping/${companion.id}/approve`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyetujui tautan.");
      }
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === companion.id
            ? { ...c, status: "active", approvedAt: new Date().toISOString() }
            : c
        )
      );
      setBannerMessage({
        type: "success",
        message: `Tautan dengan ${companion.displayName} berhasil disetujui.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setBannerMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal menyetujui tautan.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (companion: PatientCompanionItem) => {
    setActionLoadingId(companion.id);
    setBannerMessage(null);
    try {
      const res = await fetch(
        `/api/pasien/pendamping/${companion.id}/reject`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menolak tautan.");
      }
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === companion.id
            ? { ...c, status: "revoked", revokedAt: new Date().toISOString() }
            : c
        )
      );
      setBannerMessage({
        type: "success",
        message: `Permintaan dari ${companion.displayName} telah ditolak.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setBannerMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal menolak tautan.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!companionToRevoke) return;
    setBannerMessage(null);
    try {
      const res = await fetch(
        `/api/pasien/pendamping/${companionToRevoke.id}/revoke`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal mencabut tautan.");
      }
      const revokedName = companionToRevoke.displayName;
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === companionToRevoke.id
            ? { ...c, status: "revoked", revokedAt: new Date().toISOString() }
            : c
        )
      );
      setCompanionToRevoke(null);
      setBannerMessage({
        type: "success",
        message: `Tautan dengan ${revokedName} berhasil dicabut. Pendamping kehilangan akses seketika.`,
      });
      router.refresh();
    } catch (err: unknown) {
      setBannerMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal mencabut tautan.",
      });
    }
  };

  const pendingList = companions.filter((c) => c.status === "pending");
  const activeList = companions.filter((c) => c.status === "active");
  const revokedList = companions.filter((c) => c.status === "revoked");

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
                Pendamping
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
          className="flex w-full flex-1 flex-col gap-4 px-4 pb-28 pt-24 focus:outline-none"
        >
        {/* Banner Pesan Aksi */}
        {bannerMessage && (
          <StatusBanner
            variant={bannerMessage.type === "success" ? "success" : "error"}
            title={
              bannerMessage.type === "success" ? "Berhasil" : "Terjadi Kesalahan"
            }
            message={bannerMessage.message}
          />
        )}

        <section
          aria-label="Dukungan akses terpercaya"
          className="relative flex min-h-32 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-700 p-4 text-white shadow-sm"
        >
          <div
            aria-hidden="true"
            className="absolute -right-5 -top-8 h-36 w-36 rounded-full border-[18px] border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute right-12 top-7 h-16 w-16 rounded-full bg-cyan-100/10"
          />
          <div className="relative flex items-center gap-2">
            <Users aria-hidden="true" className="h-6 w-6 shrink-0" />
            <h2 className="text-lg font-bold leading-tight">
              Dukungan Akses Terpercaya
            </h2>
          </div>
          <p className="relative mt-1 text-sm text-cyan-50">
            Anda mengatur siapa yang dapat membantu mengelola layanan.
          </p>
        </section>

        {/* Tombol Buat Kode Tautan */}
        <section aria-labelledby="heading-tambah-pendamping">
          <h2 id="heading-tambah-pendamping" className="sr-only">
            Tambah Pendamping
          </h2>

          {!generatedCode ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={handleGenerateCode}
                isLoading={isGenerating}
                className="w-full text-base"
              >
                <UserPlus className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                Tautkan Pendamping Baru
              </Button>
              {codeError && (
                <StatusBanner
                  variant="error"
                  title="Gagal Membuat Kode"
                  message={codeError}
                />
              )}
            </div>
          ) : (
            <div
              className="flex flex-col gap-4 rounded-2xl border-2 border-cyan-800 bg-white p-5 text-center shadow-sm"
              aria-live="polite"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-cyan-900 uppercase tracking-wider">
                  Kode Tautan Pendamping
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-bold text-main tracking-widest break-all my-2 select-all">
                  {generatedCode.formattedCode}
                </span>
                <span className="text-sm font-bold text-cyan-900">
                  Berlaku 10 menit
                </span>
              </div>

              <p className="text-base text-main">
                Berikan kode ini kepada pendamping Anda. Pendamping dapat
                memasukkan kode ini di akun mereka untuk mengajukan tautan.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCopyCode}
                  className="w-full sm:flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2 text-cyan-800" aria-hidden="true" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" aria-hidden="true" />
                      Salin Kode
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setGeneratedCode(null)}
                  className="w-full sm:flex-1"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Permintaan Menunggu Persetujuan */}
        {pendingList.length > 0 && (
          <section aria-labelledby="heading-pending">
            <h2
              id="heading-pending"
              className="mb-3 flex items-center gap-2 text-lg font-bold text-main"
            >
              <Clock className="w-5 h-5 text-cyan-800 shrink-0" aria-hidden="true" />
              Menunggu Persetujuan ({pendingList.length})
            </h2>

            <div className="flex flex-col gap-3">
              {pendingList.map((comp) => {
                const isLoading = actionLoadingId === comp.id;
                return (
                  <div
                    key={comp.id}
                    className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-main">
                        {comp.displayName}
                      </span>
                      <span className="text-sm text-secondary">
                        Mengajukan tautan pada{" "}
                        {formatDateTimeWib(new Date(comp.requestedAt))}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(comp)}
                        isLoading={isLoading}
                        disabled={isLoading}
                        aria-label={`Setujui permintaan dari ${comp.displayName}`}
                        className="flex-1 sm:flex-none"
                      >
                        <UserCheck className="w-5 h-5 mr-1" aria-hidden="true" />
                        Setujui
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleReject(comp)}
                        isLoading={isLoading}
                        disabled={isLoading}
                        aria-label={`Tolak permintaan dari ${comp.displayName}`}
                        className="flex-1 sm:flex-none"
                      >
                        <XCircle className="w-5 h-5 mr-1" aria-hidden="true" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pendamping Aktif */}
        <section aria-labelledby="heading-active">
          <h2
            id="heading-active"
            className="mb-3 flex items-center justify-between gap-2 text-base font-bold text-main"
          >
            <span className="flex items-center gap-2">
              Pendamping Aktif
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-900">
                {activeList.length}
              </span>
            </span>
            <span className="shrink-0 text-xs font-normal text-secondary">
              Status Tertaut
            </span>
          </h2>

          {activeList.length === 0 ? (
            <div className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm text-secondary shadow-sm">
              <CheckCircle2
                aria-hidden="true"
                className="mb-2 h-6 w-6 text-cyan-800"
              />
              Belum ada pendamping aktif. Tautkan pendamping untuk memberi
              akses sesuai kebutuhan Anda.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeList.map((comp) => (
                <div
                  key={comp.id}
                  className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-base font-bold text-cyan-900"
                    >
                      {comp.displayName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="break-words text-base font-bold text-main">
                        {comp.displayName}
                      </span>
                      <span className="text-sm text-secondary">
                        Tertaut sejak{" "}
                        {comp.approvedAt
                          ? formatDateTimeWib(new Date(comp.approvedAt))
                          : "sebelumnya"}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-100 px-2 py-1 text-xs font-bold text-cyan-900">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Aktif
                    </span>
                  </div>

                  <div className="rounded-xl bg-cyan-50 p-3">
                    <div className="flex items-start gap-2 text-sm text-main">
                      <ShieldCheck
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-800"
                      />
                      <span>
                        Dapat membantu melihat paspor kebutuhan, membuat QR
                        akses, dan mengonfirmasi kunjungan.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCompanionToRevoke(comp)}
                    aria-label={`Cabut akses pendamping ${comp.displayName}`}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-cyan-700 bg-surface px-4 py-2.5 text-center font-bold text-cyan-900 hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                  >
                    <XCircle
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                    />
                    Cabut Akses Pendamping
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Riwayat Tautan yang Berakhir (Opsional/Informasi) */}
        {revokedList.length > 0 && (
          <section aria-labelledby="heading-revoked" className="opacity-75">
            <h2
              id="heading-revoked"
              className="mb-3 flex items-center gap-2 text-base font-bold text-secondary"
            >
              <XCircle className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
              Tautan Berakhir ({revokedList.length})
            </h2>

            <div className="flex flex-col gap-2">
              {revokedList.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-cyan-200 bg-white p-3 text-sm"
                >
                  <span className="font-bold text-secondary">
                    {comp.displayName}
                  </span>
                  <span className="text-xs text-secondary">
                    Dicabut{" "}
                    {comp.revokedAt
                      ? formatDateTimeWib(new Date(comp.revokedAt))
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        </main>

        <nav
          aria-label="Navigasi utama pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-cyan-200 bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {PATIENT_NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              const isActive = href === "/pasien/pendamping";
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
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-white shadow-sm"
                      >
                        <Icon className="h-6 w-6" />
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

      {/* Pop-up Konfirmasi Cabut Tautan */}
      <ConfirmDialog
        isOpen={companionToRevoke !== null}
        title="Cabut Tautan Pendamping"
        description={`Cabut tautan dengan ${companionToRevoke?.displayName || ""}? Pendamping langsung kehilangan akses.`}
        confirmLabel="Ya, Cabut"
        cancelLabel="Batal"
        onConfirm={handleRevokeConfirm}
        onClose={() => setCompanionToRevoke(null)}
      />
    </div>
  );
}
