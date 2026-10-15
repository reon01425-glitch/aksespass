"use client";

import React, { useState } from "react";

export interface OtpCodeInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  length?: number;
}

/**
 * Kolom kode verifikasi: satu input asli (mendukung isi otomatis SMS dan tempel)
 * dengan enam kotak tampilan di bawahnya. Dipakai di semua layar yang meminta kode OTP.
 */
export function OtpCodeInput({
  id,
  label = "Kode Verifikasi (6 Digit)",
  value,
  onChange,
  disabled = false,
  helperText = "Kode berlaku 5 menit.",
  inputRef,
  length = 6,
}: OtpCodeInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
      <label htmlFor={id} className="text-sm font-bold text-main">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-describedby={`${id}-help`}
          disabled={disabled}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden="true" className="flex gap-2">
          {Array.from({ length }).map((_, i) => {
            const active = focused && i === Math.min(value.length, length - 1);
            return (
              <div
                key={i}
                className={`flex h-14 flex-1 items-center justify-center rounded-2xl border-2 text-xl font-bold text-main ${
                  disabled ? "bg-disabled-surface" : "bg-white"
                } ${active ? "border-btn-primary ring-2 ring-btn-primary" : "border-input"}`}
              >
                {value[i] ?? ""}
              </div>
            );
          })}
        </div>
      </div>
      <p id={`${id}-help`} className="text-sm text-secondary">
        {helperText}
      </p>
    </div>
  );
}

/** Kotak catatan mode demo yang menampilkan kode OTP tiruan. */
export function DemoOtpNote({ code }: { code: string }) {
  return (
    <div
      role="note"
      className="flex flex-col rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm"
    >
      <span className="text-sm font-bold text-main">Mode demo: SMS belum aktif.</span>
      <span className="text-base font-bold text-main">Kode Anda: {code}</span>
    </div>
  );
}
