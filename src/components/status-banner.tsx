"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type StatusBannerVariant = "success" | "warning" | "error";

export interface StatusBannerProps {
  variant: StatusBannerVariant;
  title: string;
  message: string;
  /** Tidak dipakai lagi: notifikasi tanpa ikon (keputusan 16 Okt 2026). Dipertahankan agar pemanggil lama tetap valid. */
  icon?: "default" | "ban";
  /** Bila ada tombol aksi, notifikasi tetap di tempat (tidak melayang dan tidak hilang sendiri). */
  action?: React.ReactNode;
  /** Tidak dipakai lagi: semua notifikasi tanpa aksi kini melayang dari atas. */
  floating?: boolean;
  className?: string;
}

const TOAST_ROOT_ID = "toast-root";
const SHOW_MS = { success: 6000, warning: 8000, error: 10000 } as const;
const LEAVE_MS = 240;

/**
 * Notifikasi (design.md §2B, diubah 16 Okt 2026): latar abu muda (slate-200), tanpa ikon,
 * melayang turun dari atas lalu hilang sendiri. Berhenti menghitung saat disorot kursor atau
 * fokus. Bila ada `action`, tampil di tempat dan tidak hilang. Gerak dimatikan oleh
 * prefers-reduced-motion (globals.css).
 */
export function StatusBanner({
  variant,
  title,
  message,
  action,
  className = "",
}: StatusBannerProps) {
  const isToast = !action;
  // false saat render di server, true di klien (tanpa setState dalam effect).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [open, setOpen] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setLeaving(true);
    timer.current = setTimeout(() => setOpen(false), LEAVE_MS);
  }, []);

  useEffect(() => {
    if (!isToast || !mounted || paused) return;
    timer.current = setTimeout(hide, SHOW_MS[variant]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isToast, mounted, paused, variant, title, message, hide]);

  if (!open) return null;

  const role = variant === "error" ? "alert" : "status";
  const border = variant === "error" ? "border-2 border-cyan-900" : "border border-slate-500";
  const base = `flex flex-col w-full max-w-full p-4 rounded-2xl bg-slate-200 text-cyan-900 ${border}`;

  const body = (
    <>
      <span className="text-base font-bold break-words">{title}</span>
      <span className="text-sm font-normal mt-0.5 break-words">{message}</span>
      {action && <div className="mt-3">{action}</div>}
    </>
  );

  if (!isToast) {
    return (
      <div role={role} className={`${base} ${className}`.trim()}>
        {body}
      </div>
    );
  }

  const toast = (
    <div
      role={role}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto shadow-lg ${leaving ? "toast-out" : "toast-in"} ${base} ${className}`.trim()}
    >
      {body}
    </div>
  );

  const root = mounted && typeof document !== "undefined" ? document.getElementById(TOAST_ROOT_ID) : null;
  if (root) return createPortal(toast, root);

  // Sebelum hidrasi (atau tanpa wadah): tetap dirender tetapi tidak terlihat, tanpa menggeser tata letak.
  return (
    <div className="sr-only" data-toast-pending="">
      {toast}
    </div>
  );
}
