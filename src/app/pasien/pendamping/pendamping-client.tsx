"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  HeroCard,
  PageShell,
  StatusBanner,
} from "@/components";
import type { PatientCompanionItem } from "@/lib/companions";
import { Users } from "lucide-react";
import { formatDateTimeWib } from "@/lib/consent/time";
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
    <PageShell title="Pendamping" backHref="/pasien" backLabel="Kembali ke beranda" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        {/* Banner Pesan Aksi */}
        {bannerMessage && (
          <StatusBanner floating
            variant={bannerMessage.type === "success" ? "success" : "error"}
            title={
              bannerMessage.type === "success" ? "Berhasil" : "Terjadi Kesalahan"
            }
            message={bannerMessage.message}
          />
        )}

        <HeroCard
          Icon={Users}
          title="Dukungan Akses Terpercaya"
          description="Anda mengatur siapa yang dapat membantu mengelola layanan."
        />

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
                Tautkan Pendamping Baru
              </Button>
              {codeError && (
                <StatusBanner floating
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
                  {copied ? "Tersalin" : "Salin Kode"}
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
              className="mb-3 text-lg font-bold text-main"
            >
              Menunggu Persetujuan ({pendingList.length})
            </h2>

            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              {pendingList.map((comp) => {
                const isLoading = actionLoadingId === comp.id;
                return (
                  <div
                    key={comp.id}
                    className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
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

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(comp)}
                        isLoading={isLoading}
                        disabled={isLoading}
                        aria-label={`Setujui permintaan dari ${comp.displayName}`}
                        className="flex-1 sm:flex-none"
                      >
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
            className="mb-3 flex items-center gap-2 text-lg font-bold text-main"
          >
            Pendamping Aktif
            <span className="text-sm text-secondary">({activeList.length})</span>
          </h2>

          {activeList.length === 0 ? (
            <div className="rounded-2xl border border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary shadow-sm">
              Belum ada pendamping aktif. Tautkan pendamping untuk memberi
              akses sesuai kebutuhan Anda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              {activeList.map((comp) => (
                <div
                  key={comp.id}
                  className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
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
                  </div>

                  <p className="text-sm leading-6 text-secondary">
                    Dapat membantu melihat paspor kebutuhan, membuat QR akses,
                    dan mengonfirmasi kunjungan.
                  </p>

                  <button
                    type="button"
                    onClick={() => setCompanionToRevoke(comp)}
                    aria-label={`Cabut akses pendamping ${comp.displayName}`}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 py-2.5 text-center font-bold text-cyan-900 hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                  >
                    Cabut Akses Pendamping
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Riwayat Tautan yang Berakhir (Opsional/Informasi) */}
        {revokedList.length > 0 && (
          <section aria-labelledby="heading-revoked">
            <h2
              id="heading-revoked"
              className="mb-3 text-lg font-bold text-main"
            >
              Tautan Berakhir ({revokedList.length})
            </h2>

            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              {revokedList.map((comp) => (
                <div
                  key={comp.id}
                  className="flex min-w-0 flex-col gap-1 rounded-2xl border border-cyan-800 bg-white p-4 text-sm shadow-sm"
                >
                  <span className="font-bold text-main">
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
    </PageShell>
  );
}
