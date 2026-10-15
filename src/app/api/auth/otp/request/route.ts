import { OtpRateLimitError, requestOtp } from "../../../../../lib/auth";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";

export const POST = wrapRouteHandler(async (request: Request) => {
  let body: { phone?: string };
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return jsonResponse(
      { error: "Format request JSON tidak valid." },
      { status: 400 }
    );
  }

  if (!body?.phone) {
    return jsonResponse(
      { error: "Nomor telepon wajib diisi." },
      { status: 400 }
    );
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";

  try {
    const result = await requestOtp(body.phone, { ip });
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return jsonResponse({ error: err.message }, { status: 429 });
    }
    throw err;
  }
});
