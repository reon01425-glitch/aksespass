import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetLogSink, setLogSink } from "../privacy";
import { hmacSha256Hex, normalizePhoneNumber } from "./crypto";
import { getHashPepper } from "./env";
import { logout, requireSession } from "./guard";
import { requestOtp, verifyOtp } from "./otp";
import {
  createSessionCookieValue,
  extractSessionCookieFromHeader,
  verifySessionCookie,
  type SessionClaims,
} from "./session";

const rootDir = path.resolve(__dirname, "..", "..", "..");

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("Autentikasi, Sesi Bertanda Tangan, Guard, OTP Tiruan, dan RLS (Bagian 3b)", () => {
  let adminClient: pg.Client;
  const capturedLogs: Array<{ level: string; data: Record<string, unknown> }> =
    [];

  beforeAll(async () => {
    const adminTestUrl = getAdminTestDbUrl();
    const env = {
      ...process.env,
      DB_TARGET: "test",
      DATABASE_ADMIN_URL_TEST: adminTestUrl,
      SESSION_SECRET:
        process.env.SESSION_SECRET ||
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      HASH_PEPPER:
        process.env.HASH_PEPPER ||
        "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      OTP_MODE: "dev-display",
      APP_ORIGIN: "http://localhost:3000",
    };

    // Pastikan env terpasang di process.env untuk pengujian
    process.env.SESSION_SECRET = env.SESSION_SECRET;
    process.env.HASH_PEPPER = env.HASH_PEPPER;
    process.env.OTP_MODE = env.OTP_MODE;
    process.env.APP_ORIGIN = env.APP_ORIGIN;

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

    // Pasang sink penangkap log
    setLogSink((level, data) => {
      capturedLogs.push({ level, data });
    });
  });

  afterAll(async () => {
    resetLogSink();
    if (adminClient) {
      await adminClient.end();
    }
  });

  beforeEach(async () => {
    if (adminClient) {
      await adminClient.query("TRUNCATE rate_limit_hits;");
    }
  });

  describe("1. Normalisasi Nomor Telepon Indonesia", () => {
    it("menormalisasi awalan 08... menjadi +628...", () => {
      expect(normalizePhoneNumber("081234567890")).toBe("+6281234567890");
    });

    it("menghapus spasi dan tanda hubung pada nomor 08...", () => {
      expect(normalizePhoneNumber("0812-3456-7890")).toBe("+6281234567890");
      expect(normalizePhoneNumber("  0812 3456 7890  ")).toBe("+6281234567890");
    });

    it("menormalisasi awalan 628... menjadi +628...", () => {
      expect(normalizePhoneNumber("6281234567890")).toBe("+6281234567890");
    });

    it("mempertahankan nomor valid yang sudah berformat +628...", () => {
      expect(normalizePhoneNumber("+6281234567890")).toBe("+6281234567890");
    });

    it("menerima nomor sintetis seed yang berawalan +620...", () => {
      expect(normalizePhoneNumber("+620000000011")).toBe("+620000000011");
    });

    it("menolak format yang tidak valid", () => {
      expect(() => normalizePhoneNumber("")).toThrow(/tidak boleh kosong/i);
      expect(() => normalizePhoneNumber("12345")).toThrow(/tidak valid/i);
      expect(() => normalizePhoneNumber("abcdefghijk")).toThrow(/tidak valid/i);
      expect(() => normalizePhoneNumber("0712345678")).toThrow(/tidak valid/i);
      expect(() => normalizePhoneNumber("+1234567890")).toThrow(/tidak valid/i);
    });
  });

  describe("2. Alur OTP Tiruan dan Cookie Sesi Bertanda Tangan", () => {
    it("alur lengkap: request → devOtp dikembalikan → verify benar → cookie sesi lengkap", async () => {
      const testPhone = "081299990001";
      const reqRes = await requestOtp(testPhone, { ip: "192.168.1.10" });

      expect(reqRes.success).toBe(true);
      expect(reqRes.devOtp).toBeDefined();
      expect(reqRes.devOtp).toMatch(/^\d{6}$/);

      const verifyRes = await verifyOtp(testPhone, reqRes.devOtp!, {
        intendedRole: "patient",
        statsConsent: true,
      });

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.role).toBe("patient");
      expect(verifyRes.destination).toBe("/pasien");
      expect(verifyRes.cookieHeader).toContain("HttpOnly");
      expect(verifyRes.cookieHeader).toContain("SameSite=Lax");
      expect(verifyRes.cookieHeader).toContain("Path=/");
      // Sesi pasien 7 hari
      expect(verifyRes.cookieHeader).toContain(`Max-Age=${7 * 86400}`);

      // Ekstrak cookie dan verifikasi pure
      const cookieVal = extractSessionCookieFromHeader(verifyRes.cookieHeader);
      expect(cookieVal).toBeTruthy();
      const claims = await verifySessionCookie(cookieVal);
      expect(claims).not.toBeNull();
      expect(claims?.userId).toBe(verifyRes.userId);
      expect(claims?.role).toBe("patient");
    });

    it("masa berlaku cookie petugas adalah 8 jam", async () => {
      // Petugas aktif dari seed (+620000000011)
      const staffPhone = "+620000000011";
      const reqRes = await requestOtp(staffPhone);
      expect(reqRes.devOtp).toBeDefined();

      const verifyRes = await verifyOtp(staffPhone, reqRes.devOtp!);
      expect(verifyRes.role).toBe("staff");
      expect(verifyRes.destination).toBe("/petugas");
      expect(verifyRes.cookieHeader).toContain(`Max-Age=${8 * 3600}`);
    });
  });

  describe("3. Validasi Kode OTP: Salah, Kedaluwarsa, Dipakai Ulang, dan Hangus", () => {
    it("kode salah ditolak", async () => {
      const phone = "081299990002";
      await requestOtp(phone);

      await expect(verifyOtp(phone, "000000")).rejects.toThrow(
        /kode verifikasi salah/i
      );
    });

    it("kode kedaluwarsa ditolak", async () => {
      const phone = "081299990003";
      const req = await requestOtp(phone);
      const pepper = getHashPepper();
      const phoneHash = hmacSha256Hex(pepper, normalizePhoneNumber(phone));

      // Mundurkan expires_at di DB admin
      await adminClient.query(
        "UPDATE otp_codes SET expires_at = now() - interval '1 minute' WHERE phone_hash = $1;",
        [phoneHash]
      );

      await expect(verifyOtp(phone, req.devOtp!)).rejects.toThrow(
        /telah kedaluwarsa/i
      );
    });

    it("kode yang sudah digunakan ditolak saat dipakai ulang", async () => {
      const phone = "081299990004";
      const req = await requestOtp(phone);

      const first = await verifyOtp(phone, req.devOtp!, { intendedRole: "patient" });
      expect(first.success).toBe(true);

      await expect(verifyOtp(phone, req.devOtp!)).rejects.toThrow(
        /sudah digunakan/i
      );
    });

    it("percobaan ke-6 ditolak dan kode hangus walau kodenya benar", async () => {
      const phone = "081299990005";
      const req = await requestOtp(phone);

      // Lakukan 5 percobaan salah
      for (let i = 0; i < 5; i++) {
        await expect(verifyOtp(phone, "999999")).rejects.toThrow();
      }

      // Percobaan ke-6 dengan kode asli yang benar
      await expect(verifyOtp(phone, req.devOtp!)).rejects.toThrow(
        /batas percobaan telah tercapai/i
      );
    });
  });

  describe("4. Rate Limit Request OTP di Postgres", () => {
    it("rate limit per telepon memblokir setelah batas dan tetap memblokir setelah koneksi baru", async () => {
      const phone = "081299990006";

      // Batas OTP_RATE_LIMIT_PHONE_MAX = 3
      await requestOtp(phone);
      await requestOtp(phone);
      await requestOtp(phone);

      // Permintaan ke-4 harus diblokir
      await expect(requestOtp(phone)).rejects.toThrow(
        /terlalu banyak permintaan otp untuk nomor ini/i
      );

      // Verifikasi koneksi baru terpisah (simulasi restart / fresh client)
      const testAppUrl =
        process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!;
      const freshClient = new pg.Client({ connectionString: testAppUrl });
      await freshClient.connect();
      try {
        const pepper = getHashPepper();
        const phoneHash = hmacSha256Hex(pepper, normalizePhoneNumber(phone));
        const key = `otp:req:phone:${phoneHash}`;

        const res = await freshClient.query<{ count: number }>(
          "SELECT count FROM rate_limit_hits WHERE key = $1;",
          [key]
        );
        expect(res.rows[0].count).toBeGreaterThanOrEqual(3);
      } finally {
        await freshClient.end();
      }
    });

    it("rate limit per IP memblokir setelah batas 10 permintaan", async () => {
      const ip = "10.10.10.99";

      // Lakukan 10 permintaan dari nomor berbeda namun IP sama
      for (let i = 1; i <= 10; i++) {
        const p = `0812999910${String(i).padStart(2, "0")}`;
        await requestOtp(p, { ip });
      }

      // Permintaan ke-11 dari IP yang sama harus diblokir
      const pNext = "081299991099";
      await expect(requestOtp(pNext, { ip })).rejects.toThrow(
        /terlalu banyak permintaan otp dari jaringan ini/i
      );
    });
  });

  describe("5. Kontrol Mode OTP dan Lingkungan Produksi", () => {
    it("OTP_MODE kosong mengembalikan galat tanpa kode", async () => {
      const prevMode = process.env.OTP_MODE;
      process.env.OTP_MODE = "";
      try {
        await expect(requestOtp("081299992001")).rejects.toThrow(
          /penyedia otp belum dikonfigurasi/i
        );
      } finally {
        process.env.OTP_MODE = prevMode;
      }
    });

    it("dev-display + VERCEL_ENV=production ditolak", async () => {
      const prevVercelEnv = process.env.VERCEL_ENV;
      process.env.VERCEL_ENV = "production";
      try {
        await expect(requestOtp("081299992002")).rejects.toThrow(
          /mode otp dev-display tidak diizinkan di lingkungan produksi/i
        );
      } finally {
        process.env.VERCEL_ENV = prevVercelEnv;
      }
    });

    it("respons request OTP untuk nomor terdaftar dan belum terdaftar identik", async () => {
      const registeredPhone = "+620000000001"; // Pasien dari seed
      const unregisteredPhone = "081299992003";

      const resRegistered = await requestOtp(registeredPhone);
      const resUnregistered = await requestOtp(unregisteredPhone);

      expect(resRegistered.success).toBe(resUnregistered.success);
      expect(resRegistered.message).toBe(resUnregistered.message);
      // Keduanya memuat devOtp jika dev-display
      expect(Boolean(resRegistered.devOtp)).toBe(Boolean(resUnregistered.devOtp));
    });
  });

  describe("6. Keamanan Data Diam (Hash Saja) dan Scrubber Logger", () => {
    it("otp_codes tidak menyimpan kode atau nomor telepon asli di Postgres", async () => {
      const res = await adminClient.query<{
        phone_hash: string;
        code_hash: string;
      }>("SELECT phone_hash, code_hash FROM otp_codes;");

      expect(res.rows.length).toBeGreaterThan(0);
      for (const row of res.rows) {
        expect(row.phone_hash.length).toBeGreaterThanOrEqual(32);
        expect(row.code_hash.length).toBeGreaterThanOrEqual(32);
        // Pastikan tidak ada format telepon mentah
        expect(row.phone_hash).not.toContain("+62");
        expect(row.phone_hash).not.toMatch(/^(?:\+62|62|08)\d{7,13}$/);
        // Pastikan bukan kode 6 digit mentah
        expect(row.code_hash).not.toMatch(/^\d{6}$/);
      }
    });

    it("seluruh output logger yang ditangkap tidak memuat kode OTP atau nomor telepon", () => {
      expect(capturedLogs.length).toBeGreaterThan(0);
      const logDump = JSON.stringify(capturedLogs);

      // Tidak boleh ada nomor telepon Indonesia nyata/sintetis
      expect(logDump).not.toMatch(/(?:\+62|62|08)\d{7,13}/);
      // Tidak boleh ada kode 6 digit mandiri dalam log
      expect(logDump).not.toMatch(/"\d{6}"/);
    });
  });

  describe("7. Otorisasi Pendaftaran Pengguna Baru", () => {
    it("nomor yang sudah terdaftar sebagai pasien ditolak saat memilih peran pendamping, dan sebaliknya", async () => {
      const phone = "081299993777";
      const first = await requestOtp(phone);
      const patient = await verifyOtp(phone, first.devOtp!, { intendedRole: "patient" });
      expect(patient.role).toBe("patient");

      const second = await requestOtp(phone);
      await expect(
        verifyOtp(phone, second.devOtp!, { intendedRole: "companion" })
      ).rejects.toThrow(/sudah terdaftar sebagai pasien/);

      // Kode tidak hangus karena penolakan: tetap bisa dipakai pada peran yang benar
      const again = await verifyOtp(phone, second.devOtp!, { intendedRole: "patient" });
      expect(again.role).toBe("patient");

      const cPhone = "081299993778";
      const c1 = await requestOtp(cPhone);
      const companion = await verifyOtp(cPhone, c1.devOtp!, { intendedRole: "companion" });
      expect(companion.role).toBe("companion");
      const c2 = await requestOtp(cPhone);
      await expect(
        verifyOtp(cPhone, c2.devOtp!, { intendedRole: "patient" })
      ).rejects.toThrow(/sudah terdaftar sebagai pendamping/);
    });

    it("nomor baru dengan intendedRole patient membuat akun pasien", async () => {
      const newPhone = "081299993001";
      const req = await requestOtp(newPhone);
      const verify = await verifyOtp(newPhone, req.devOtp!, {
        intendedRole: "patient",
        statsConsent: true,
      });

      expect(verify.role).toBe("patient");
      expect(verify.destination).toBe("/pasien");

      // Cek di DB bahwa akun tersimpan dengan role patient dan stats_consent = true
      const userRes = await adminClient.query<{
        role: string;
        stats_consent: boolean;
      }>("SELECT role, stats_consent FROM users WHERE id = $1;", [verify.userId]);
      expect(userRes.rows[0].role).toBe("patient");
      expect(userRes.rows[0].stats_consent).toBe(true);
    });

    it("nomor baru yang mencoba mendaftar sebagai staff ditolak", async () => {
      const newPhone = "081299993002";
      const req = await requestOtp(newPhone);

      await expect(
        verifyOtp(newPhone, req.devOtp!, {
          intendedRole: "staff",
        })
      ).rejects.toThrow(
        /pendaftaran mandiri hanya diizinkan untuk pasien atau pendamping/i
      );
    });

    it("verify tanpa intendedRole untuk nomor tak dikenal tidak membuat akun (jumlah baris users via URL admin sama sebelum/sesudah)", async () => {
      const unknownPhone = "+620000000098";
      const beforeRes = await adminClient.query<{ count: string }>(
        "SELECT count(*) FROM users;"
      );
      const countBefore = parseInt(beforeRes.rows[0].count, 10);

      const req = await requestOtp(unknownPhone);
      await expect(
        verifyOtp(unknownPhone, req.devOtp!)
      ).rejects.toThrow(/tidak dapat masuk\. hubungi admin fasilitas/i);

      const afterRes = await adminClient.query<{ count: string }>(
        "SELECT count(*) FROM users;"
      );
      const countAfter = parseInt(afterRes.rows[0].count, 10);

      expect(countAfter).toBe(countBefore);
    });
  });

  describe("8. Penolakan Akun Petugas Nonaktif dan Diundang", () => {
    it("petugas nonaktif dari seed tidak mendapat sesi dan pesan hubungi admin fasilitas", async () => {
      // Petugas nonaktif di seed: +620000000012
      const staffInactivePhone = "+620000000012";
      const req = await requestOtp(staffInactivePhone);

      await expect(
        verifyOtp(staffInactivePhone, req.devOtp!)
      ).rejects.toThrow(/tidak dapat masuk\. hubungi admin fasilitas/i);
    });

    it("petugas dengan status keanggotaan invited tidak mendapat sesi", async () => {
      // Buat staf dengan status invited di DB admin
      const invitedPhone = "+620000000099";
      const userRes = await adminClient.query<{ id: string }>(
        `INSERT INTO users (role, phone, display_name, status)
         VALUES ('staff', $1, 'Petugas Undangan', 'active')
         RETURNING id;`,
        [invitedPhone]
      );
      const facilityRes = await adminClient.query<{ id: string }>(
        "SELECT id FROM facilities LIMIT 1;"
      );
      await adminClient.query(
        `INSERT INTO staff_memberships (user_id, facility_id, unit, status)
         VALUES ($1, $2, 'Loket', 'invited');`,
        [userRes.rows[0].id, facilityRes.rows[0].id]
      );

      const req = await requestOtp(invitedPhone);
      await expect(verifyOtp(invitedPhone, req.devOtp!)).rejects.toThrow(
        /tidak dapat masuk\. hubungi admin fasilitas/i
      );
    });
  });

  describe("9. Verifikasi Sesi Tingkat Dua (requireSession)", () => {
    it("cookie dengan klaim peran diubah ditolak tanda tangan kriptografis", async () => {
      const validClaims: SessionClaims = {
        sessionId: "11112222333344445555666677778888",
        userId: "22222222-2222-4222-8222-222222222101",
        role: "patient",
        facilityId: null,
        expiresAt: Date.now() + 60000,
        version: 1,
      };

      const cookieVal = await createSessionCookieValue(validClaims);
      const [, sigB64] = cookieVal.split(".");

      // Palsukan payload dengan mengubah peran menjadi admin
      const forgedPayload = Buffer.from(
        JSON.stringify({ ...validClaims, role: "facility_admin" }),
        "utf8"
      ).toString("base64url");

      const tamperedCookie = `${forgedPayload}.${sigB64}`;
      const verifyRes = await verifySessionCookie(tamperedCookie);
      expect(verifyRes).toBeNull();

      const dummyReq = new Request("http://localhost:3000", {
        headers: { cookie: `aksespass_session=${tamperedCookie}` },
      });
      const reqRes = await requireSession(dummyReq);
      expect(reqRes).toEqual({ ok: false, reason: "INVALID_COOKIE" });
    });

    it("cookie kedaluwarsa ditolak", async () => {
      const expiredClaims: SessionClaims = {
        sessionId: "11112222333344445555666677778888",
        userId: "22222222-2222-4222-8222-222222222101",
        role: "patient",
        facilityId: null,
        expiresAt: Date.now() - 10000, // Lampau
        version: 1,
      };

      const cookieVal = await createSessionCookieValue(expiredClaims);
      const dummyReq = new Request("http://localhost:3000", {
        headers: { cookie: `aksespass_session=${cookieVal}` },
      });
      const reqRes = await requireSession(dummyReq);
      expect(reqRes.ok).toBe(false);
      if (!reqRes.ok) {
        expect(reqRes.reason).toBe("EXPIRED_COOKIE");
      }
    });

    it("sesi yang sudah logout ditolak dengan reason SESSION_REVOKED", async () => {
      const patientPhone = "+620000000001";
      const req = await requestOtp(patientPhone);
      const verify = await verifyOtp(patientPhone, req.devOtp!);

      const dummyReq = new Request("http://localhost:3000", {
        headers: { cookie: verify.cookieHeader.split(";")[0] },
      });

      // requireSession pertama lolos
      const firstCheck = await requireSession(dummyReq);
      expect(firstCheck.ok).toBe(true);

      // Logout
      const logoutRes = await logout(dummyReq);
      expect(logoutRes.ok).toBe(true);
      expect(logoutRes.clearCookieHeader).toContain("Max-Age=0");

      // requireSession kedua setelah logout harus ditolak
      const secondCheck = await requireSession(dummyReq);
      expect(secondCheck.ok).toBe(false);
      if (!secondCheck.ok) {
        expect(secondCheck.reason).toBe("SESSION_REVOKED");
      }
    });

    it("petugas dinonaktifkan setelah login → requireSession berikutnya ditolak dengan MEMBERSHIP_INACTIVE", async () => {
      const staffPhone = "+620000000011";
      const req = await requestOtp(staffPhone);
      const verify = await verifyOtp(staffPhone, req.devOtp!);

      const dummyReq = new Request("http://localhost:3000", {
        headers: { cookie: verify.cookieHeader.split(";")[0] },
      });

      const firstCheck = await requireSession(dummyReq);
      expect(firstCheck.ok).toBe(true);

      // Ubah status keanggotaan petugas menjadi inactive via adminClient
      await adminClient.query(
        "UPDATE staff_memberships SET status = 'inactive' WHERE user_id = $1;",
        [verify.userId]
      );

      const secondCheck = await requireSession(dummyReq);
      expect(secondCheck.ok).toBe(false);
      if (!secondCheck.ok) {
        expect(secondCheck.reason).toBe("MEMBERSHIP_INACTIVE");
      }

      // Kembalikan status ke active untuk kebersihan state tes berikutnya
      await adminClient.query(
        "UPDATE staff_memberships SET status = 'active' WHERE user_id = $1;",
        [verify.userId]
      );
    });
  });

  describe("10. Inspeksi Fungsi SECURITY DEFINER di pg_proc", () => {
    it("proacl hanya memberi EXECUTE ke aksespass_app dan pemilik; proconfig memuat search_path", async () => {
      const res = await adminClient.query<{
        proname: string;
        prosecdef: boolean;
        proconfig: string[] | null;
        proacl: string[] | null;
      }>(`
        SELECT
          p.proname,
          p.prosecdef,
          p.proconfig,
          p.proacl::text[] AS proacl
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('find_user_by_phone_pre_session', 'register_user_pre_session');
      `);

      expect(res.rows.length).toBe(2);
      for (const row of res.rows) {
        expect(row.prosecdef, `${row.proname} harus berupa SECURITY DEFINER`).toBe(
          true
        );
        expect(
          row.proconfig,
          `${row.proname} harus memiliki proconfig search_path`
        ).toEqual(["search_path=public, pg_temp"]);

        expect(row.proacl).not.toBeNull();
        const aclString = row.proacl!.join(",");
        // Hanya aksespass_app dan pemilik (aksespass_owner) yang punya izin EXECUTE (X)
        expect(aclString).toContain("aksespass_app=X");
        // Tidak boleh ada hak untuk PUBLIC (yang ditandai dengan =X di awal string)
        expect(aclString).not.toMatch(/(?:^|,)=X\//);
      }
    });
  });
});
