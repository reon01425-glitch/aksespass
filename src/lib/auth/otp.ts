import crypto from "node:crypto";
import { withContext, type AppDbRole, type TransactionClient } from "../../db";
import { logger } from "../privacy";
import {
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_IP_MAX,
  OTP_RATE_LIMIT_PHONE_MAX,
  OTP_RATE_LIMIT_WINDOW_MS,
  ROLE_HOME_DESTINATIONS,
  SESSION_LIFETIME_PATIENT_MS,
  SESSION_LIFETIME_STAFF_MS,
} from "./constants";
import {
  constantTimeEqual,
  hmacSha256Hex,
  normalizePhoneNumber,
} from "./crypto";
import {
  getHashPepper,
  getOtpMode,
  isProduction,
} from "./env";
import {
  buildSessionCookieHeader,
  type SessionClaims,
} from "./session";

export interface RequestOtpResult {
  success: boolean;
  message: string;
  devOtp?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  destination: string;
  role: AppDbRole;
  userId: string;
  claims: SessionClaims;
  cookieHeader: string;
}

async function checkAndIncrementRateLimit(
  client: TransactionClient,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; currentCount: number }> {
  const windowStart = new Date(
    Math.floor(Date.now() / windowMs) * windowMs
  ).toISOString();

  const res = await client.query<{ count: number }>(
    `INSERT INTO rate_limit_hits (key, window_start, count)
     VALUES ($1, $2::timestamptz, 1)
     ON CONFLICT (key, window_start)
     DO UPDATE SET count = rate_limit_hits.count + 1
     RETURNING count;`,
    [key, windowStart]
  );

  const count = res.rows[0].count;
  return { allowed: count <= limit, currentCount: count };
}

/**
 * Meminta kode OTP verifikasi untuk nomor telepon tertentu.
 * Mengimplementasikan rate limiting per HMAC(telepon) dan per HMAC(IP) di Postgres.
 * Respons identik untuk nomor terdaftar maupun belum.
 */
export async function requestOtp(
  rawPhone: string,
  meta?: { ip?: string }
): Promise<RequestOtpResult> {
  const phone = normalizePhoneNumber(rawPhone);
  const mode = getOtpMode();
  const isProd = isProduction();

  if (mode === "dev-display" && isProd) {
    throw new Error(
      "Mode OTP dev-display tidak diizinkan di lingkungan produksi."
    );
  }

  if (!mode) {
    throw new Error("Penyedia OTP belum dikonfigurasi.");
  }

  const pepper = getHashPepper();
  const ip = meta?.ip?.trim() || "local";

  const phoneHash = hmacSha256Hex(pepper, phone);
  const ipHash = hmacSha256Hex(pepper, ip);

  const phoneRateKey = `otp:req:phone:${phoneHash}`;
  const ipRateKey = `otp:req:ip:${ipHash}`;

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hmacSha256Hex(pepper, code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

  await withContext({}, async (tx) => {
    // 1. Rate limit per nomor telepon
    const phoneLimit = await checkAndIncrementRateLimit(
      tx,
      phoneRateKey,
      OTP_RATE_LIMIT_PHONE_MAX,
      OTP_RATE_LIMIT_WINDOW_MS
    );
    if (!phoneLimit.allowed) {
      throw new Error(
        "Terlalu banyak permintaan OTP untuk nomor ini. Silakan coba beberapa saat lagi."
      );
    }

    // 2. Rate limit per IP
    const ipLimit = await checkAndIncrementRateLimit(
      tx,
      ipRateKey,
      OTP_RATE_LIMIT_IP_MAX,
      OTP_RATE_LIMIT_WINDOW_MS
    );
    if (!ipLimit.allowed) {
      throw new Error(
        "Terlalu banyak permintaan OTP dari jaringan ini. Silakan coba beberapa saat lagi."
      );
    }

    // 3. Simpan hash kode OTP dan hash telepon
    await tx.query(
      `INSERT INTO otp_codes (phone_hash, code_hash, expires_at, attempts, consumed_at)
       VALUES ($1, $2, $3::timestamptz, 0, NULL)
       ON CONFLICT (phone_hash)
       DO UPDATE SET
         code_hash = EXCLUDED.code_hash,
         expires_at = EXCLUDED.expires_at,
         attempts = 0,
         consumed_at = NULL;`,
      [phoneHash, codeHash, expiresAt]
    );
  });

  logger.info({
    event: "otp_requested",
    count: 1,
  });

  if (mode === "dev-display") {
    return {
      success: true,
      message: "Kode verifikasi telah dikirim.",
      devOtp: code,
    };
  }

  return {
    success: true,
    message: "Kode verifikasi telah dikirim.",
  };
}

/**
 * Memverifikasi kode OTP yang dimasukkan pengguna.
 * Mengunci baris (FOR UPDATE), mencegah penggunaan ganda, membatasi 5 percobaan,
 * dan menerbitkan sesi cookie bertanda tangan bila lolos.
 */
export async function verifyOtp(
  rawPhone: string,
  rawCode: string,
  options?: {
    intendedRole?: string;
    statsConsent?: boolean;
  }
): Promise<VerifyOtpResult> {
  const phone = normalizePhoneNumber(rawPhone);
  const code = String(rawCode || "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error(
      "Format kode verifikasi tidak valid. Masukkan 6 digit angka."
    );
  }

  const pepper = getHashPepper();
  const phoneHash = hmacSha256Hex(pepper, phone);
  const expectedCodeHash = hmacSha256Hex(pepper, code);

  let verifiedUser: {
    id: string;
    role: AppDbRole;
    status: string;
    facility_id: string | null;
    membership_status: string | null;
    audit_subject_id: string;
  };

  let otpError: string | null = null;

  await withContext({}, async (tx) => {
    // 1. SELECT ... FOR UPDATE pada tabel otp_codes
    const otpRes = await tx.query<{
      code_hash: string;
      expires_at: Date;
      attempts: number;
      consumed_at: Date | null;
    }>(
      `SELECT code_hash, expires_at, attempts, consumed_at
       FROM otp_codes
       WHERE phone_hash = $1
       FOR UPDATE;`,
      [phoneHash]
    );

    if (otpRes.rows.length === 0) {
      otpError = "Kode verifikasi tidak valid atau telah kedaluwarsa.";
      return;
    }

    const otpRow = otpRes.rows[0];

    if (otpRow.consumed_at !== null) {
      otpError = "Kode verifikasi sudah digunakan. Silakan minta kode baru.";
      return;
    }

    if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
      otpError = "Batas percobaan telah tercapai. Kode hangus, silakan minta kode baru.";
      return;
    }

    if (new Date(otpRow.expires_at).getTime() <= Date.now()) {
      otpError = "Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.";
      return;
    }

    // Naikkan counter percobaan di DB dan commit
    const newAttempts = otpRow.attempts + 1;
    await tx.query(
      "UPDATE otp_codes SET attempts = $1 WHERE phone_hash = $2;",
      [newAttempts, phoneHash]
    );

    // Bandingkan kode secara konstan-waktu
    const isCodeValid = constantTimeEqual(otpRow.code_hash, expectedCodeHash);
    if (!isCodeValid) {
      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        otpError = "Batas percobaan telah tercapai. Kode hangus, silakan minta kode baru.";
      } else {
        otpError = "Kode verifikasi salah.";
      }
      return;
    }

    // Tandai sekali pakai (consumed)
    await tx.query(
      "UPDATE otp_codes SET consumed_at = now() WHERE phone_hash = $1;",
      [phoneHash]
    );

    // 2. Cari user yang sudah terdaftar (jalur SECURITY DEFINER sempit pra-sesi)
    const existingRes = await tx.query<{
      id: string;
      role: string;
      status: string;
      facility_id: string | null;
      membership_status: string | null;
      audit_subject_id: string;
    }>("SELECT * FROM find_user_by_phone_pre_session($1);", [phone]);

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];

      if (existing.status !== "active") {
        throw new Error("Tidak dapat masuk. Hubungi admin fasilitas.");
      }

      if (
        existing.role === "staff" ||
        existing.role === "facility_admin"
      ) {
        if (existing.membership_status !== "active") {
          throw new Error("Tidak dapat masuk. Hubungi admin fasilitas.");
        }
      }

      verifiedUser = {
        id: existing.id,
        role: existing.role as AppDbRole,
        status: existing.status,
        facility_id: existing.facility_id,
        membership_status: existing.membership_status,
        audit_subject_id: existing.audit_subject_id,
      };
    } else {
      // 3. User baru: hanya peran patient atau companion yang dapat mendaftar mandiri bila intendedRole diisi
      const intendedRole = options?.intendedRole;
      if (!intendedRole) {
        throw new Error("Tidak dapat masuk. Hubungi admin fasilitas.");
      }
      if (intendedRole !== "patient" && intendedRole !== "companion") {
        throw new Error(
          "Pendaftaran mandiri hanya diizinkan untuk pasien atau pendamping. Hubungi admin fasilitas."
        );
      }

      const newRes = await tx.query<{
        id: string;
        role: string;
        status: string;
        facility_id: string | null;
        membership_status: string | null;
        audit_subject_id: string;
      }>(
        "SELECT * FROM register_user_pre_session($1, $2, $3);",
        [phone, intendedRole, Boolean(options?.statsConsent)]
      );

      const newUser = newRes.rows[0];
      verifiedUser = {
        id: newUser.id,
        role: newUser.role as AppDbRole,
        status: newUser.status,
        facility_id: newUser.facility_id,
        membership_status: newUser.membership_status,
        audit_subject_id: newUser.audit_subject_id,
      };
    }
  });

  if (otpError) {
    throw new Error(otpError);
  }

  // 4. Terbitkan sesi di DB dengan konteks user yang bersangkutan (memenuhi RLS sessions)
  const isStaffRole =
    verifiedUser!.role === "staff" ||
    verifiedUser!.role === "facility_admin" ||
    verifiedUser!.role === "curator";
  const durationMs = isStaffRole
    ? SESSION_LIFETIME_STAFF_MS
    : SESSION_LIFETIME_PATIENT_MS;
  const expiresAt = new Date(Date.now() + durationMs);

  const sessionId = crypto.randomBytes(32).toString("hex");
  const sessionIdHash = hmacSha256Hex(pepper, sessionId);

  await withContext(
    {
      userId: verifiedUser!.id,
      role: verifiedUser!.role,
      facilityId: verifiedUser!.facility_id,
    },
    async (sessTx) => {
      await sessTx.query(
        `INSERT INTO sessions (
           session_id_hash,
           user_id,
           role,
           facility_id,
           expires_at
         ) VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionIdHash,
          verifiedUser!.id,
          verifiedUser!.role,
          verifiedUser!.facility_id ?? null,
          expiresAt,
        ]
      );
    }
  );

  const claims: SessionClaims = {
    sessionId,
    userId: verifiedUser!.id,
    role: verifiedUser!.role,
    facilityId: verifiedUser!.facility_id,
    expiresAt: expiresAt.getTime(),
    version: 1,
  };

  const cookieResult = await buildSessionCookieHeader(claims);
  const destination = ROLE_HOME_DESTINATIONS[verifiedUser!.role] || "/";

  logger.info({
    event: "session_created",
    count: 1,
  });

  return {
    success: true,
    destination,
    role: verifiedUser!.role,
    userId: verifiedUser!.id,
    claims,
    cookieHeader: cookieResult.header,
  };
}
