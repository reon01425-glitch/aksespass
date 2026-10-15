"use client";

import { useState } from "react";
import { Button } from "./button";
import { clearAllPassportDrafts } from "@/lib/passport/draft";
import { clearOfflineSummary } from "@/lib/passport/offline-summary";

/** Mencabut sesi di server, membersihkan data lokal pengguna, lalu menuju halaman masuk. */
export async function performLogout(redirectTo = "/masuk") {
  try {
    // Draft paspor hanya untuk perangkat yang sedang dipakai pemiliknya.
    clearAllPassportDrafts();
    // Ringkasan offline juga milik pengguna yang sedang masuk.
    clearOfflineSummary();
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Abaikan galat jaringan, tetap arahkan ke halaman masuk
  } finally {
    window.location.href = redirectTo;
  }
}

export interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
}

/**
 * Tombol Keluar standar AKSESPASS.
 * Memanggil POST /api/auth/logout untuk mencabut sesi di server dan menghapus cookie,
 * lalu mengalihkan pengguna ke halaman masuk yang ditentukan.
 */
export function LogoutButton({
  className = "",
  redirectTo = "/masuk",
}: LogoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    setIsProcessing(true);
    await performLogout(redirectTo);
  };

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      isLoading={isProcessing}
      className={className}
    >
      Keluar
    </Button>
  );
}
