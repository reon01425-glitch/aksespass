import React from "react";
import { CircleCheck, TriangleAlert, CircleX } from "lucide-react";

export type CareProofValue = "terpenuhi" | "sebagian" | "belum";

export interface CareProofScaleProps {
  name: string;
  legend: string;
  value?: CareProofValue;
  onChange: (value: CareProofValue) => void;
  disabled?: boolean;
  className?: string;
}

interface OptionConfig {
  value: CareProofValue;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const OPTIONS: OptionConfig[] = [
  {
    value: "terpenuhi",
    label: "Terpenuhi",
    icon: CircleCheck,
  },
  {
    value: "sebagian",
    label: "Sebagian",
    icon: TriangleAlert,
  },
  {
    value: "belum",
    label: "Belum",
    icon: CircleX,
  },
];

export function CareProofScale({
  name,
  legend,
  value,
  onChange,
  disabled = false,
  className = "",
}: CareProofScaleProps) {
  return (
    <fieldset className={`w-full min-w-0 max-w-full border-0 p-0 m-0 ${className}`.trim()}>
      <legend className="text-base font-bold text-main mb-3 block max-w-full break-words">
        {legend}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          const Icon = opt.icon;
          const inputId = `${name}-${opt.value}`;

          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              className={`relative flex min-h-16 cursor-pointer select-none flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 font-bold focus-within:ring-4 focus-within:ring-cyan-900 ${
                isSelected
                  ? "border-cyan-900 bg-cyan-900 text-white"
                  : "border-cyan-800 bg-white text-cyan-900"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span className="text-base">{opt.label}</span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
