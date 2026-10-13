"use client";

import React, { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  triggerRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const fallbackTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      fallbackTriggerRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) {
        dialog.showModal();
      }
      cancelButtonRef.current?.focus();
    } else {
      if (dialog.open) {
        dialog.close();
      }
      const returnTarget = triggerRef?.current || fallbackTriggerRef.current;
      returnTarget?.focus();
    }
  }, [isOpen, triggerRef]);

  // Handle ESC key via native cancel event
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="p-6 rounded-2xl bg-white border border-cyan-800 shadow-xl w-[calc(100vw-2rem)] max-w-sm backdrop:bg-cyan-900/50 m-auto focus:outline-none"
    >
      <h2 id="confirm-dialog-title" className="text-xl font-bold text-main mb-2 break-words">
        {title}
      </h2>
      <p id="confirm-dialog-desc" className="text-base font-normal text-secondary mb-6">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-12 min-h-12 min-w-12 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:outline-none focus:ring-4 focus:ring-cyan-900"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center h-12 min-h-12 min-w-12 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
