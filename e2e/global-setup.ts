import { execFileSync } from "node:child_process";
import { loadEnvLocal } from "./helpers/env";

export default async function globalSetup() {
  loadEnvLocal();
  if (!process.env.DATABASE_URL_TEST || !process.env.DATABASE_ADMIN_URL_TEST) {
    throw new Error("DATABASE_URL_TEST dan DATABASE_ADMIN_URL_TEST wajib ada di .env.local");
  }
  if (process.env.E2E_SKIP_SEED === "1") return;
  const env = { ...process.env, DB_TARGET: "test" };
  execFileSync("node", ["scripts/db-migrate.mjs"], { env, stdio: "inherit" });
  execFileSync("node", ["scripts/db-seed.mjs"], { env, stdio: "inherit" });
}
