import fs from "node:fs";
import path from "node:path";

function ensureEnvLoaded(): void {
  if (process.env.SESSION_SECRET && process.env.HASH_PEPPER) {
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

export function getSessionSecret(): string {
  ensureEnvLoaded();
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diatur atau panjangnya kurang dari 32 karakter."
    );
  }
  return secret;
}

export function getHashPepper(): string {
  ensureEnvLoaded();
  const pepper = process.env.HASH_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error(
      "HASH_PEPPER belum diatur atau panjangnya kurang dari 32 karakter."
    );
  }
  return pepper;
}

export function getOtpMode(): string {
  ensureEnvLoaded();
  return (process.env.OTP_MODE || "").trim();
}

export function getVercelEnv(): string {
  ensureEnvLoaded();
  return (process.env.VERCEL_ENV || "").trim();
}

export function getAppOrigin(): string {
  ensureEnvLoaded();
  return process.env.APP_ORIGIN || "http://localhost:3000";
}

export function isProduction(): boolean {
  const vercelEnv = getVercelEnv();
  if (vercelEnv === "production") return true;
  return process.env.NODE_ENV === "production" && vercelEnv !== "";
}
