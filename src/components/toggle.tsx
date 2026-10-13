import React from "react";

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  id: string;
  label: string;
  checked?: boolean;
}

export function Toggle({
  id,
  label,
  checked = false,
  disabled = false,
  className = "",
  onChange,
  ...props
}: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={`flex flex-wrap items-center justify-between gap-3 min-h-12 min-w-12 w-full max-w-full cursor-pointer select-none ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`.trim()}
    >
      <span className="text-base font-normal text-main break-words min-w-0 flex-1">
        {label}
      </span>
      <div className="inline-flex items-center gap-2 shrink-0">
        <span className="relative inline-flex items-center justify-center min-w-12 min-h-12">
          <input
            id={id}
            type="checkbox"
            role="switch"
            aria-checked={checked}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <span
            className={`w-12 h-7 rounded-full inline-flex items-center p-1 border-2 border-transparent peer-focus-visible:ring-4 peer-focus-visible:ring-cyan-900 ${
              checked ? "bg-cyan-700" : "bg-slate-200"
            }`}
          >
            <span
              className={`w-5 h-5 bg-white rounded-full ${
                checked ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </span>
        <span className="text-sm font-bold text-main min-w-[70px]">
          {checked ? "Aktif" : "Nonaktif"}
        </span>
      </div>
    </label>
  );
}
