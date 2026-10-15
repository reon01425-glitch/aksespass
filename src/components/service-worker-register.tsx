"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (cangkang offline saja, tanpa data pasien). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Tanpa service worker aplikasi tetap berjalan, hanya tidak ada mode offline.
    });
  }, []);
  return null;
}
