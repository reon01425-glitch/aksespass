import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveAdminDatabaseUrl } from "./db-reset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "..", "src", "db", "migrations");

async function main() {
  const { connectionString, dbName } = resolveAdminDatabaseUrl();
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const appliedRes = await client.query(
      "SELECT filename FROM schema_migrations ORDER BY filename ASC;"
    );
    const appliedSet = new Set(appliedRes.rows.map((r) => r.filename));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d{3}_.+\.sql$/.test(f))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1);",
          [file]
        );
        await client.query("COMMIT");
        appliedCount += 1;
        console.log(`[db:migrate] (${dbName}) Diterapkan: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log(
        `[db:migrate] (${dbName}) Tidak ada migrasi baru (0 dijalankan).`
      );
    } else {
      console.log(
        `[db:migrate] (${dbName}) Selesai: ${appliedCount} migrasi diterapkan.`
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db:migrate] Gagal:", err.message || err);
  process.exit(1);
});
