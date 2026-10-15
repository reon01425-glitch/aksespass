"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, ConfirmDialog, StatusBanner } from "@/components";
import type { StaffListItem, StaffStatus } from "@/lib/staff";

/** Petugas aktif adalah keadaan biasa, jadi hanya status lain yang diberi label. */
const STATUS_LABEL: Partial<Record<StaffStatus, string>> = {
  invited: "Menunggu aktivasi",
  inactive: "Nonaktif",
};

export function StaffListClient({ initialStaff }: { initialStaff: StaffListItem[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [target, setTarget] = useState<StaffListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const change = async (item: StaffListItem, active: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/petugas/${item.userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMessage({ ok: false, text: data?.message || "Gagal mengubah status. Coba lagi." });
        return;
      }
      setStaff((prev) =>
        prev.map((s) => (s.userId === item.userId ? { ...s, status: data.status as StaffStatus } : s))
      );
      setMessage({
        ok: true,
        text: active
          ? `${item.name} diaktifkan kembali.`
          : `${item.name} dinonaktifkan. Akses pindai ditutup sekarang.`,
      });
    } catch {
      setMessage({ ok: false, text: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <p className="max-w-none w-full rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
        Petugas didaftarkan oleh admin. Petugas aktif setelah masuk pertama kali dengan nomor HP
        yang didaftarkan.
      </p>

      {message && (
        <StatusBanner
          variant={message.ok ? "success" : "error"}
          title={message.ok ? "Berhasil" : "Gagal"}
          message={message.text}
        />
      )}

      <Link
        href="/admin/petugas/tambah"
        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-cyan-800 px-4 py-3 text-base font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
      >
        Tambah Petugas
      </Link>

      {staff.length === 0 ? (
        <p className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-6 text-center text-sm font-bold text-main">Belum ada petugas terdaftar.</p>
      ) : (
        <ul aria-label="Daftar petugas" className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
          {staff.map((s) => {
            const label = STATUS_LABEL[s.status];
            return (
              <li
                key={s.userId}
                data-testid="baris-petugas"
                className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <span className="break-words text-base font-bold text-main">{s.name}</span>
                  <span className="break-words text-xs text-secondary">Petugas · {s.unit}</span>
                  <span className="break-all text-xs text-secondary">{s.phoneMasked}</span>
                  {label && <span className="text-sm font-bold text-main">{label}</span>}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <Link
                    href={`/admin/petugas/${s.userId}`}
                    aria-label={`Ubah ${s.name}`}
                    className="flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-cyan-700 bg-white px-4 py-2 text-base font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                  >
                    Ubah
                  </Link>
                  {s.status === "inactive" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      className="w-full"
                      onClick={() => void change(s, true)}
                      aria-label={`Aktifkan kembali ${s.name}`}
                    >
                      Aktifkan Kembali
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      className="w-full"
                      aria-label={`Nonaktifkan ${s.name}`}
                      onClick={(e) => {
                        triggerRef.current = e.currentTarget;
                        setTarget(s);
                      }}
                    >
                      Nonaktifkan
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={() => target && void change(target, false)}
        title={target ? `Nonaktifkan ${target.name}?` : "Nonaktifkan petugas?"}
        description="Petugas tidak dapat masuk atau memindai ConsentQR lagi. Percobaan berikutnya ditolak dan tercatat. Anda dapat mengaktifkannya kembali."
        confirmLabel="Ya, Nonaktifkan"
        triggerRef={triggerRef}
      />
    </div>
  );
}
