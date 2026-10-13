import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import {
  ALLOWED_LOG_KEYS,
  FORBIDDEN_LOG_FIELDS,
  logger,
  resetLogSink,
  sanitizeString,
  serializeError,
  setLogSink,
} from "./index";

function sha256Hex(val: string): string {
  return crypto.createHash("sha256").update(val, "utf8").digest("hex");
}

describe("src/lib/privacy: Logger, Scrubber, dan Serializer Galat", () => {
  afterEach(() => {
    resetLogSink();
  });

  it("logger allowlist: kunci di luar daftar izin terbuang", () => {
    const logs: Array<{ level: string; data: Record<string, unknown> }> = [];
    setLogSink((level, data) => {
      logs.push({ level, data });
    });

    logger.info({
      event: "test_event",
      requestId: "11111111-1111-4111-8111-111111111101",
      route: "/api/scan",
      method: "POST",
      status: 200,
      durationMs: 45,
      errorCode: "OK",
      count: 1,
      // Kunci terlarang & asing di luar allowlist
      nama_panggilan: "Budi",
      telepon: "081234567890",
      email: "budi@example.com",
      token: "supersecrettoken123456789",
      catatan_pasien: "butuh kursi roda",
      kebutuhan: ["mobilitas"],
      diagnosis: "asma",
      ip: "127.0.0.1",
      unknownKey: "should_be_dropped",
    });

    expect(logs).toHaveLength(1);
    const logData = logs[0].data;

    // Kunci yang diizinkan harus ada
    expect(logData.event).toBe("test_event");
    expect(logData.requestId).toBe("11111111-1111-4111-8111-111111111101");
    expect(logData.route).toBe("/api/scan");
    expect(logData.method).toBe("POST");
    expect(logData.status).toBe(200);
    expect(logData.durationMs).toBe(45);
    expect(logData.errorCode).toBe("OK");
    expect(logData.count).toBe(1);

    // Kunci di luar allowlist dan forbidden fields harus terbuang
    for (const forbidden of FORBIDDEN_LOG_FIELDS) {
      expect(logData).not.toHaveProperty(forbidden);
    }
    expect(logData).not.toHaveProperty("unknownKey");

    const emittedKeys = Object.keys(logData);
    for (const key of emittedKeys) {
      expect((ALLOWED_LOG_KEYS as readonly string[]).includes(key)).toBe(true);
    }
  });

  it("scrubber: nomor telepon (+62, 08), email, dan token (>= 20 karakter) tersamarkan", () => {
    // Nomor telepon Indonesia
    expect(sanitizeString("Hubungi 081234567890 untuk info")).toBe(
      "Hubungi [REDACTED_PHONE] untuk info"
    );
    expect(sanitizeString("Kontak: +6281234567890 aktif")).toBe(
      "Kontak: [REDACTED_PHONE] aktif"
    );
    expect(sanitizeString("WA +62 812-3456-7890")).toBe(
      "WA [REDACTED_PHONE]"
    );

    // Email
    expect(sanitizeString("Kirim ke pasien.test@example.com sekarang")).toBe(
      "Kirim ke [REDACTED_EMAIL] sekarang"
    );

    // Token acak (>= 20 karakter base32/base64url/hex)
    const base64urlToken = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4"; // 32 chars
    expect(sanitizeString(`Token: ${base64urlToken}`)).toBe(
      "Token: [REDACTED_TOKEN]"
    );
    const hexToken64 = sha256Hex("test-token-secret");
    expect(sanitizeString(`Hash: ${hexToken64}`)).toBe(
      "Hash: [REDACTED_TOKEN]"
    );

    // UUID standar (8-4-4-4-12) harus tetap dipertahankan
    const validUuid = "11111111-1111-4111-8111-111111111101";
    expect(sanitizeString(`Req: ${validUuid}`)).toBe(`Req: ${validUuid}`);
  });

  it("error pg sungguhan (picu pelanggaran unik dengan nomor telepon sintetis di aksespass_test) terserialisasi tanpa nomor telepon itu", async () => {
    const syntheticPhone = "081299998888";
    const dupClientId = `client-dup-${syntheticPhone}`;

    const facilityA = "11111111-1111-4111-8111-111111111101";
    const patient1 = "22222222-2222-4222-8222-222222222101";
    const staffA1 = "22222222-2222-4222-8222-222222222301";

    // Masukkan baris pertama
    await withContext(
      {
        userId: staffA1,
        role: "staff",
        facilityId: facilityA,
      },
      async (tx) => {
        await tx.query(
          `INSERT INTO visits (
            patient_user_id, facility_id, staff_user_id, channel, client_id
          ) VALUES ($1, $2, $3, 'qr', $4)
          ON CONFLICT (client_id) DO NOTHING;`,
          [patient1, facilityA, staffA1, dupClientId]
        );
      }
    );

    let caughtError: unknown;
    try {
      // Masukkan baris kedua untuk memicu pelanggaran unik PostgreSQL sungguhan (SQLSTATE 23505)
      await withContext(
        {
          userId: staffA1,
          role: "staff",
          facilityId: facilityA,
        },
        async (tx) => {
          await tx.query(
            `INSERT INTO visits (
              patient_user_id, facility_id, staff_user_id, channel, client_id
            ) VALUES ($1, $2, $3, 'qr', $4);`,
            [patient1, facilityA, staffA1, dupClientId]
          );
        }
      );
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    const pgErr = caughtError as Record<string, unknown>;

    // Error asli pg dari aksespass_test menghasilkan kode SQLSTATE 23505
    expect(pgErr.code).toBe("23505");

    // Jalankan serializer
    const serialized = serializeError(caughtError);

    // Hasil serialisasi:
    // 1. Hanya memuat name, code, dan message
    expect(serialized.code).toBe("23505");
    expect(typeof serialized.name).toBe("string");
    expect(typeof serialized.message).toBe("string");

    // 2. Properti internal pg dibuang
    expect(serialized).not.toHaveProperty("detail");
    expect(serialized).not.toHaveProperty("where");
    expect(serialized).not.toHaveProperty("hint");
    expect(serialized).not.toHaveProperty("query");
    expect(serialized).not.toHaveProperty("parameters");

    // 3. Nomor telepon sintetis TIDAK ADA di hasil serialisasi
    const jsonStr = JSON.stringify(serialized);
    expect(jsonStr).not.toContain(syntheticPhone);
  });

  it("serializeError: membuang detail, where, hint pg yang memuat nomor telepon dan menyaring message", () => {
    const fakePgError = {
      name: "error",
      code: "23505",
      message: "duplicate key on phone 081299998888",
      detail: "Key (phone)=(081299998888) already exists.",
      where: "in transaction",
      hint: "check constraint",
    };

    const serialized = serializeError(fakePgError);
    expect(serialized.code).toBe("23505");
    expect(serialized).not.toHaveProperty("detail");
    expect(serialized).not.toHaveProperty("where");
    expect(serialized).not.toHaveProperty("hint");
    expect(serialized.message).toBe("duplicate key on phone [REDACTED_PHONE]");
    expect(JSON.stringify(serialized)).not.toContain("081299998888");
  });
});
