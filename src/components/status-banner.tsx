import React from "react";
import { CircleCheck, TriangleAlert, CircleX, Ban } from "lucide-react";

export type StatusBannerVariant = "success" | "warning" | "error";

export interface StatusBannerProps {
  variant: StatusBannerVariant;
  title: string;
  message: string;
  icon?: "default" | "ban";
  action?: React.ReactNode;
  className?: string;
}

export function StatusBanner({
  variant,
  title,
  message,
  icon = "default",
  action,
  className = "",
}: StatusBannerProps) {
  let containerStyles = "";
  let iconElement: React.ReactNode = null;

  if (variant === "success") {
    containerStyles = "bg-emerald-50 border border-emerald-200 text-emerald-700";
    iconElement = (
      <CircleCheck className="w-6 h-6 shrink-0" aria-hidden="true" />
    );
  } else if (variant === "warning") {
    containerStyles = "bg-amber-50 border border-amber-200 text-amber-700";
    iconElement = (
      <TriangleAlert className="w-6 h-6 shrink-0" aria-hidden="true" />
    );
  } else {
    containerStyles = "bg-red-50 border border-red-200 text-red-700";
    if (icon === "ban") {
      iconElement = <Ban className="w-6 h-6 shrink-0" aria-hidden="true" />;
    } else {
      iconElement = (
        <CircleX className="w-6 h-6 shrink-0" aria-hidden="true" />
      );
    }
  }

  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`flex items-start gap-3 p-4 rounded-xl max-w-full w-full ${containerStyles} ${className}`.trim()}
    >
      <div className="shrink-0 mt-0.5">{iconElement}</div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-bold break-words">{title}</span>
        <span className="text-sm font-normal mt-0.5 break-words">{message}</span>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
