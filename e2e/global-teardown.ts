import { adminQuery, resetRateLimits } from "./helpers/db";

/** Bersihkan batas permintaan agar tes Vitest yang memakai database tes yang sama tidak kena 429. */
export default async function globalTeardown() {
  await resetRateLimits();
  await adminQuery("DELETE FROM otp_codes");
}
