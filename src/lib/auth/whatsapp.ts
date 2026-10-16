import { logger } from "../privacy";
import { getFonnteToken } from "./env";

export class WhatsAppDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppDeliveryError";
  }
}

/**
 * Mengirimkan kode OTP verifikasi ke nomor WhatsApp pengguna via gateway Fonnte.
 * Sesuai arsitektur privasi, nomor telepon dan kode OTP tidak boleh dicatat dalam log.
 */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const token = getFonnteToken();
  if (!token) {
    throw new WhatsAppDeliveryError("Penyedia WhatsApp (FONNTE_TOKEN) belum dikonfigurasi.");
  }

  // Target nomor di Fonnte: hilangkan tanda '+' jika ada (+628xxx -> 628xxx)
  const target = phone.startsWith("+") ? phone.slice(1) : phone;

  const message = `[AKSESPASS] Kode verifikasi masuk Anda adalah: *${code}*.\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun demi keamanan data layanan Anda.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: "62",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      logger.error({
        event: "otp_whatsapp_delivery_failed",
        errorCode: `HTTP_${res.status}`,
      });
      throw new WhatsAppDeliveryError(
        "Gagal menghubungi server WhatsApp. Silakan coba beberapa saat lagi."
      );
    }

    const data = (await res.json()) as { status?: boolean; reason?: string };

    if (!data.status) {
      logger.error({
        event: "otp_whatsapp_delivery_failed",
        errorCode: "PROVIDER_REJECTED",
      });
      throw new WhatsAppDeliveryError(
        data.reason ||
          "Gagal memproses pengiriman pesan WhatsApp. Silakan periksa nomor Anda atau coba lagi."
      );
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof WhatsAppDeliveryError) {
      throw err;
    }

    if (err instanceof Error && err.name === "AbortError") {
      logger.error({
        event: "otp_whatsapp_delivery_failed",
        errorCode: "TIMEOUT",
      });
      throw new WhatsAppDeliveryError(
        "Layanan pengiriman WhatsApp mengalami batas waktu (timeout). Silakan coba lagi."
      );
    }

    logger.error({
      event: "otp_whatsapp_delivery_failed",
      errorCode: "NETWORK_ERROR",
    });
    throw new WhatsAppDeliveryError(
      "Gagal mengirimkan kode verifikasi ke WhatsApp. Silakan coba beberapa saat lagi."
    );
  }
}
