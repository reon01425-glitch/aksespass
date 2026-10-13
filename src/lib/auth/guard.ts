import { withContext, type AppDbRole } from "../../db";
import { hmacSha256Hex } from "./crypto";
import { getHashPepper } from "./env";
import {
  buildClearSessionCookieHeader,
  extractSessionCookieFromHeader,
  verifySessionCookie,
  type SessionClaims,
} from "./session";

export type RequireSessionFailureReason =
  | "NO_COOKIE"
  | "INVALID_COOKIE"
  | "EXPIRED_COOKIE"
  | "FORBIDDEN_ROLE"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED"
  | "USER_INACTIVE"
  | "MEMBERSHIP_INACTIVE"
  | "FACILITY_MISMATCH";

export interface ActiveSession {
  userId: string;
  role: AppDbRole;
  facilityId: string | null;
  auditSubjectId: string;
  sessionId: string;
}

export type RequireSessionResult =
  | { ok: true; session: ActiveSession }
  | {
      ok: false;
      reason: RequireSessionFailureReason;
      claims?: SessionClaims;
    };

/**
 * Pemeriksaan sesi tingkat dua (kriptografis + verifikasi basis data lewat withContext).
 * Memeriksa:
 * 1. Tanda tangan cookie dan masa berlaku (tanpa DB).
 * 2. Baris sessions belum dicabut dan belum kedaluwarsa.
 * 3. Baris users berstatus 'active'.
 * 4. Untuk petugas/admin: staff_memberships berstatus 'active' pada fasilitas yang sama dengan klaim.
 */
export async function requireSession(
  request: Request,
  options?: { roles?: readonly AppDbRole[] }
): Promise<RequireSessionResult> {
  const cookieHeader = request.headers.get("cookie");
  const cookieValue = extractSessionCookieFromHeader(cookieHeader);

  if (!cookieValue) {
    return { ok: false, reason: "NO_COOKIE" };
  }

  const claims = await verifySessionCookie(cookieValue, { allowExpired: true });
  if (!claims) {
    return { ok: false, reason: "INVALID_COOKIE" };
  }

  if (claims.expiresAt <= Date.now()) {
    return { ok: false, reason: "EXPIRED_COOKIE", claims };
  }

  if (options?.roles && !options.roles.includes(claims.role)) {
    return { ok: false, reason: "FORBIDDEN_ROLE", claims };
  }

  // Verifikasi ke basis data melalui withContext dengan identitas user yang bersangkutan
  return await withContext(
    {
      userId: claims.userId,
      role: claims.role,
      facilityId: claims.facilityId,
    },
    async (client): Promise<RequireSessionResult> => {
      const pepper = getHashPepper();
      const sessHash = hmacSha256Hex(pepper, claims.sessionId);

      // 1. Cek sesi di tabel sessions
      const sessionRes = await client.query<{
        revoked_at: Date | null;
        expires_at: Date;
      }>(
        "SELECT revoked_at, expires_at FROM sessions WHERE session_id_hash = $1;",
        [sessHash]
      );

      if (sessionRes.rows.length === 0) {
        return { ok: false, reason: "SESSION_REVOKED", claims };
      }

      const sessRow = sessionRes.rows[0];
      if (sessRow.revoked_at !== null) {
        return { ok: false, reason: "SESSION_REVOKED", claims };
      }

      if (new Date(sessRow.expires_at).getTime() <= Date.now()) {
        return { ok: false, reason: "SESSION_EXPIRED", claims };
      }

      // 2. Cek status aktif pada users
      const userRes = await client.query<{
        status: string;
        audit_subject_id: string;
      }>("SELECT status, audit_subject_id FROM users WHERE id = $1;", [
        claims.userId,
      ]);

      if (userRes.rows.length === 0) {
        return { ok: false, reason: "USER_INACTIVE", claims };
      }

      const userRow = userRes.rows[0];
      if (userRow.status !== "active") {
        return { ok: false, reason: "USER_INACTIVE", claims };
      }

      // 3. Untuk petugas atau admin, cek keaktifan staff_memberships
      if (
        claims.role === "staff" ||
        claims.role === "facility_admin"
      ) {
        const memRes = await client.query<{
          facility_id: string;
          status: string;
        }>("SELECT facility_id, status FROM staff_memberships WHERE user_id = $1;", [
          claims.userId,
        ]);

        if (memRes.rows.length === 0) {
          return { ok: false, reason: "MEMBERSHIP_INACTIVE", claims };
        }

        const memRow = memRes.rows[0];
        if (memRow.status !== "active") {
          return { ok: false, reason: "MEMBERSHIP_INACTIVE", claims };
        }

        if (memRow.facility_id !== claims.facilityId) {
          return { ok: false, reason: "FACILITY_MISMATCH", claims };
        }
      }

      return {
        ok: true,
        session: {
          userId: claims.userId,
          role: claims.role,
          facilityId: claims.facilityId,
          auditSubjectId: userRow.audit_subject_id,
          sessionId: claims.sessionId,
        },
      };
    }
  );
}

/**
 * Adaptor pembantu untuk Server Components / Server Actions yang menerima Headers langsung.
 */
export async function requireSessionFromHeaders(
  headers: Headers,
  options?: { roles?: readonly AppDbRole[] }
): Promise<RequireSessionResult> {
  const dummyReq = new Request("http://localhost", { headers });
  return requireSession(dummyReq, options);
}

/**
 * Mencabut sesi yang sedang aktif di database dan mengembalikan header hapus cookie.
 */
export async function logout(
  request: Request
): Promise<{ ok: boolean; clearCookieHeader: string }> {
  const cookieHeader = request.headers.get("cookie");
  const cookieValue = extractSessionCookieFromHeader(cookieHeader);
  const clearCookie = buildClearSessionCookieHeader();

  if (!cookieValue) {
    return { ok: true, clearCookieHeader: clearCookie.header };
  }

  const claims = await verifySessionCookie(cookieValue);
  if (!claims) {
    return { ok: true, clearCookieHeader: clearCookie.header };
  }

  try {
    const pepper = getHashPepper();
    const sessHash = hmacSha256Hex(pepper, claims.sessionId);

    await withContext(
      {
        userId: claims.userId,
        role: claims.role,
        facilityId: claims.facilityId,
      },
      async (tx) => {
        await tx.query(
          "UPDATE sessions SET revoked_at = now() WHERE session_id_hash = $1;",
          [sessHash]
        );
      }
    );
  } catch {
    // Sesi mungkin sudah tidak valid atau database tidak dapat dijangkau;
    // tetap kembalikan header pembersihan cookie.
  }

  return {
    ok: true,
    clearCookieHeader: clearCookie.header,
  };
}
