import { verifyOtp } from "../../../../../lib/auth";
import { jsonResponse, wrapRouteHandler } from "../../../../../lib/http";

export const POST = wrapRouteHandler(async (request: Request) => {
  let body: {
    phone?: string;
    code?: string;
    intendedRole?: string;
    statsConsent?: boolean;
    portal?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(
      { error: "Format request JSON tidak valid." },
      { status: 400 }
    );
  }

  if (!body?.phone || !body?.code) {
    return jsonResponse(
      { error: "Nomor telepon dan kode verifikasi wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyOtp(body.phone, body.code, {
      intendedRole: body.intendedRole,
      statsConsent: body.statsConsent,
      institutionalPortal: body.portal === "institusi",
    });

    return jsonResponse(
      {
        success: true,
        destination: result.destination,
        role: result.role,
        userId: result.userId,
      },
      {
        headers: {
          "Set-Cookie": result.cookieHeader,
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memverifikasi kode.";
    return jsonResponse({ error: message }, { status: 400 });
  }
});
