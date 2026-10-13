import { describe, expect, it } from "vitest";
import { extractToken } from "./extract-token";

describe("extractToken: Ekstraksi murni token dari kamera QR atau kode manual", () => {
  it("mengekstrak bagian setelah '#' untuk URL dengan fragmen", () => {
    const url = "http://localhost:3000/s#0123456789ABCDEFGHJKMNPQRT";
    expect(extractToken(url)).toBe("0123456789ABCDEFGHJKMNPQRT");

    const httpsUrl = "https://aksespass.id/s#0123456789ABCDEFGHJKMNPQRT";
    expect(extractToken(httpsUrl)).toBe("0123456789ABCDEFGHJKMNPQRT");

    const simpleHash = "#C0D312345";
    expect(extractToken(simpleHash)).toBe("C0D312345");
  });

  it("mempertahankan kode bergrup spasi dan strip apa adanya (validitas dinilai server)", () => {
    const grouped = "0123-4567-89AB CDEF-GHJK-MNPQ-RT";
    expect(extractToken(grouped)).toBe("0123-4567-89AB CDEF-GHJK-MNPQ-RT");

    const spacesOnly = "0123 4567 89AB";
    expect(extractToken(spacesOnly)).toBe("0123 4567 89AB");
  });

  it("mengembalikan teks acak apa adanya jika tidak memuat tanda '#'", () => {
    const rawText = "ABCXYZ12345";
    expect(extractToken(rawText)).toBe("ABCXYZ12345");
  });

  it("memotong teks sangat panjang ke tepat maksimum 64 karakter", () => {
    const longText = "A".repeat(120);
    const extracted = extractToken(longText);
    expect(extracted).toHaveLength(64);
    expect(extracted).toBe("A".repeat(64));

    const longUrlWithHash = "http://example.com/s#" + "B".repeat(100);
    const extractedFromUrl = extractToken(longUrlWithHash);
    expect(extractedFromUrl).toHaveLength(64);
    expect(extractedFromUrl).toBe("B".repeat(64));
  });

  it("menangani input kosong atau bukan string secara aman", () => {
    expect(extractToken("")).toBe("");
    // @ts-expect-error Pengujian input non-string
    expect(extractToken(null)).toBe("");
    // @ts-expect-error Pengujian input non-string
    expect(extractToken(undefined)).toBe("");
  });
});
