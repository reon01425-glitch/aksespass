"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  PageShell,
  StatusBanner,
} from "@/components";
import type { PatientCompanionItem } from "@/lib/companions";
import { formatDateTimeWib } from "@/lib/consent/time";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  XCircle,
  Copy,
  Check,
} from "lucide-react";

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
    <PageShell
      title="Pendamping"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-6 max-w-full w-full">
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

        {/* Deskripsi Alur Pendamping */}
        <section aria-labelledby="heading-pendamping-intro">
          <h2 id="heading-pendamping-intro" className="sr-only">
            Informasi Pendamping
          </h2>
          <p className="text-base text-main">
            Pendamping yang tertaut dapat melihat paspor kebutuhan, membuat
            ConsentQR, dan mengonfirmasi pelayanan atas persetujuan Anda.
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
                className="w-full text-lg"
              >
                <UserPlus className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                Tambah Pendamping
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
              className="p-6 rounded-2xl border-2 border-cyan-800 bg-cyan-50 flex flex-col gap-4 text-center shadow-sm"
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
              className="text-lg font-bold text-main border-b border-cyan-100 pb-2 mb-3 flex items-center gap-2"
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
                    className="p-4 rounded-xl border border-cyan-200 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
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
                        <UserX className="w-5 h-5 mr-1" aria-hidden="true" />
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
            className="text-lg font-bold text-main border-b border-cyan-100 pb-2 mb-3 flex items-center gap-2"
          >
            <CheckCircle2
              className="w-5 h-5 text-cyan-800 shrink-0"
              aria-hidden="true"
            />
            Pendamping Aktif ({activeList.length})
          </h2>

          {activeList.length === 0 ? (
            <p className="text-sm text-secondary py-2">
              Belum ada pendamping aktif.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeList.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-cyan-200 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-main">
                      {comp.displayName}
                    </span>
                    <span className="text-sm text-secondary">
                      Aktif sejak{" "}
                      {comp.approvedAt
                        ? formatDateTimeWib(new Date(comp.approvedAt))
                        : "sebelumnya"}
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => setCompanionToRevoke(comp)}
                    aria-label={`Cabut tautan dengan ${comp.displayName}`}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    Cabut Tautan
                  </Button>
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
              className="text-base font-bold text-secondary border-b border-cyan-100 pb-2 mb-3 flex items-center gap-2"
            >
              <XCircle className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
              Tautan Berakhir ({revokedList.length})
            </h2>

            <div className="flex flex-col gap-2">
              {revokedList.map((comp) => (
                <div
                  key={comp.id}
                  className="p-3 rounded-lg border border-dashed border-cyan-200 bg-surface flex items-center justify-between text-sm"
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
