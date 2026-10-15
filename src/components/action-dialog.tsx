"use client";

import React, { useEffect, useId, useRef } from "react";

export interface ActionDialogAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** Keterangan singkat di bawah tombol, mis. alasan tombol belum aktif. */
  hint?: string;
}

export interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actions: ActionDialogAction[];
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const BASE =
  "inline-flex items-center justify-center min-h-12 min-w-12 px-6 py-2 font-bold rounded-lg focus:outline-none focus:ring-4 focus:ring-cyan-900";

/**
 * Dialog modal dengan dua atau lebih pilihan tindakan (ConfirmDialog hanya dua).
 * Fokus awal pada tombol pertama yang aktif, ESC menutup, fokus kembali ke pemicu.
 */
export function ActionDialog({
  isOpen,
  onClose,
  title,
  description,
  actions,
  triggerRef,
}: ActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstEnabledRef = useRef<HTMLButtonElement>(null);
  const fallbackTriggerRef = useRef<HTMLElement | null>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      fallbackTriggerRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) dialog.showModal();
      firstEnabledRef.current?.focus();
    } else {
      if (dialog.open) dialog.close();
      const returnTarget = triggerRef?.current || fallbackTriggerRef.current;
      returnTarget?.focus();
    }
  }, [isOpen, triggerRef]);

  const firstEnabledIndex = actions.findIndex((action) => !action.disabled);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="p-6 rounded-2xl bg-white border border-cyan-800 shadow-xl w-[calc(100vw-2rem)] max-w-sm backdrop:bg-cyan-900/50 m-auto focus:outline-none"
    >
      <h2 id={titleId} className="text-xl font-bold text-main mb-2 break-words">
        {title}
      </h2>
      <p id={descId} className="text-base font-normal text-secondary mb-6">
        {description}
      </p>
      <div className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <div key={action.label} className="flex flex-col gap-1">
            <button
              ref={index === firstEnabledIndex ? firstEnabledRef : undefined}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`${BASE} ${
                action.variant === "primary"
                  ? "bg-cyan-700 text-white shadow-sm focus:ring-offset-2"
                  : "bg-cyan-100 border border-cyan-700 text-cyan-900 hover:bg-cyan-200"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {action.label}
            </button>
            {action.hint && (
              <span className="text-center text-xs text-secondary">
                {action.hint}
              </span>
            )}
          </div>
        ))}
      </div>
    </dialog>
  );
}
