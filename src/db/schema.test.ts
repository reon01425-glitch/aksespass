import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_NOTE_MAX_LENGTH } from "./index";

const rootDir = path.resolve(__dirname, "..", "..");

function getTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("Skema PostgreSQL aksespass_test (Bagian 2a)", () => {
  let client: pg.Client;

  beforeAll(async () => {
    const testUrl = getTestDbUrl();
    const env = {
      ...process.env,
      DB_TARGET: "test",
      DATABASE_ADMIN_URL_TEST: testUrl,
    };

    execFileSync("node", ["scripts/db-reset.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });
    execFileSync("node", ["scripts/db-migrate.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });
    execFileSync("node", ["scripts/db-seed.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });

    client = new pg.Client({ connectionString: testUrl });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it("menolak catatan petugas (staff_note) yang melebihi batas panjang maksimum", async () => {
    const tooLongNote = "x".repeat(STAFF_NOTE_MAX_LENGTH + 1);

    await expect(
      client.query(
        `
        INSERT INTO visits (
          patient_user_id, facility_id, staff_user_id, channel, recorded_need_codes, staff_note, client_id
        ) VALUES (
          '22222222-2222-4222-8222-222222222101',
          '11111111-1111-4111-8111-111111111101',
          '22222222-2222-4222-8222-222222222301',
          'qr',
          ARRAY['komunikasi_tertulis']::text[],
          $1,
          'test-client-note-too-long'
        );
        `,
        [tooLongNote]
      )
    ).rejects.toThrow();
  });

  it("menolak client_id duplikat pada tabel visits", async () => {
    const duplicateClientId = "seed-visit-client-01";

    await expect(
      client.query(
        `
        INSERT INTO visits (
          patient_user_id, facility_id, staff_user_id, channel, recorded_need_codes, staff_note, client_id
        ) VALUES (
          '22222222-2222-4222-8222-222222222101',
          '11111111-1111-4111-8111-111111111101',
          '22222222-2222-4222-8222-222222222301',
          'qr',
          ARRAY['komunikasi_tertulis']::text[],
          'Catatan singkat valid',
          $1
        );
        `,
        [duplicateClientId]
      )
    ).rejects.toThrow();
  });

  it("menolak consent dengan shared_fields kosong", async () => {
    await expect(
      client.query(
        `
        INSERT INTO consents (
          patient_user_id, facility_id, shared_fields, valid_from, valid_until, created_by_user_id
        ) VALUES (
          '22222222-2222-4222-8222-222222222101',
          '11111111-1111-4111-8111-111111111101',
          '{}'::text[],
          now(),
          now() + interval '2 hours',
          '22222222-2222-4222-8222-222222222101'
        );
        `
      )
    ).rejects.toThrow();
  });

  it("tidak memiliki kolom bernama token selain token_hash di information_schema", async () => {
    const res = await client.query<{
      table_name: string;
      column_name: string;
    }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name ILIKE '%token%'
      ORDER BY table_name, column_name;
    `);

    expect(res.rows).toEqual([
      {
        table_name: "consent_qr",
        column_name: "token_hash",
      },
    ]);
  });
});
