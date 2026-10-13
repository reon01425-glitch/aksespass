import { describe, expect, it } from "vitest";
import { type AppDbRole, withContext } from "./index";

describe("src/db: Penguncian Helper Transaksi withContext", () => {
  const validUuid = "22222222-2222-4222-8222-222222222101";
  const validFacilityUuid = "11111111-1111-4111-8111-111111111101";
  const validHex64 =
    "c7f4019a8264bc81628109310248019481024801948102480194810248019481";

  it("menolak peran (role) yang tidak valid", async () => {
    await expect(
      withContext({ role: "admin" as AppDbRole }, async () => {})
    ).rejects.toThrow(/Peran database tidak valid/);

    await expect(
      withContext({ role: "superuser" as AppDbRole }, async () => {})
    ).rejects.toThrow(/Peran database tidak valid/);

    await expect(
      withContext({ role: "hacker" as AppDbRole }, async () => {})
    ).rejects.toThrow(/Peran database tidak valid/);
  });

  it("menolak userId atau facilityId yang bukan berformat UUID valid", async () => {
    // userId tidak valid
    await expect(
      withContext({ userId: "bukan-uuid" }, async () => {})
    ).rejects.toThrow(/userId konteks database harus berupa UUID valid/);

    await expect(
      withContext({ userId: "12345" }, async () => {})
    ).rejects.toThrow(/userId konteks database harus berupa UUID valid/);

    // facilityId tidak valid
    await expect(
      withContext({ facilityId: "invalid-facility-id" }, async () => {})
    ).rejects.toThrow(/facilityId konteks database harus berupa UUID valid/);
  });

  it("menolak scanTokenHash yang bukan berupa heksadesimal 64 karakter", async () => {
    // Terlalu pendek
    await expect(
      withContext({ scanTokenHash: "abc123" }, async () => {})
    ).rejects.toThrow(/scanTokenHash konteks database harus berupa heks 64 karakter/);

    // Panjang 64 tapi ada karakter non-heks (misal 'z')
    const nonHex64 = "z".repeat(64);
    await expect(
      withContext({ scanTokenHash: nonHex64 }, async () => {})
    ).rejects.toThrow(/scanTokenHash konteks database harus berupa heks 64 karakter/);
  });

  it("SHOW statement_timeout di dalam transaksi = 5s", async () => {
    const timeoutVal = await withContext(
      {
        userId: validUuid,
        role: "patient",
        facilityId: validFacilityUuid,
        scanTokenHash: validHex64,
      },
      async (tx) => {
        const res = await tx.query("SHOW statement_timeout;");
        return res.rows[0].statement_timeout;
      }
    );

    expect(timeoutVal).toBe("5s");
  });
});
