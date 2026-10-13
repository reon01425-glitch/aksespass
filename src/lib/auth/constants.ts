export const APP_DB_ROLES = [
  "patient",
  "companion",
  "staff",
  "facility_admin",
  "curator",
  "system",
] as const;

export type AppDbRole = (typeof APP_DB_ROLES)[number];

export const ROLE_HOME_DESTINATIONS: Record<AppDbRole, string> = {
  patient: "/pasien",
  companion: "/pendamping",
  staff: "/petugas",
  facility_admin: "/admin",
  curator: "/kurator",
  system: "/",
};

// Masa berlaku sesi [Usulan: architecture.md §13]
export const SESSION_LIFETIME_STAFF_MS = 8 * 60 * 60 * 1000; // 8 jam untuk petugas/admin/kurator
export const SESSION_LIFETIME_PATIENT_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari untuk pasien/pendamping

// Pengaturan OTP
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 menit
export const OTP_MAX_ATTEMPTS = 5; // Maksimum 5 percobaan gagal lalu kode hangus
export const OTP_RATE_LIMIT_PHONE_MAX = 3; // Maks 3 permintaan per nomor telepon per jendela
export const OTP_RATE_LIMIT_IP_MAX = 10; // Maks 10 permintaan per IP per jendela
export const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // Jendela 15 menit

// Nama Cookie Sesi
export const COOKIE_NAME = "aksespass_session";
export const SECURE_COOKIE_NAME = "__Host-aksespass_session";
