import { type TransactionClient, withContext } from "../../db";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";

export const SCAN_RATE_LIMIT_STAFF_MAX = 20; // 20 percobaan per 5 menit per petugas
export const SCAN_RATE_LIMIT_IP_MAX = 60; // 60 percobaan per 5 menit per IP
export const SCAN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 menit

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: "STAFF_LIMIT" | "IP_LIMIT";
}

/**
 * Memeriksa dan menambah hit rate limit pada tabel rate_limit_hits di PostgreSQL.
 * Menerima clock 'now' agar dapat disuntikkan saat pengujian.
 */
export async function checkScanRateLimit(
  staffUserId: string,
  clientIp: string,
  options?: { now?: Date }
): Promise<RateLimitCheckResult> {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const pepper = getHashPepper();

  const ipHash = hmacSha256Hex(pepper, clientIp.trim() || "unknown");
  const staffRateKey = `scan:staff:${staffUserId}`;
  const ipRateKey = `scan:ip:${ipHash}`;

  const windowStart = new Date(
    Math.floor(nowMs / SCAN_RATE_LIMIT_WINDOW_MS) * SCAN_RATE_LIMIT_WINDOW_MS
  ).toISOString();

  return await withContext({}, async (tx: TransactionClient) => {
    // 1. Cek rate limit per petugas
    const staffRes = await tx.query<{ count: number }>(
      `INSERT INTO rate_limit_hits (key, window_start, count)
       VALUES ($1, $2::timestamptz, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limit_hits.count + 1
       RETURNING count;`,
      [staffRateKey, windowStart]
    );

    if (staffRes.rows[0].count > SCAN_RATE_LIMIT_STAFF_MAX) {
      return { allowed: false, reason: "STAFF_LIMIT" };
    }

    // 2. Cek rate limit per IP
    const ipRes = await tx.query<{ count: number }>(
      `INSERT INTO rate_limit_hits (key, window_start, count)
       VALUES ($1, $2::timestamptz, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limit_hits.count + 1
       RETURNING count;`,
      [ipRateKey, windowStart]
    );

    if (ipRes.rows[0].count > SCAN_RATE_LIMIT_IP_MAX) {
      return { allowed: false, reason: "IP_LIMIT" };
    }

    return { allowed: true };
  });
}
