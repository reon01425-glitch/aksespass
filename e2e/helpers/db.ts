import pg from "pg";
import { loadEnvLocal } from "./env";

loadEnvLocal();

/** Kueri langsung ke database TES sebagai pemilik (melewati RLS) untuk menyiapkan/memeriksa data. */
export async function adminQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL_TEST });
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    await client.end();
  }
}

/** Hapus hitungan batas permintaan OTP supaya login berulang di tes tidak terkena 429. */
export async function resetRateLimits() {
  await adminQuery("DELETE FROM rate_limit_hits");
}
