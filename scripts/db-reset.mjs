import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

/**
 * allowRemote hanya dipakai oleh db:migrate dan db:seed untuk database DEMO di Supabase.
 * Syaratnya semua terpenuhi: opsi allowRemote, DB_ALLOW_REMOTE_DEMO=yes, dan host *.supabase.com / *.supabase.co.
 * db:reset TIDAK pernah memakai opsi ini, jadi tetap hanya bisa menyentuh localhost.
 */
export function resolveAdminDatabaseUrl({ allowRemote = false } = {}) {
  loadEnvLocal();
  const useTest =
    process.env.DB_TARGET === "test" || process.argv.includes("--test");
  const rawUrl = useTest
    ? process.env.DATABASE_ADMIN_URL_TEST
    : process.env.DATABASE_ADMIN_URL;

  if (!rawUrl) {
    console.error(
      `[db] Variabel lingkungan ${useTest ? "DATABASE_ADMIN_URL_TEST" : "DATABASE_ADMIN_URL"} belum diatur.`
    );
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    console.error("[db] Format URL database tidak valid.");
    process.exit(1);
  }

  const host = parsed.hostname;
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  const remoteDemoOk =
    allowRemote &&
    process.env.DB_ALLOW_REMOTE_DEMO === "yes" &&
    /\.supabase\.(com|co)$/.test(host);
  if (remoteDemoOk) {
    console.warn(`[db-safety] PERINGATAN: memakai database DEMO jarak jauh (${host}, ${dbName}). Jangan arahkan ke data nyata.`);
    return { connectionString: rawUrl, dbName, host };
  }

  if (host !== "localhost" && host !== "127.0.0.1") {
    console.error(
      `[db-safety] DITOLAK: host "${host}" bukan localhost atau 127.0.0.1.`
    );
    process.exit(1);
  }

  if (!dbName.endsWith("_dev") && !dbName.endsWith("_test")) {
    console.error(
      `[db-safety] DITOLAK: nama database "${dbName}" wajib berakhiran _dev atau _test.`
    );
    process.exit(1);
  }

  if (dbName !== "aksespass_dev" && dbName !== "aksespass_test") {
    console.error(
      `[db-safety] DITOLAK: hanya aksespass_dev dan aksespass_test yang diizinkan (diterima: "${dbName}").`
    );
    process.exit(1);
  }

  return { connectionString: rawUrl, dbName, host };
}

async function main() {
  const { connectionString, dbName, host } = resolveAdminDatabaseUrl();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER;");
    await client.query("GRANT ALL ON SCHEMA public TO public;");
    await client.query("COMMIT");
    console.log(`[db:reset] Schema public pada ${dbName} (${host}) berhasil di-reset.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("[db:reset] Gagal:", err.message || err);
    process.exit(1);
  });
}
