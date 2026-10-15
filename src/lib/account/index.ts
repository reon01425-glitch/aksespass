import { withContext } from "../../db";

export interface AccountSessionParam {
  userId: string;
  role: string;
  facilityId?: string | null;
}

function toContext(session: AccountSessionParam) {
  return {
    userId: session.userId,
    role: session.role as "patient" | "companion",
    facilityId: session.facilityId ?? null,
  };
}

/** Nomor HP milik akun yang sedang login, atau null bila akun sudah dihapus. */
export async function getOwnPhone(
  session: AccountSessionParam
): Promise<string | null> {
  return withContext(toContext(session), async (tx) => {
    const res = await tx.query<{ phone: string | null }>(
      "SELECT get_own_phone() AS phone;"
    );
    return res.rows[0]?.phone ?? null;
  });
}

/** Menyamarkan nomor untuk tampilan: +62••••••1234 (hanya awalan dan 4 digit akhir). */
export function maskPhone(phone: string | null): string {
  if (!phone) return "Belum ada nomor";
  const tail = phone.slice(-4);
  const head = phone.startsWith("+62") ? "+62" : phone.slice(0, 2);
  return `${head}••••••${tail}`;
}

/**
 * Mengganti nomor HP. Kode verifikasi nomor baru harus sudah diperiksa pemanggil.
 * Mengembalikan false bila nomor tidak dapat dipakai (alasan sengaja tidak dibedakan).
 */
export async function changeOwnPhone(
  session: AccountSessionParam,
  newPhone: string
): Promise<boolean> {
  return withContext(toContext(session), async (tx) => {
    const res = await tx.query<{ ok: boolean }>(
      "SELECT change_own_phone($1) AS ok;",
      [newPhone]
    );
    return res.rows[0]?.ok === true;
  });
}

/**
 * Menghapus data dan akun pasien (P23). Kode verifikasi harus sudah diperiksa pemanggil.
 * Lihat migrasi 015 untuk apa yang dihapus dan apa yang dipertahankan.
 */
export async function deleteOwnPatientAccount(
  session: AccountSessionParam
): Promise<boolean> {
  return withContext(toContext(session), async (tx) => {
    const res = await tx.query<{ ok: boolean }>(
      "SELECT delete_own_patient_account() AS ok;"
    );
    return res.rows[0]?.ok === true;
  });
}

export interface AccountOverview {
  maskedPhone: string;
  activeCompanions: number;
  statsConsent: boolean;
}

/** Ringkasan untuk P22/P23: nomor tersamar, jumlah pendamping aktif, dan persetujuan statistik. */
export async function getAccountOverview(
  session: AccountSessionParam
): Promise<AccountOverview> {
  return withContext(toContext(session), async (tx) => {
    const phoneRes = await tx.query<{ phone: string | null }>(
      "SELECT get_own_phone() AS phone;"
    );
    const companionRes = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM get_patient_companions() WHERE status = 'active';"
    );
    const statsRes = await tx.query<{ stats_consent: boolean }>(
      "SELECT stats_consent FROM users WHERE id = $1;",
      [session.userId]
    );
    return {
      maskedPhone: maskPhone(phoneRes.rows[0]?.phone ?? null),
      activeCompanions: Number(companionRes.rows[0]?.n ?? 0),
      statsConsent: statsRes.rows[0]?.stats_consent === true,
    };
  });
}
