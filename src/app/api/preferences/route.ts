import { jsonResponse, wrapRouteHandler } from "../../../lib/http";
import {
  buildPreferenceCookieHeader,
  isValidContrast,
  isValidTextSize,
  type AppPreferences,
} from "../../../lib/preferences";

export const POST = wrapRouteHandler(async (request: Request) => {
  let body: { textSize?: unknown; contrast?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(
      { error: "Format request JSON tidak valid." },
      { status: 400 }
    );
  }

  if (!isValidTextSize(body.textSize) || !isValidContrast(body.contrast)) {
    return jsonResponse(
      {
        error:
          "Preferensi tidak valid. Ukuran teks harus 100, 150, atau 200; kontras harus standard atau high.",
      },
      { status: 400 }
    );
  }

  const preferences: AppPreferences = {
    textSize: body.textSize,
    contrast: body.contrast,
  };

  const isHttps = request.url.startsWith("https://");
  const cookieHeader = buildPreferenceCookieHeader(preferences, isHttps);

  return jsonResponse(
    { success: true, preferences },
    {
      headers: {
        "Set-Cookie": cookieHeader,
      },
    }
  );
});
