"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog, PageShell, StatusBanner } from "@/components";
import { TampilkanQr } from "./tampilkan-qr";
import type { ActiveQrItem } from "@/lib/consent";
const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

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
  const router = useRouter();

  // Pantau semua QR aktif: bila petugas memindai salah satunya saat halaman ini terbuka
  // (status berubah menjadi "dipindai"), pasien dialihkan ke halaman menunggu.
  // QR yang sudah dipindai sebelum halaman dibuka tidak memicu pengalihan.
  const idsKey = qrs.map((q) => currentIds[q.id] ?? q.id).join(",");
  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) return;
    let active = true;
    const baseline = new Map<string, string>();
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      for (const id of ids) {
        try {
          const res = await fetch(`/api/pasien/qr/${encodeURIComponent(id)}/status`, {
            cache: "no-store",
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (!active || !data.ok) continue;
          const before = baseline.get(id);
          baseline.set(id, data.status);
          if (
            before !== undefined &&
            before !== "dipindai" &&
            data.status === "dipindai" &&
            typeof data.visitId === "string"
          ) {
            router.push(`/pasien/menunggu/${encodeURIComponent(data.visitId)}`);
            return;
          }
        } catch {
          // abaikan galat jaringan sementara
        }
      }
    };
    void poll();
    const timer = window.setInterval(poll, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [idsKey, router]);

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
    <PageShell title="QR Akses" backHref="/pasien/akses" backLabel="Kembali ke kontrol akses" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
          {statusMessage && (
            <StatusBanner floating
              variant={statusMessage.title.includes("Gagal") ? "error" : "success"}
              title={statusMessage.title}
              message={statusMessage.message}
            />
          )}

          {qrs.length === 0 && (
            <StatusBanner
              variant="warning"
              title="Belum ada QR aktif"
              message="Buat ConsentQR saat Anda siap membagikan kebutuhan kepada petugas."
            />
          )}

          {qrs.length === 0 ? (
            <section className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-main">
                  Tidak ada ConsentQR yang berlaku
                </h2>
                <p className="text-sm leading-6 text-secondary">
                  Buat QR saat Anda siap membagikan kebutuhan layanan kepada
                  petugas. ConsentQR berisi token acak dan tidak menyimpan
                  rekam medis langsung pada kode.
                </p>
              </div>
              <Link
                href="/pasien/kunjungan"
                className={`flex min-h-12 items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-cyan-800 ${FOCUS_RING}`}
              >
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
                <span className="rounded-full border border-cyan-800 bg-white px-3 py-1 text-sm font-bold text-cyan-900">
                  {qrs.length} QR
                </span>
              </div>
              <ul
                aria-label="Daftar ConsentQR Aktif"
                className="flex flex-col gap-3"
              >
                {qrs.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
                  >
                    <h3 className="break-words text-lg font-bold leading-snug text-main">
                      {item.facilityName}
                    </h3>

                    <div className="flex flex-col gap-1 border-t border-cyan-800 pt-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                        Data yang dibagikan
                      </span>
                      <p className="break-words text-sm text-main">
                        {item.sharedFieldLabels.length > 0
                          ? item.sharedFieldLabels.join(", ")
                          : "Nama panggilan saja"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-cyan-800 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                          Kedaluwarsa otomatis
                        </span>
                        <span className="text-sm font-bold text-main">
                          {item.remainingTimeText}
                        </span>
                      </div>
                      <p className="text-sm text-secondary">{item.expiryText}</p>
                    </div>

                    <TampilkanQr
                      qrId={currentIds[item.id] ?? item.id}
                      facilityName={item.facilityName}
                      waitingHrefBase="/pasien/menunggu"
                      onReplaced={(newId) =>
                        setCurrentIds((prev) => ({ ...prev, [item.id]: newId }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmTarget(item)}
                      className={`flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 py-3 text-base font-bold text-cyan-900 transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
                    >
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
              className={`flex min-h-12 items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-cyan-800 ${FOCUS_RING}`}
            >
              Buat QR Baru
            </Link>
          )}

          <Link
            href="/pasien/akses/riwayat"
            className={`flex min-h-12 items-center justify-center rounded-2xl border border-cyan-800 bg-white px-4 py-3 text-base font-bold text-cyan-900 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
          >
            Lihat riwayat akses
          </Link>
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
    </PageShell>
  );
}
