import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  buildPreferenceCookieHeader,
  parsePreferenceCookie,
  resolveRootDestination,
  serializePreferenceCookie,
} from "./index";
import { getAuthReasonMessage } from "../auth/reasons";
import type { SessionClaims } from "../auth/session";

describe("Preferensi Pengguna & Logika Rute P1 (src/lib/preferences)", () => {
  describe("1. Serialisasi & Parsing Cookie Preferensi (aksespass_pref)", () => {
    it("serialisasi nilai valid menghasilkan JSON dengan tepat tiga kunci", () => {
      const serialized = serializePreferenceCookie({
        textSize: "150",
        contrast: "high",
        readingMode: "standard",
      });
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual({
        textSize: "150",
        contrast: "high",
        readingMode: "standard",
      });
      expect(Object.keys(parsed)).toHaveLength(3);
    });

    it("serialisasi melempar error jika nilai di luar allowlist", () => {
      expect(() =>
        serializePreferenceCookie({
          // @ts-expect-error testing invalid text size
          textSize: "300",
          contrast: "standard",
          readingMode: "standard",
        })
      ).toThrow(/tidak valid/i);

      expect(() =>
        serializePreferenceCookie({
          textSize: "100",
          // @ts-expect-error testing invalid contrast
          contrast: "ultra-high",
          readingMode: "standard",
        })
      ).toThrow(/tidak valid/i);

      expect(() =>
        serializePreferenceCookie({
          textSize: "100",
          contrast: "standard",
          // @ts-expect-error testing invalid reading mode
          readingMode: "voice",
        })
      ).toThrow(/tidak valid/i);
    });

    it("parsing cookie valid (plain JSON dan URI-encoded)", () => {
      const rawPlain = '{"textSize":"200","contrast":"high"}';
      expect(parsePreferenceCookie(rawPlain)).toEqual({
        textSize: "200",
        contrast: "high",
        readingMode: "standard",
      });

      const rawEncoded = encodeURIComponent(rawPlain);
      expect(parsePreferenceCookie(rawEncoded)).toEqual({
        textSize: "200",
        contrast: "high",
        readingMode: "standard",
      });
    });

    it("parsing cookie dengan readingMode valid mempertahankan nilainya", () => {
      expect(
        parsePreferenceCookie(
          '{"textSize":"100","contrast":"standard","readingMode":"screen-reader"}'
        )
      ).toEqual({
        textSize: "100",
        contrast: "standard",
        readingMode: "screen-reader",
      });
      expect(
        parsePreferenceCookie(
          '{"textSize":"100","contrast":"standard","readingMode":"voice"}'
        )
      ).toBeNull();
    });

    it("parsing menolak format rusak atau nilai di luar daftar", () => {
      expect(parsePreferenceCookie("not-json")).toBeNull();
      expect(parsePreferenceCookie("")).toBeNull();
      expect(parsePreferenceCookie(null)).toBeNull();
      expect(parsePreferenceCookie(undefined)).toBeNull();
      expect(parsePreferenceCookie('{"textSize":"250","contrast":"high"}')).toBeNull();
      expect(parsePreferenceCookie('{"textSize":"100","contrast":"neon"}')).toBeNull();
      expect(parsePreferenceCookie('{"textSize":"100"}')).toBeNull();
      // Kunci asing ditolak
      expect(
        parsePreferenceCookie('{"textSize":"100","contrast":"standard","extra":"hack"}')
      ).toBeNull();
    });

    it("buildPreferenceCookieHeader menghasilkan header HttpOnly dan SameSite=Lax", () => {
      const header = buildPreferenceCookieHeader(DEFAULT_PREFERENCES, false);
      expect(header).toContain("aksespass_pref=");
      expect(header).toContain("HttpOnly");
      expect(header).toContain("SameSite=Lax");
      expect(header).toContain("Path=/");
      expect(header).not.toContain("Secure");

      const secureHeader = buildPreferenceCookieHeader(DEFAULT_PREFERENCES, true);
      expect(secureHeader).toContain("; Secure");
    });
  });

  describe("2. Logika Rute P1 (resolveRootDestination)", () => {
    const makeClaims = (role: SessionClaims["role"]): SessionClaims => ({
      sessionId: "session-123",
      userId: "user-123",
      role,
      facilityId: null,
      expiresAt: Date.now() + 60000,
      version: 1,
    });

    it("sesi valid per peran mengarahkan ke beranda masing-masing", () => {
      expect(resolveRootDestination(makeClaims("patient"), false)).toBe("/pasien");
      expect(resolveRootDestination(makeClaims("patient"), true)).toBe("/pasien");
      expect(resolveRootDestination(makeClaims("staff"), false)).toBe("/petugas");
      expect(resolveRootDestination(makeClaims("companion"), false)).toBe("/pendamping");
      expect(resolveRootDestination(makeClaims("facility_admin"), false)).toBe("/admin");
      expect(resolveRootDestination(makeClaims("curator"), false)).toBe("/kurator");
    });

    it("tanpa sesi dan belum ada cookie preferensi mengarahkan ke /mulai", () => {
      expect(resolveRootDestination(null, false)).toBe("/mulai");
      expect(resolveRootDestination(undefined, false)).toBe("/mulai");
    });

    it("tanpa sesi tapi sudah ada cookie preferensi mengarahkan ke /masuk", () => {
      expect(resolveRootDestination(null, true)).toBe("/masuk");
      expect(resolveRootDestination(undefined, true)).toBe("/masuk");
    });

    it("sesi kedaluwarsa/batal (claims null) berperilaku sesuai ada/tidaknya preferensi", () => {
      // Kasus sesi kedaluwarsa tanpa preferensi
      expect(resolveRootDestination(null, false)).toBe("/mulai");
      // Kasus sesi kedaluwarsa dengan preferensi tersimpan
      expect(resolveRootDestination(null, true)).toBe("/masuk");
    });
  });

  describe("3. Lookup Pesan Alasan Pengalihan (getAuthReasonMessage)", () => {
    it("nilai terdaftar 'sesi-berakhir' menghasilkan pesan peringatan yang tepat", () => {
      expect(getAuthReasonMessage("sesi-berakhir")).toBe(
        "Sesi Anda berakhir. Silakan masuk lagi."
      );
    });

    it("nilai di luar daftar atau nilai asing tidak menampilkan teks apa pun", () => {
      expect(getAuthReasonMessage("invalid")).toBeNull();
      expect(getAuthReasonMessage("<script>alert(1)</script>")).toBeNull();
      expect(getAuthReasonMessage("")).toBeNull();
      expect(getAuthReasonMessage(null)).toBeNull();
      expect(getAuthReasonMessage(undefined)).toBeNull();
      expect(getAuthReasonMessage("unknown-reason")).toBeNull();
    });
  });
});
