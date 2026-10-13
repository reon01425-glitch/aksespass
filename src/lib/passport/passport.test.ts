import { describe, expect, it } from "vitest";
import {
  getNeedsCatalog,
  getOwnPassport,
  getOwnPassportStatus,
  saveOwnPassport,
} from "./index";
import { getStaffFacilityInfo } from "../facility";
import { createConsent, scanToken } from "../consent";
import type { SessionClaims } from "../auth/session";

const IDS = {
  facilities: {
    a: "11111111-1111-4111-8111-111111111101",
  },
  users: {
    p1: "22222222-2222-4222-8222-222222222101",
    p2: "22222222-2222-4222-8222-222222222102",
    staff1: "22222222-2222-4222-8222-222222222301",
  },
};

function makePatientSession(userId: string): SessionClaims {
  return {
    sessionId: `sess-${userId.slice(0, 8)}`,
    userId,
    role: "patient",
    facilityId: null,
    expiresAt: Date.now() + 60000,
    version: 1,
  };
}

describe("Domain Data Paspor (src/lib/passport)", () => {
  it("getNeedsCatalog mengembalikan katalog terkelompok per kategori dan tanpa kategori kosong", async () => {
    const catalog = await getNeedsCatalog();
    expect(catalog.length).toBeGreaterThan(0);

    for (const group of catalog) {
      expect(group.category).toBeTruthy();
      expect(group.categoryLabel).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.code).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.iconName).toBeTruthy();
        expect(item.category).toBe(group.category);
      }
    }
  });

  it("getOwnPassportStatus: pasien seed complete, pasien baru empty", async () => {
    const claimsP1 = makePatientSession(IDS.users.p1);
    const statusP1 = await getOwnPassportStatus(claimsP1);
    expect(statusP1.status).toBe("complete");
    expect(statusP1.preferredName).toBeTruthy();
    expect(statusP1.needCount).toBeGreaterThan(0);

    const claimsNew = makePatientSession("99999999-9999-4999-8999-999999999999");
    const statusNew = await getOwnPassportStatus(claimsNew);
    expect(statusNew.status).toBe("empty");
    expect(statusNew.preferredName).toBeNull();
    expect(statusNew.needCount).toBe(0);
  });

  it("getOwnPassport mengembalikan data paspor milik pasien sendiri", async () => {
    const claimsP1 = makePatientSession(IDS.users.p1);
    const passport = await getOwnPassport(claimsP1);
    expect(passport).not.toBeNull();
    expect(passport?.preferredName).toBeTruthy();
    expect(passport?.needCodes.length).toBeGreaterThan(0);
    expect(passport?.updatedAt).toBeTruthy();
  });

  it("saveOwnPassport menolak nama panggilan kosong", async () => {
    const session = makePatientSession(IDS.users.p1);
    await expect(
      saveOwnPassport(session, {
        preferredName: "   ",
        needCodes: ["komunikasi_bisindo"],
      })
    ).rejects.toThrow(/nama panggilan wajib diisi/i);
  });

  it("saveOwnPassport menolak nol kebutuhan", async () => {
    const session = makePatientSession(IDS.users.p1);
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: [],
      })
    ).rejects.toThrow(/minimal satu kebutuhan/i);
  });

  it("saveOwnPassport menolak kode kebutuhan tak dikenal", async () => {
    const session = makePatientSession(IDS.users.p1);
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: ["kebutuhan_palsu_123"],
      })
    ).rejects.toThrow(/tidak valid/i);
  });

  it("saveOwnPassport menolak catatan terlalu panjang (> 300 karakter)", async () => {
    const session = makePatientSession(IDS.users.p1);
    const longNote = "a".repeat(301);
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: ["komunikasi_bisindo"],
        patientNote: longNote,
      })
    ).rejects.toThrow(/maksimal 300 karakter/i);
  });

  it("saveOwnPassport menolak kunci tak dikenal dan apa pun bernama diagnosis/diagnosa", async () => {
    const session = makePatientSession(IDS.users.p1);

    // Kunci tak dikenal
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: ["komunikasi_bisindo"],
        extraField: "tidak boleh",
      })
    ).rejects.toThrow(/kunci masukan tidak dikenal/i);

    // Kunci bernama diagnosis
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: ["komunikasi_bisindo"],
        diagnosis: "gangguan pendengaran",
      })
    ).rejects.toThrow(/diagnosis/i);

    // Kunci bernama diagnosa
    await expect(
      saveOwnPassport(session, {
        preferredName: "Budi",
        needCodes: ["komunikasi_bisindo"],
        diagnosa: "sesak",
      })
    ).rejects.toThrow(/diagnosis/i);
  });

  it("saveOwnPassport simpan ulang mengganti daftar kebutuhan dan menyetel penanda pasien", async () => {
    const session = makePatientSession(IDS.users.p1);

    // Simpan pilihan baru: hanya 'lingkungan_tenang'
    const saved = await saveOwnPassport(session, {
      preferredName: "Panggilan P1 Baru",
      needCodes: ["lingkungan_tenang"],
      patientNote: "Catatan baru dari pasien",
    });

    expect(saved.preferredName).toBe("Panggilan P1 Baru");
    expect(saved.needCodes).toEqual(["lingkungan_tenang"]);
    expect(saved.patientNote).toBe("Catatan baru dari pasien");

    // Baca ulang via getOwnPassport
    const reloaded = await getOwnPassport(session);
    expect(reloaded?.preferredName).toBe("Panggilan P1 Baru");
    expect(reloaded?.needCodes).toEqual(["lingkungan_tenang"]);
    expect(reloaded?.patientNote).toBe("Catatan baru dari pasien");
  });

  it("RLS: Pasien A tidak bisa membaca atau menyimpan profil Pasien B", async () => {
    const sessionA = makePatientSession(IDS.users.p1);

    // Pasien A mencoba menyimpan profil Pasien B
    await expect(
      saveOwnPassport(sessionA, {
        preferredName: "Hacker A",
        needCodes: ["komunikasi_bisindo"],
      }, { targetPatientUserId: IDS.users.p2 })
    ).rejects.toThrow();

    // Pasien A mencoba membaca profil Pasien B lewat targetPatientUserId
    // RLS memastikan Pasien A hanya membaca barisnya sendiri (atau 0 baris)
    const dataB = await getOwnPassport(sessionA, IDS.users.p2);
    // Karena sessionA adalah patient, targetUserId dipaksa atau difilter RLS ke sessionA.userId
    expect(dataB?.preferredName).not.toBe("Pasien Contoh 2");
  });

  it("Data dibaca saat dipindai: setelah saveOwnPassport, scanToken pada QR yang sudah aktif mengembalikan data terbaru", async () => {
    // 1. Pasien 1 membuat ConsentQR yang aktif
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      {
        facilityId: IDS.facilities.a,
        sharedFields: ["komunikasi", "sensorik_lingkungan", "catatan_pasien"],
        duration: "1 jam",
      }
    );

    expect(consent.token).toBeTruthy();

    // 2. Pasien 1 memperbarui paspor
    const sessionP1 = makePatientSession(IDS.users.p1);
    await saveOwnPassport(sessionP1, {
      preferredName: "Nama Terupdate Pasien 1",
      needCodes: ["komunikasi_papan_gambar", "penjelasan_bertahap"],
      patientNote: "Catatan terupdate saat QR sudah ada",
    });

    // 3. Petugas memindai QR yang sudah dibuat sebelumnya
    const staffSession = {
      userId: IDS.users.staff1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    const scanResult = await scanToken(staffSession, consent.token);
    expect(scanResult.status).toBe(200);

    const body = scanResult.body as {
      ok: boolean;
      preferredName: string;
      kebutuhan: Array<{ kode: string; label: string }>;
      catatanPasien?: string;
    };

    expect(body.ok).toBe(true);
    expect(body.preferredName).toBe("Nama Terupdate Pasien 1");
    expect(body.catatanPasien).toBe("Catatan terupdate saat QR sudah ada");

    const kodes = body.kebutuhan.map((k) => k.kode);
    expect(kodes).toContain("komunikasi_papan_gambar");
    expect(kodes).toContain("penjelasan_bertahap");
    // Kebutuhan lama tidak boleh ada
    expect(kodes).not.toContain("komunikasi_bisindo");
  });

  it("petugas seed mendapatkan nama fasilitas Puskesmas Contoh A", async () => {
    const claims: SessionClaims = {
      sessionId: "sess-test-staff1",
      userId: IDS.users.staff1,
      role: "staff",
      facilityId: IDS.facilities.a,
      expiresAt: Date.now() + 60000,
      version: 1,
    };

    const info = await getStaffFacilityInfo(claims);
    expect(info).not.toBeNull();
    expect(info?.facilityName).toBe("Puskesmas Contoh A");
  });

  it("cleanup: memulihkan seed Pasien 1 di akhir pengujian", async () => {
    const sessionP1 = makePatientSession(IDS.users.p1);
    await saveOwnPassport(sessionP1, {
      preferredName: "Pasien Contoh 1",
      needCodes: [
        "komunikasi_bisindo",
        "komunikasi_tertulis",
        "komunikasi_bicara_hadap",
        "antrean_visual_getar",
      ],
      patientNote:
        "Contoh catatan: mohon panggil giliran lewat tanda visual atau tepuk bahu pelan.",
    });
    const restored = await getOwnPassport(sessionP1);
    expect(restored?.preferredName).toBe("Pasien Contoh 1");
  });
});
