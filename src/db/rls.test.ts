import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "./index";

const rootDir = path.resolve(__dirname, "..", "..");

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

const IDS = {
  facilities: {
    a: "11111111-1111-4111-8111-111111111101",
    b: "11111111-1111-4111-8111-111111111102",
  },
  users: {
    p1: "22222222-2222-4222-8222-222222222101",
    p2: "22222222-2222-4222-8222-222222222102",
    p3: "22222222-2222-4222-8222-222222222103",
    p4: "22222222-2222-4222-8222-222222222104",
    comp1: "22222222-2222-4222-8222-222222222201",
    staffA1: "22222222-2222-4222-8222-222222222301",
    staffA2Inactive: "22222222-2222-4222-8222-222222222302",
    staffB1: "22222222-2222-4222-8222-222222222303",
    adminA: "22222222-2222-4222-8222-222222222401",
  },
  auditSubjects: {
    p1: "aaaa1111-1111-4111-8111-111111111101",
  },
  consents: {
    c1: "44444444-4444-4444-8444-444444444101",
    c2: "44444444-4444-4444-8444-444444444102",
    c3: "44444444-4444-4444-8444-444444444103",
  },
};

describe("Peran DB, RLS per transaksi, audit append-only, dan state Postgres (Bagian 2b)", () => {
  let adminClient: pg.Client;

  beforeAll(async () => {
    const adminTestUrl = getAdminTestDbUrl();
    const env = {
      ...process.env,
      DB_TARGET: "test",
      DATABASE_ADMIN_URL_TEST: adminTestUrl,
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

    adminClient = new pg.Client({ connectionString: adminTestUrl });
    await adminClient.connect();
  });

  afterAll(async () => {
    if (adminClient) {
      await adminClient.end();
    }
  });

  it("peran aplikasi: UPDATE dan DELETE pada audit_events ditolak database (permission denied)", async () => {
    await expect(
      withContext({ userId: IDS.users.p1, role: "patient" }, (client) =>
        client.query("UPDATE audit_events SET occurred_at = now();")
      )
    ).rejects.toThrow(/permission denied for table audit_events/i);

    await expect(
      withContext({ userId: IDS.users.p1, role: "patient" }, (client) =>
        client.query("DELETE FROM audit_events;")
      )
    ).rejects.toThrow(/permission denied for table audit_events/i);

    // INSERT dengan konteks diizinkan dan SELECT hanya mengembalikan baris milik subjek pasien sendiri
    const rows = await withContext(
      { userId: IDS.users.p1, role: "patient" },
      async (client) => {
        await client.query(
          `INSERT INTO audit_events (event_type, actor_id, actor_role, subject_ref, facility_id)
           VALUES ('qr_created', $1, 'patient', $2, $3);`,
          [IDS.users.p1, IDS.auditSubjects.p1, IDS.facilities.a]
        );
        const res = await client.query<{ subject_ref: string }>(
          "SELECT subject_ref FROM audit_events;"
        );
        return res.rows;
      }
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.subject_ref === IDS.auditSubjects.p1)).toBe(
      true
    );

    // Tabel katalog/aturan/fasilitas: aplikasi hanya boleh SELECT
    await expect(
      withContext({}, (client) =>
        client.query("DELETE FROM needs_catalog WHERE code = 'panduan_verbal';")
      )
    ).rejects.toThrow(/permission denied for table needs_catalog/i);

    await expect(
      withContext({}, (client) =>
        client.query("UPDATE facilities SET status = 'inactive';")
      )
    ).rejects.toThrow(/permission denied for table facilities/i);
  });

  it("pg_roles: aksespass_app bukan superuser, tanpa BYPASSRLS, dan bukan pemilik tabel", async () => {
    const info = await withContext({}, async (client) => {
      const roleRes = await client.query<{
        current_user: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
      }>(`
        SELECT
          current_user,
          rolsuper,
          rolbypassrls,
          rolcreatedb,
          rolcreaterole
        FROM pg_roles
        WHERE rolname = 'aksespass_app';
      `);

      const tablesRes = await client.query<{
        tablename: string;
        tableowner: string;
      }>(`
        SELECT tablename, tableowner
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);

      return {
        role: roleRes.rows[0],
        tables: tablesRes.rows,
      };
    });

    expect(info.role).toEqual({
      current_user: "aksespass_app",
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
    });

    expect(info.tables.length).toBeGreaterThanOrEqual(15);
    expect(info.tables.some((t) => t.tableowner === "aksespass_app")).toBe(
      false
    );
    expect(info.tables.every((t) => t.tableowner === "aksespass_owner")).toBe(
      true
    );
  });

  it("tanpa konteks: SELECT patient_profiles, consents, visits = 0 baris", async () => {
    const counts = await withContext({}, async (client) => {
      const profiles = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM patient_profiles;"
      );
      const consents = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM consents;"
      );
      const visits = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM visits;"
      );
      return {
        profiles: profiles.rows[0].count,
        consents: consents.rows[0].count,
        visits: visits.rows[0].count,
      };
    });

    expect(counts).toEqual({
      profiles: 0,
      consents: 0,
      visits: 0,
    });
  });

  it("Pasien Contoh 1 hanya melihat profilnya sendiri; tidak melihat profil pasien lain", async () => {
    const rows = await withContext(
      { userId: IDS.users.p1, role: "patient" },
      async (client) => {
        const res = await client.query<{
          user_id: string;
          preferred_name: string;
        }>("SELECT user_id, preferred_name FROM patient_profiles;");
        return res.rows;
      }
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(IDS.users.p1);
  });

  it("petugas fasilitas A tidak melihat visits fasilitas B", async () => {
    const visits = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
      },
      async (client) => {
        const allVisible = await client.query<{ facility_id: string }>(
          "SELECT facility_id FROM visits;"
        );
        const directFacilityB = await client.query<{ id: string }>(
          "SELECT id FROM visits WHERE facility_id = $1;",
          [IDS.facilities.b]
        );
        return {
          allVisible: allVisible.rows,
          directFacilityB: directFacilityB.rows,
        };
      }
    );

    expect(visits.allVisible.length).toBeGreaterThan(0);
    expect(
      visits.allVisible.every((v) => v.facility_id === IDS.facilities.a)
    ).toBe(true);
    expect(visits.directFacilityB).toHaveLength(0);
  });

  it("petugas tanpa scan_token_hash = 0 baris profil; dengan hash token valid untuk fasilitasnya = 1 baris; hash token consent fasilitas lain, kedaluwarsa, atau dicabut = 0 baris", async () => {
    const validHashFacilityA = sha256Hex("contoh-seed-qr-p1-aktif");
    const validHashFacilityB = sha256Hex("contoh-seed-qr-p3-aktif");
    const expiredHashFacilityA = sha256Hex("contoh-test-qr-p2-kedaluwarsa");
    const revokedHashFacilityA = sha256Hex("contoh-test-qr-p2-dicabut");

    // Siapkan 1 QR kedaluwarsa dan 1 QR dicabut untuk consent Fasilitas A lewat koneksi admin
    await adminClient.query(
      `
      INSERT INTO consent_qr (id, consent_id, token_hash, expires_at, revoked_at)
      VALUES
        ('88888888-8888-4888-8888-888888888201', $1, $2, now() - interval '15 minutes', NULL),
        ('88888888-8888-4888-8888-888888888202', $1, $3, now() + interval '2 hours', now() - interval '5 minutes')
      ON CONFLICT (id) DO NOTHING;
      `,
      [IDS.consents.c2, expiredHashFacilityA, revokedHashFacilityA]
    );

    // 1. Tanpa scan_token_hash -> 0 baris
    const noTokenRows = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
      },
      async (client) => {
        const res = await client.query("SELECT id FROM patient_profiles;");
        return res.rows;
      }
    );
    expect(noTokenRows).toHaveLength(0);

    // 2. Hash token valid untuk fasilitas A -> 1 baris (Pasien Contoh 1)
    const validRows = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
        scanTokenHash: validHashFacilityA,
      },
      async (client) => {
        const res = await client.query<{ user_id: string }>(
          "SELECT user_id FROM patient_profiles;"
        );
        return res.rows;
      }
    );
    expect(validRows).toEqual([{ user_id: IDS.users.p1 }]);

    // 3. Hash token consent untuk fasilitas B dipakai petugas fasilitas A -> 0 baris
    const wrongFacilityRows = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
        scanTokenHash: validHashFacilityB,
      },
      async (client) => {
        const res = await client.query("SELECT id FROM patient_profiles;");
        return res.rows;
      }
    );
    expect(wrongFacilityRows).toHaveLength(0);

    // 4. Hash token kedaluwarsa -> 0 baris
    const expiredRows = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
        scanTokenHash: expiredHashFacilityA,
      },
      async (client) => {
        const res = await client.query("SELECT id FROM patient_profiles;");
        return res.rows;
      }
    );
    expect(expiredRows).toHaveLength(0);

    // 5. Hash token dicabut -> 0 baris
    const revokedRows = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
        scanTokenHash: revokedHashFacilityA,
      },
      async (client) => {
        const res = await client.query("SELECT id FROM patient_profiles;");
        return res.rows;
      }
    );
    expect(revokedRows).toHaveLength(0);
  });

  it("admin fasilitas: 0 baris dari patient_profiles, consents, visits (tetap bisa melihat daftar petugas fasilitasnya)", async () => {
    const result = await withContext(
      {
        userId: IDS.users.adminA,
        role: "facility_admin",
        facilityId: IDS.facilities.a,
      },
      async (client) => {
        const profiles = await client.query("SELECT id FROM patient_profiles;");
        const consents = await client.query("SELECT id FROM consents;");
        const visits = await client.query("SELECT id FROM visits;");
        const confirmations = await client.query(
          "SELECT id FROM visit_confirmations;"
        );
        const staffUsers = await client.query<{ id: string; role: string }>(
          "SELECT id, role FROM users WHERE role = 'staff' ORDER BY id;"
        );
        return {
          profilesCount: profiles.rowCount ?? 0,
          consentsCount: consents.rowCount ?? 0,
          visitsCount: visits.rowCount ?? 0,
          confirmationsCount: confirmations.rowCount ?? 0,
          staffUserIds: staffUsers.rows.map((u) => u.id),
        };
      }
    );

    expect(result.profilesCount).toBe(0);
    expect(result.consentsCount).toBe(0);
    expect(result.visitsCount).toBe(0);
    expect(result.confirmationsCount).toBe(0);
    expect(result.staffUserIds).toEqual([
      IDS.users.staffA1,
      IDS.users.staffA2Inactive,
    ]);
  });

  it("pendamping aktif melihat profil Pasien Contoh 4; setelah status companions diubah ke revoked (lewat URL admin) = 0 baris", async () => {
    try {
      const activeRows = await withContext(
        {
          userId: IDS.users.comp1,
          role: "companion",
        },
        async (client) => {
          const res = await client.query<{ user_id: string }>(
            "SELECT user_id FROM patient_profiles;"
          );
          return res.rows;
        }
      );

      expect(activeRows).toEqual([{ user_id: IDS.users.p4 }]);

      await adminClient.query(
        `UPDATE companions
         SET status = 'revoked', revoked_at = now()
         WHERE patient_user_id = $1 AND companion_user_id = $2;`,
        [IDS.users.p4, IDS.users.comp1]
      );

      const afterRevokeRows = await withContext(
        {
          userId: IDS.users.comp1,
          role: "companion",
        },
        async (client) => {
          const res = await client.query<{ user_id: string }>(
            "SELECT user_id FROM patient_profiles;"
          );
          return res.rows;
        }
      );

      expect(afterRevokeRows).toHaveLength(0);
    } finally {
      await adminClient.query(
        `UPDATE companions
         SET status = 'active', revoked_at = NULL
         WHERE patient_user_id = $1 AND companion_user_id = $2;`,
        [IDS.users.p4, IDS.users.comp1]
      );
    }
  });

  it("kebocoran konteks: pada client pool yang SAMA, transaksi 1 dengan konteks petugas A, transaksi 2 tanpa konteks -> transaksi 2 = 0 baris dan current_setting kosong", async () => {
    const validHashFacilityA = sha256Hex("contoh-seed-qr-p1-aktif");

    const tx1 = await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
        scanTokenHash: validHashFacilityA,
      },
      async (client) => {
        const pidRes = await client.query<{ pid: number }>(
          "SELECT pg_backend_pid() AS pid;"
        );
        const visitsRes = await client.query("SELECT id FROM visits;");
        const profilesRes = await client.query(
          "SELECT id FROM patient_profiles;"
        );

        // Uji langsung di atas koneksi pool yang sama: setelah COMMIT transaksi 1,
        // transaksi baru tanpa set_config tidak mewarisi setting transaksi sebelumnya.
        return {
          pid: pidRes.rows[0].pid,
          visitsCount: visitsRes.rowCount ?? 0,
          profilesCount: profilesRes.rowCount ?? 0,
        };
      }
    );

    expect(tx1.visitsCount).toBeGreaterThan(0);
    expect(tx1.profilesCount).toBe(1);

    const tx2 = await withContext({}, async (client) => {
      const pidRes = await client.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid;"
      );
      const settingsRes = await client.query<{
        user_id: string;
        role: string;
        facility_id: string;
        scan_token_hash: string;
      }>(`
        SELECT
          coalesce(current_setting('app.user_id', true), '') AS user_id,
          coalesce(current_setting('app.role', true), '') AS role,
          coalesce(current_setting('app.facility_id', true), '') AS facility_id,
          coalesce(current_setting('app.scan_token_hash', true), '') AS scan_token_hash;
      `);
      const visitsRes = await client.query("SELECT id FROM visits;");
      const profilesRes = await client.query(
        "SELECT id FROM patient_profiles;"
      );

      return {
        pid: pidRes.rows[0].pid,
        settings: settingsRes.rows[0],
        visitsCount: visitsRes.rowCount ?? 0,
        profilesCount: profilesRes.rowCount ?? 0,
      };
    });

    expect(tx2.pid).toBe(tx1.pid);
    expect(tx2.settings).toEqual({
      user_id: "",
      role: "",
      facility_id: "",
      scan_token_hash: "",
    });
    expect(tx2.visitsCount).toBe(0);
    expect(tx2.profilesCount).toBe(0);
  });

  it("rate_limit_hits: dua upsert pada key dan jendela sama menghasilkan count 2, terbaca dari koneksi baru", async () => {
    const key = "scan:staff:22222222-2222-4222-8222-222222222301";
    const windowStart = "2026-10-13T14:00:00.000Z";

    const upsertSql = `
      INSERT INTO rate_limit_hits (key, window_start, count)
      VALUES ($1, $2::timestamptz, 1)
      ON CONFLICT (key, window_start)
      DO UPDATE SET count = rate_limit_hits.count + 1
      RETURNING count;
    `;

    const firstCount = await withContext({}, async (client) => {
      const res = await client.query<{ count: number }>(upsertSql, [
        key,
        windowStart,
      ]);
      return res.rows[0].count;
    });

    const secondCount = await withContext({}, async (client) => {
      const res = await client.query<{ count: number }>(upsertSql, [
        key,
        windowStart,
      ]);
      return res.rows[0].count;
    });

    expect(firstCount).toBe(1);
    expect(secondCount).toBe(2);

    // Baca dari koneksi baru terpisah (bukan dari pool) untuk membuktikan persistensi di Postgres
    const appTestUrl =
      process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!;
    const freshClient = new pg.Client({ connectionString: appTestUrl });
    await freshClient.connect();
    try {
      const verifyRes = await freshClient.query<{ count: number }>(
        "SELECT count FROM rate_limit_hits WHERE key = $1 AND window_start = $2::timestamptz;",
        [key, windowStart]
      );
      expect(verifyRes.rows).toEqual([{ count: 2 }]);
    } finally {
      await freshClient.end();
    }
  });
});
