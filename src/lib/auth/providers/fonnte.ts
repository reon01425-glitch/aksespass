export async function sendOtpFonnte(phone: string, code: string): Promise<void> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("FONNTE_TOKEN belum dikonfigurasi.");

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: phone,
      message: `Kode verifikasi AksesPass kamu: *${code}*\n\nBerlaku 10 menit. Jangan bagikan ke siapapun.`,
      countryCode: "62",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gagal kirim OTP via Fonnte: ${text}`);
  }

  const data = (await res.json()) as { status: boolean; reason?: string };
  if (!data.status) {
    throw new Error(`Fonnte error: ${data.reason ?? "Unknown error"}`);
  }
}