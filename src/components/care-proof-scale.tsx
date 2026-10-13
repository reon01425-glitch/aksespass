import React from "react";
import { CircleCheck, TriangleAlert, CircleX, Check } from "lucide-react";

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
  containerColor: string;
}

const OPTIONS: OptionConfig[] = [
  {
    value: "terpenuhi",
    label: "Terpenuhi",
    icon: CircleCheck,
    containerColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "sebagian",
    label: "Sebagian",
    icon: TriangleAlert,
    containerColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "belum",
    label: "Belum",
    icon: CircleX,
    containerColor: "bg-red-50 text-red-700 border-red-200",
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
              className={`relative flex flex-col items-center justify-center gap-2 p-4 min-h-16 rounded-xl cursor-pointer select-none border-2 focus-within:ring-4 focus-within:ring-cyan-900 ${
                opt.containerColor
              } ${
                isSelected
                  ? "border-4 border-cyan-900 font-bold"
                  : "border-transparent font-bold"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
                {isSelected && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-900 text-white shrink-0 ml-1">
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
