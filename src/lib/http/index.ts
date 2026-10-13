import { logger, serializeError } from "../privacy";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getAppOrigin(): string {
  return process.env.APP_ORIGIN || "http://localhost:3000";
}

/**
 * Memeriksa apakah header Origin pada request sesuai dengan APP_ORIGIN.
 */
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }
  return origin === getAppOrigin();
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
export function wrapRouteHandler<TContext = unknown>(
  handler: RouteHandler<TContext>
): RouteHandler<TContext> {
  return async (request: Request, context?: TContext): Promise<Response> => {
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
