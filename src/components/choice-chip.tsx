import React from "react";
import { CircleCheck } from "lucide-react";

export interface ChoiceChipProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  name: string;
  label: string;
  icon?: React.ReactNode;
}

export function ChoiceChip({
  id,
  name,
  label,
  icon,
  checked = false,
  disabled = false,
  className = "",
  onChange,
  ...props
}: ChoiceChipProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 min-h-12 min-w-12 max-w-full px-4 py-3 rounded-lg border cursor-pointer select-none focus-within:ring-4 focus-within:ring-cyan-900 ${
        disabled
          ? "bg-disabled-surface text-disabled-text border-transparent cursor-not-allowed"
          : checked
          ? "bg-surface border-cyan-700 text-main font-bold"
          : "bg-white border-cyan-400 text-main font-normal hover:bg-cyan-50"
      } ${className}`.trim()}
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
        {...props}
      />
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="text-base break-words min-w-0 flex-1">{label}</span>
      {checked && (
        <CircleCheck className="w-5 h-5 shrink-0 ml-auto" aria-hidden="true" />
      )}
    </label>
  );
}
