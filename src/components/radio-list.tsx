import React from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioListProps {
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function RadioList({
  name,
  legend,
  options,
  value,
  onChange,
  disabled = false,
  className = "",
  helperText,
}: RadioListProps) {
  return (
    <fieldset
      className={`w-full min-w-0 max-w-full border-0 p-0 m-0 ${className}`.trim()}
    >
      <legend className="text-base font-bold text-main mb-2 block max-w-full break-words">
        {legend}
      </legend>
      {helperText && (
        <p className="text-sm font-normal text-secondary mb-3 max-w-full break-words">
          {helperText}
        </p>
      )}
      <div className="flex flex-col gap-3 w-full">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          const inputId = `${name}-${opt.value}`;
          const isOptDisabled = disabled || Boolean(opt.disabled);

          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              className={`relative flex items-start gap-3 p-4 min-h-12 rounded-2xl cursor-pointer select-none border transition-colors focus-within:ring-4 focus-within:ring-cyan-900 focus-within:ring-offset-2 ${
                isSelected
                  ? "bg-white border-2 border-cyan-800 font-bold"
                  : "bg-white border-cyan-800/40 hover:bg-cyan-50"
              } ${isOptDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={isOptDisabled}
                onChange={() => onChange(opt.value)}
                className="w-5 h-5 mt-0.5 accent-cyan-700 shrink-0 text-cyan-700 focus:outline-none"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-base text-main font-bold block break-words">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="text-sm text-secondary font-normal block mt-0.5 break-words">
                    {opt.description}
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
