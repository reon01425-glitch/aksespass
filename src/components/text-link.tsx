import React from "react";
import Link from "next/link";

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  standalone?: boolean;
}

export function TextLink({
  href,
  standalone = false,
  children,
  className = "",
  ...props
}: TextLinkProps) {
  const baseClasses =
    "text-link underline hover:text-cyan-900 focus:outline-none focus:ring-4 focus:ring-cyan-900 rounded font-normal";
  const standaloneClasses = standalone
    ? "inline-flex items-center justify-center min-h-12 min-w-12 px-2 py-3"
    : "";

  const isInternal = href.startsWith("/") || href.startsWith("#");

  if (isInternal) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${standaloneClasses} ${className}`.trim()}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={`${baseClasses} ${standaloneClasses} ${className}`.trim()}
      {...props}
    >
      {children}
    </a>
  );
}
