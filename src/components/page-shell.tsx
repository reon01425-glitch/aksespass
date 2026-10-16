import React from "react";
import { AppHeader } from "./app-header";
import { PetugasBottomNav } from "./petugas-bottom-nav";
import { CompanionBottomNav } from "./companion-bottom-nav";
import { AdminBottomNav } from "./admin-bottom-nav";
import { PatientBottomNav } from "./patient-bottom-nav";
import { CuratorBottomNav } from "./curator-bottom-nav";

export interface PageShellProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  titleTabIndex?: number;
  /** Tampilkan navigasi bawah petugas (Beranda, Pindai, Kartu). */
  petugasNav?: boolean;
  /** Tampilkan navigasi bawah pendamping (Beranda, Tautkan, Keluar). */
  companionNav?: boolean;
  /** Tampilkan navigasi bawah admin fasilitas. */
  adminNav?: boolean;
  /** Tampilkan navigasi bawah pasien. */
  patientNav?: boolean;
  /** Tampilkan navigasi bawah kurator. */
  curatorNav?: boolean;
}

export function PageShell({
  title,
  backHref,
  backLabel = "Kembali",
  children,
  className = "",
  titleRef,
  titleTabIndex,
  petugasNav = false,
  companionNav = false,
  adminNav = false,
  patientNav = false,
  curatorNav = false,
}: PageShellProps) {
  return (
    <div className="min-h-full flex flex-col w-full bg-page text-main">
      <AppHeader
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        titleRef={titleRef}
        titleTabIndex={titleTabIndex}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 max-w-2xl w-full mx-auto px-4 py-6 focus:outline-none min-w-0 ${petugasNav || companionNav || adminNav || patientNav || curatorNav ? "pb-28" : ""} ${className}`.trim()}
      >
        {children}
      </main>
      {petugasNav && <PetugasBottomNav />}
      {companionNav && <CompanionBottomNav />}
      {adminNav && <AdminBottomNav />}
      {patientNav && <PatientBottomNav />}
      {curatorNav && <CuratorBottomNav />}
    </div>
  );
}
