import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface PageShellProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  backHref,
  backLabel = "Kembali",
  children,
  className = "",
}: PageShellProps) {
  return (
    <div className="min-h-full flex flex-col w-full bg-page text-main">
      <header className="w-full border-b border-cyan-100 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3 w-full min-w-0">
          {backHref && (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="inline-flex items-center justify-center min-w-12 min-h-12 shrink-0 rounded-lg text-main hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-900"
            >
              <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            </Link>
          )}
          <h1 className="font-bold text-main break-words min-w-0 flex-1">{title}</h1>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 max-w-2xl w-full mx-auto px-4 py-6 focus:outline-none min-w-0 ${className}`.trim()}
      >
        {children}
      </main>
    </div>
  );
}
