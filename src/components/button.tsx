import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  isLoading = false,
  disabled = false,
  type = "button",
  children,
  className = "",
  ref,
  ...props
}: ButtonProps) {
  const isButtonDisabled = disabled || isLoading;

  let variantStyles = "";
  if (isButtonDisabled) {
    variantStyles =
      "bg-disabled-surface text-disabled-text border-transparent shadow-none cursor-not-allowed";
  } else if (variant === "primary") {
    variantStyles =
      "bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2";
  } else {
    variantStyles =
      "bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900";
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading ? "true" : undefined}
      className={`inline-flex items-center justify-center min-h-12 min-w-12 py-2.5 px-4 sm:px-6 max-w-full text-center break-words select-none focus:outline-none ${variantStyles} ${className}`.trim()}
      {...props}
    >
      {isLoading ? "Memproses…" : children}
    </button>
  );
}
