import { ROLE_HOME_DESTINATIONS } from "../auth/constants";
import type { SessionClaims } from "../auth/session";

/**
 * Logika murni penentuan rute tujuan untuk Splash Screen P1 (/).
 *
 * Aturan:
 * 1. Ada sesi valid -> beranda sesuai peran (ROLE_HOME_DESTINATIONS[claims.role])
 * 2. Tanpa sesi (atau sesi kedaluwarsa/tidak valid) DAN belum ada cookie preferensi -> /mulai
 * 3. Selain itu (tanpa sesi valid, tetapi sudah ada cookie preferensi) -> /masuk
 */
export function resolveRootDestination(
  claims: SessionClaims | null | undefined,
  hasPreferenceCookie: boolean
): string {
  if (claims && claims.role) {
    const roleDestination = ROLE_HOME_DESTINATIONS[claims.role];
    if (roleDestination) {
      return roleDestination;
    }
  }

  if (!hasPreferenceCookie) {
    return "/mulai";
  }

  return "/masuk";
}
