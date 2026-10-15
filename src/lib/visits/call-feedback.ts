/**
 * Umpan balik panggilan giliran di perangkat pasien (P13/P14).
 * Semua fungsi aman dipanggil di peramban yang tidak mendukungnya.
 * Tanpa suara sebagai satu-satunya penanda: getar + layar + notifikasi visual.
 */
export const CALL_VIBRATION_PATTERN = [400, 150, 400, 150, 800];

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrateForCall(): boolean {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(CALL_VIBRATION_PATTERN);
  } catch {
    return false;
  }
}

export type NotificationSupport = "unsupported" | "default" | "granted" | "denied";

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (getNotificationSupport() === "unsupported") return "unsupported";
  try {
    return (await window.Notification.requestPermission()) as NotificationSupport;
  } catch {
    return getNotificationSupport();
  }
}

/** Notifikasi visual saat halaman tidak sedang dilihat. Tanpa data pasien di isinya. */
export function showCallNotification(room: string | null): boolean {
  if (getNotificationSupport() !== "granted") return false;
  try {
    new window.Notification("Giliran Anda", {
      body: room ? `Silakan menuju ${room}.` : "Silakan menuju ruangan.",
      requireInteraction: true,
      tag: "aksespass-panggilan",
    });
    return true;
  } catch {
    return false;
  }
}
