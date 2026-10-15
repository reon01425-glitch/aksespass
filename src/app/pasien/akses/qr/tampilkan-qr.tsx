"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { StatusBanner } from "@/components";
import { formatExpiryText, formatTokenForDisplay } from "@/lib/consent/time";
import { DESIGN_TOKENS } from "@/lib/tokens";

interface TampilkanQrProps {
  qrId: string;
  facilityName: string;
  /** Dipanggil setelah QR diganti, agar daftar memakai id QR baru (untuk Cabut). */
  onReplaced: (newQrId: string, newExpiresAt: string) => void;
  /** Bila diisi (sisi pasien), pasien dialihkan ke halaman menunggu saat petugas memindai QR yang sedang ditampilkan. */
  waitingHrefBase?: string;
}

/**
 * Tombol "Tampilkan QR". Token hanya disimpan sebagai hash di server, jadi QR yang sudah
 * dibuat tidak bisa digambar ulang. Tombol ini mengganti QR lama dengan QR baru (isian dan
 * masa berlaku sama) lalu menampilkannya. Token hanya ada di memori halaman ini.
 */
export function TampilkanQr({ qrId, facilityName, onReplaced, waitingHrefBase }: TampilkanQrProps) {
  const router = useRouter();
  const [liveQrId, setLiveQrId] = useState(qrId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<{
    svg: string;
    token: string;
    expiresAt: string;
  } | null>(null);

  // Setelah QR ditampilkan, pantau status tiap 5 detik; bila sudah dipindai petugas, buka halaman menunggu.
  useEffect(() => {
    if (!shown || !waitingHrefBase) return;
    let active = true;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/pasien/qr/${encodeURIComponent(liveQrId)}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.ok && data.status === "dipindai" && typeof data.visitId === "string") {
          router.push(`${waitingHrefBase}/${encodeURIComponent(data.visitId)}`);
        }
      } catch {
        // abaikan galat jaringan sementara
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const timer = window.setInterval(poll, 5000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shown, liveQrId, waitingHrefBase, router]);

  const handleShow = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pasien/qr/${qrId}/tampilkan`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Gagal menampilkan QR. Coba lagi.");
        return;
      }
      const svg = await QRCode.toString(data.qrUrl, {
        type: "svg",
        margin: 4,
        color: {
          dark: DESIGN_TOKENS["--text-main"],
          light: DESIGN_TOKENS["--color-white"],
        },
      });
      setLiveQrId(data.qrId);
      setShown({ svg, token: data.token, expiresAt: data.expiresAt });
      onReplaced(data.qrId, data.expiresAt);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (shown) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-cyan-800 bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          role="img"
          alt={`ConsentQR untuk ${facilityName}`}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(shown.svg)}`}
          width={256}
          height={256}
          className="aspect-square h-64 w-64 max-w-full"
        />
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <span className="text-xs text-secondary">
            Kode manual bila kamera petugas tidak bisa dipakai
          </span>
          <span className="select-all break-all text-lg font-bold tracking-widest text-main">
            {formatTokenForDisplay(shown.token)}
          </span>
        </div>
        <p className="text-center text-sm text-secondary">
          {formatExpiryText(new Date(shown.expiresAt), new Date())}
        </p>
        <p className="text-center text-sm text-secondary">
          QR lama sudah diganti dengan QR ini. QR hanya tampil sekarang; bila
          ditutup, tekan Tampilkan QR lagi untuk membuat penggantinya.
        </p>
        <button
          type="button"
          onClick={() => setShown(null)}
          className="min-h-12 w-full rounded-xl bg-cyan-100 px-4 py-3 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
        >
          Tutup
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <StatusBanner variant="error" title="Gagal menampilkan QR" message={error} />
      )}
      <button
        type="button"
        onClick={handleShow}
        disabled={isLoading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        <QrCode aria-hidden="true" className="h-5 w-5" />
        {isLoading ? "Menampilkan…" : "Tampilkan QR"}
      </button>
    </div>
  );
}
