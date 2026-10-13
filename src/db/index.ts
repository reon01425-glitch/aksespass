import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";

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

export type AppDbRole =
  | "patient"
  | "companion"
  | "staff"
  | "facility_admin"
  | "curator"
  | "system";

export interface DbContext {
  userId?: string | null;
  role?: AppDbRole | string | null;
  facilityId?: string | null;
  scanTokenHash?: string | null;
}

const globalForDb = globalThis as unknown as {
  aksespassPool?: Pool;
  aksespassPoolUrl?: string;
};

function ensureEnvLoaded(): void {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL_TEST) {
    return;
  }
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line
      .slice(eqIdx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function resolveAppConnectionString(): string {
  ensureEnvLoaded();
  const connectionString =
    process.env.NODE_ENV === "test"
      ? (process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL)
      : process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (atau DATABASE_URL_TEST saat tes) belum diatur di variabel lingkungan."
    );
  }
  return connectionString;
}

function getInternalPool(): Pool {
  const connectionString = resolveAppConnectionString();
  if (
    !globalForDb.aksespassPool ||
    globalForDb.aksespassPoolUrl !== connectionString
  ) {
    globalForDb.aksespassPool = new Pool({
      connectionString,
      max: 10,
    });
    globalForDb.aksespassPoolUrl = connectionString;
  }
  return globalForDb.aksespassPool;
}

/**
 * Satu-satunya pintu akses database untuk kueri aplikasi / data pengguna.
 * Membuka transaksi, menyetel keempat kunci konteks RLS (`app.user_id`,
 * `app.role`, `app.facility_id`, `app.scan_token_hash`) secara lokal per
 * transaksi dengan `set_config(..., true)`, menjalankan `fn`, lalu melakukan
 * COMMIT atau ROLLBACK sebelum mengembalikan koneksi ke pool.
 */
export async function withContext<T>(
  ctx: DbContext,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getInternalPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `SELECT
        set_config('app.user_id', $1, true),
        set_config('app.role', $2, true),
        set_config('app.facility_id', $3, true),
        set_config('app.scan_token_hash', $4, true);`,
      [
        ctx.userId ?? "",
        ctx.role ?? "",
        ctx.facilityId ?? "",
        ctx.scanTokenHash ?? "",
      ]
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
