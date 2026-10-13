import { describe, expect, it } from "vitest";
import { getOwnPassportStatus } from "./index";
import { getStaffFacilityInfo } from "../facility";
import type { SessionClaims } from "../auth/session";

describe("Domain Data Paspor & Fasilitas (src/lib/passport & src/lib/facility)", () => {
  it("pasien seed dengan profil dan kebutuhan mengembalikan status complete", async () => {
    const claims: SessionClaims = {
      sessionId: "sess-test-p1",
      userId: "22222222-2222-4222-8222-222222222101",
      role: "patient",
      facilityId: null,
      expiresAt: Date.now() + 60000,
      version: 1,
    };

    const status = await getOwnPassportStatus(claims);
    expect(status.status).toBe("complete");
    expect(status.preferredName).toBeTruthy();
    expect(status.needCount).toBeGreaterThan(0);
  });

  it("pasien baru tanpa profil mengembalikan status empty", async () => {
    const claims: SessionClaims = {
      sessionId: "sess-test-empty",
      userId: "99999999-9999-4999-8999-999999999999",
      role: "patient",
      facilityId: null,
      expiresAt: Date.now() + 60000,
      version: 1,
    };

    const status = await getOwnPassportStatus(claims);
    expect(status.status).toBe("empty");
    expect(status.preferredName).toBeNull();
    expect(status.needCount).toBe(0);
  });

  it("petugas seed mendapatkan nama fasilitas Puskesmas Contoh A", async () => {
    const claims: SessionClaims = {
      sessionId: "sess-test-staff1",
      userId: "22222222-2222-4222-8222-222222222301",
      role: "staff",
      facilityId: "11111111-1111-4111-8111-111111111101",
      expiresAt: Date.now() + 60000,
      version: 1,
    };

    const info = await getStaffFacilityInfo(claims);
    expect(info).not.toBeNull();
    expect(info?.facilityName).toBe("Puskesmas Contoh A");
  });
});
