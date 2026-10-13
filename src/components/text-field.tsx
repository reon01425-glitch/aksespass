import React from "react";
import { CircleX } from "lucide-react";

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  id: string;
  helperText?: string;
  error?: string;
  variant?: "text" | "tel" | "otp" | "textarea";
  rows?: number;
  charCount?: number;
  ref?: React.Ref<HTMLInputElement>;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

export function TextField({
  label,
  id,
  helperText,
  error,
  variant = "text",
  className = "",
  type,
  autoComplete,
  inputMode,
  maxLength,
  rows = 3,
  charCount,
  ref,
  textareaRef,
  ...props
}: TextFieldProps) {
  let resolvedType = type || "text";
  let resolvedAutoComplete = autoComplete;
  let resolvedInputMode = inputMode;
  let resolvedMaxLength = maxLength;

  if (variant === "tel") {
    resolvedType = "tel";
    resolvedAutoComplete = resolvedAutoComplete || "tel";
  } else if (variant === "otp") {
    resolvedType = "text";
    resolvedInputMode = "numeric";
    resolvedAutoComplete = resolvedAutoComplete || "one-time-code";
    resolvedMaxLength = 6;
  }

  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const currentCount =
    typeof props.value === "string"
      ? props.value.length
      : typeof charCount === "number"
      ? charCount
      : undefined;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold text-main">
          {label}
        </label>
        {variant === "textarea" && maxLength && currentCount !== undefined && (
          <span
            className="text-xs text-secondary font-normal"
            aria-live="polite"
          >
            {currentCount} / {maxLength}
          </span>
        )}
      </div>

      {variant === "textarea" ? (
        <textarea
          ref={textareaRef}
          id={id}
          rows={rows}
          maxLength={resolvedMaxLength}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`min-h-24 w-full rounded-lg border border-input bg-white px-3 py-3 text-base font-normal text-main focus:outline-none focus:ring-4 focus:ring-cyan-900 ${className}`.trim()}
          value={props.value as string | number | readonly string[] | undefined}
          onChange={props.onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
          disabled={props.disabled}
          required={props.required}
          name={props.name}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={id}
          type={resolvedType}
          autoComplete={resolvedAutoComplete}
          inputMode={resolvedInputMode}
          maxLength={resolvedMaxLength}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`h-12 min-h-12 w-full rounded-lg border border-input bg-white px-3 py-3 text-base font-normal text-main focus:outline-none focus:ring-4 focus:ring-cyan-900 ${
            variant === "otp" ? "text-center tracking-widest font-bold" : ""
          } ${className}`.trim()}
          {...props}
        />
      )}

      {helperText && (
        <span id={helperId} className="text-sm font-normal text-secondary">
          {helperText}
        </span>
      )}
      {error && (
        <div
          id={errorId}
          className="flex items-center gap-1.5 text-sm font-normal text-main mt-0.5"
        >
          <CircleX className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
