import { Pool } from "pg";

export const NEED_CATEGORIES = [
  "komunikasi",
  "penglihatan",
  "pendengaran",
  "mobilitas",
  "sensorik_lingkungan",
  "pendampingan",
] as const;

export type NeedCategory = (typeof NEED_CATEGORIES)[number];

export const CONSENT_SHARED_FIELDS = [
  ...NEED_CATEGORIES,
  "catatan_pasien",
] as const;

export type ConsentSharedField = (typeof CONSENT_SHARED_FIELDS)[number];

export const STAFF_NOTE_MAX_LENGTH = 280;
export const PATIENT_NOTE_MAX_LENGTH = 300;
export const DASHBOARD_MIN_GROUP_SIZE = 5;

const globalForDb = globalThis as unknown as {
  aksespassPool?: Pool;
};

export function getDbPool(): Pool {
  if (!globalForDb.aksespassPool) {
    const connectionString =
      process.env.DATABASE_URL ?? process.env.DATABASE_ADMIN_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL belum diatur di variabel lingkungan.");
    }
    globalForDb.aksespassPool = new Pool({
      connectionString,
      max: 10,
    });
  }
  return globalForDb.aksespassPool;
}
