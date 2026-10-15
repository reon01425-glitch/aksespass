import { jsonResponse, wrapRouteHandler } from "../../../lib/http";
import {
  buildPreferenceCookieHeader,
  isValidContrast,
  isValidReadingMode,
  isValidTextSize,
  type AppPreferences,
} from "../../../lib/preferences";

export const POST = wrapRouteHandler(async (request: Request) => {
  let body: { textSize?: unknown; contrast?: unknown; readingMode?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(
      { error: "Format request JSON tidak valid." },
      { status: 400 }
    );
  }

  // readingMode opsional (bawaan "standard") agar klien lama tetap berfungsi.
  const readingMode = body.readingMode ?? "standard";

  if (
    !isValidTextSize(body.textSize) ||
    !isValidContrast(body.contrast) ||
    !isValidReadingMode(readingMode)
  ) {
    return jsonResponse(
      {
        error:
          "Preferensi tidak valid. Ukuran teks harus 100, 150, atau 200; kontras harus standard atau high; mode pembaca layar harus standard atau screen-reader.",
      },
      { status: 400 }
    );
  }

  const preferences: AppPreferences = {
    textSize: body.textSize,
    contrast: body.contrast,
    readingMode,
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
