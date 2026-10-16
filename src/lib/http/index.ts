import { logger, serializeError } from "../privacy";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getAppOrigin(): string {
  return process.env.APP_ORIGIN || "http://localhost:3000";
}

/**
 * Mengambil daftar origin yang diizinkan:
 * Membaca APP_ORIGINS (dipisahkan koma), serta menyertakan getAppOrigin().
 * Bawaan bila APP_ORIGINS kosong: [getAppOrigin()].
 */
export function getAllowedOrigins(): string[] {
  const primary = getAppOrigin();
  const rawList = process.env.APP_ORIGINS;
  if (!rawList) {
    return [primary];
  }
  const origins = rawList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origins.includes(primary)) {
    origins.unshift(primary);
  }
  return origins;
}

/**
 * Memeriksa apakah header Origin pada request sesuai dengan daftar yang diizinkan.
 */
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }
  return getAllowedOrigins().includes(origin);
}

/**
 * Membuat respons JSON yang selalu menyertakan header Cache-Control: no-store.
 */
export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export type RouteHandler<TContext = unknown> = (
  request: Request,
  context?: TContext
) => Promise<Response> | Response;

/**
 * Pembungkus route handler Next.js App Router:
 * 1. Memeriksa header Origin pada request yang mengubah state (POST, PUT, PATCH, DELETE).
 * 2. Memastikan header Cache-Control: no-store selalu terpasang pada respons.
 * 3. Menangkap semua galat tanpa membiarkannya lolos ke runtime Next.js, mencatat
 *    lewat logger privasi + serializeError, dan mengembalikan pesan galat generik.
 *    err.message tidak pernah dikirim ke klien.
 */
export function wrapRouteHandler(
  handler: (request: Request) => Promise<Response> | Response
): (request: Request) => Promise<Response>;
export function wrapRouteHandler<TContext>(
  handler: (request: Request, context: TContext) => Promise<Response> | Response
): (request: Request, context: TContext) => Promise<Response>;
export function wrapRouteHandler(
  handler: (request: Request, context?: unknown) => Promise<Response> | Response
): (request: Request, context?: unknown) => Promise<Response> {
  return async (request: Request, context?: unknown): Promise<Response> => {
    const method = request.method.toUpperCase();

    // Verifikasi Origin untuk request yang mengubah state
    if (STATE_CHANGING_METHODS.has(method)) {
      if (!checkOrigin(request)) {
        return jsonResponse(
          { error: "Origin tidak diizinkan." },
          { status: 403 }
        );
      }
    }

    try {
      const response = await handler(request, context);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (err) {
      // Id pada path/body yang bukan UUID memicu galat Postgres 22P02 (invalid_text_representation).
      // Itu masukan klien yang salah, bukan galat server: jawab 404 generik tanpa membocorkan detail.
      if (typeof err === "object" && err !== null && (err as { code?: unknown }).code === "22P02") {
        return jsonResponse({ ok: false, error: "Data tidak ditemukan." }, { status: 404 });
      }

      const serialized = serializeError(err);
      let routePath = "/";
      try {
        routePath = new URL(request.url).pathname;
      } catch {
        // Abaikan galat parsing URL
      }

      logger.error({
        event: "route_handler_error",
        route: routePath,
        method: request.method,
        status: 500,
        errorCode: serialized.code ?? serialized.name,
      });

      return jsonResponse(
        { error: "Terjadi kesalahan pada server." },
        { status: 500 }
      );
    }
  };
}
