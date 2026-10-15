import React from "react";

export interface ChoiceGroupProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  helperText?: string;
}

export function ChoiceGroup({
  legend,
  children,
  className = "",
  helperText,
}: ChoiceGroupProps) {
  return (
    <fieldset className={`w-full min-w-0 max-w-full border-0 p-0 m-0 ${className}`.trim()}>
      <legend className="text-sm font-bold text-main mb-2 block max-w-full break-words">{legend}</legend>
      {helperText && (
        <p className="text-sm font-normal text-secondary mb-3 max-w-full break-words">{helperText}</p>
      )}
      <div className="grid max-w-full grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">{children}</div>
    </fieldset>
  );
}
