import pg from "pg";
import { createConsent, type ConsentActor, type CreateConsentInput } from "@/lib/consent";

/**
 * Khusus tes: tes lama membuat banyak QR untuk pasien dan fasilitas yang sama.
 * Aturan produksi "satu QR aktif per pasien per fasilitas" menolaknya, jadi QR aktif
 * sebelumnya dicabut lewat koneksi admin lalu createConsent asli dipanggil.
 */
export async function createConsentReplacingActive(
  actor: ConsentActor,
  input: CreateConsentInput,
  options?: { now?: Date }
) {
  const target =
    actor.role === "companion"
      ? input.targetPatientUserId || actor.userId
      : actor.userId;
  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_ADMIN_URL_TEST ??
      "postgresql://localhost:5432/aksespass_test",
  });
  await client.connect();
  try {
    await client.query(
      `UPDATE consent_qr SET revoked_at = now()
       WHERE revoked_at IS NULL AND expires_at > now()
         AND consent_id IN (
           SELECT id FROM consents WHERE patient_user_id = $1 AND facility_id = $2
         );`,
      [target, input.facilityId]
    );
  } finally {
    await client.end();
  }
  return createConsent(actor, input, options);
}
