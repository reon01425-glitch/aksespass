import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppOtp } from "./whatsapp";

describe("sendWhatsAppOtp (Fonnte Gateway Adapter)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.FONNTE_TOKEN = "test_token_123";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("melempar galat jika FONNTE_TOKEN belum diatur", async () => {
    process.env.FONNTE_TOKEN = "";
    await expect(sendWhatsAppOtp("+6281234567890", "123456")).rejects.toThrow(
      /belum dikonfigurasi/i
    );
  });

  it("mengirim request ke Fonnte dengan format target yang benar", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: true, id: ["msg-1"] }),
        } as unknown as Response;
      })
    );

    await sendWhatsAppOtp("+6281234567890", "654321");

    expect(capturedUrl).toBe("https://api.fonnte.com/send");
    expect(capturedOptions?.method).toBe("POST");
    expect((capturedOptions?.headers as Record<string, string>)?.Authorization).toBe(
      "test_token_123"
    );

    const body = JSON.parse(capturedOptions?.body as string);
    // Tanda '+' harus dihilangkan untuk target Fonnte
    expect(body.target).toBe("6281234567890");
    expect(body.message).toContain("654321");
    expect(body.countryCode).toBe("62");
  });

  it("melempar galat ramah pengguna jika Fonnte mengembalikan status: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: false, reason: "Nomor tidak terdaftar di WhatsApp" }),
      } as unknown as Response)
    );

    await expect(sendWhatsAppOtp("+6281234567890", "123456")).rejects.toThrow(
      /Nomor tidak terdaftar di WhatsApp/i
    );
  });

  it("melempar galat ramah pengguna jika HTTP gagal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as unknown as Response)
    );

    await expect(sendWhatsAppOtp("+6281234567890", "123456")).rejects.toThrow(
      /Gagal menghubungi server WhatsApp/i
    );
  });
});
