import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import {
  CONSENT_SHARED_FIELDS,
  type ConsentSharedField,
  NEED_CATEGORIES,
  type NeedCategory,
} from "../lib/consent/constants";

export {
  CONSENT_SHARED_FIELDS,
  type ConsentSharedField,
  NEED_CATEGORIES,
  type NeedCategory,
};

export const STAFF_NOTE_MAX_LENGTH = 280;
export const PATIENT_NOTE_MAX_LENGTH = 300;
export const DASHBOARD_MIN_GROUP_SIZE = 5;

export const APP_DB_ROLES = [
  "patient",
  "companion",
  "staff",
  "facility_admin",
  "curator",
  "system",
] as const;

export type AppDbRole = (typeof APP_DB_ROLES)[number];

export interface DbContext {
  userId?: string | null;
  role?: AppDbRole | string | null;
  facilityId?: string | null;
  scanTokenHash?: string | null;
}

declare const TransactionClientBrand: unique symbol;

/**
 * Tipe bermerek khusus untuk client koneksi yang berada di dalam transaksi withContext.
 * Fungsi seperti recordAuditEvent mewajibkan tipe ini agar tidak dapat dipanggil dengan pool biasa.
 */
export type TransactionClient = PoolClient & {
  readonly [TransactionClientBrand]: true;
};

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

function validateDbContext(ctx: DbContext): void {
  if (ctx.role !== undefined && ctx.role !== null && ctx.role !== "") {
    if (!(APP_DB_ROLES as readonly string[]).includes(ctx.role)) {
      throw new Error(`Peran database tidak valid: ${ctx.role}`);
    }
  }

  if (ctx.userId !== undefined && ctx.userId !== null && ctx.userId !== "") {
    if (!UUID_REGEX.test(ctx.userId)) {
      throw new Error(`userId konteks database harus berupa UUID valid: ${ctx.userId}`);
    }
  }

  if (
    ctx.facilityId !== undefined &&
    ctx.facilityId !== null &&
    ctx.facilityId !== ""
  ) {
    if (!UUID_REGEX.test(ctx.facilityId)) {
      throw new Error(
        `facilityId konteks database harus berupa UUID valid: ${ctx.facilityId}`
      );
    }
  }

  if (
    ctx.scanTokenHash !== undefined &&
    ctx.scanTokenHash !== null &&
    ctx.scanTokenHash !== ""
  ) {
    if (!HEX_64_REGEX.test(ctx.scanTokenHash)) {
      throw new Error(
        `scanTokenHash konteks database harus berupa heks 64 karakter: ${ctx.scanTokenHash}`
      );
    }
  }
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
 * Membuka transaksi, menetapkan batas waktu statement_timeout = 5s, menyetel
 * keempat kunci konteks RLS (`app.user_id`, `app.role`, `app.facility_id`,
 * `app.scan_token_hash`) secara lokal per transaksi dengan `set_config(..., true)`,
 * menjalankan `fn`, lalu melakukan COMMIT atau ROLLBACK sebelum mengembalikan koneksi ke pool.
 */
export async function withContext<T>(
  ctx: DbContext,
  fn: (client: TransactionClient) => Promise<T>
): Promise<T> {
  validateDbContext(ctx);

  const pool = getInternalPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '5s';");
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
    const result = await fn(client as TransactionClient);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
