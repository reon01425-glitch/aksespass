"use client";

import { useState } from "react";
import { Button } from "./button";

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
    try {
      setIsProcessing(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Abaikan galat jaringan, tetap arahkan ke halaman masuk
    } finally {
      window.location.href = redirectTo;
    }
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
