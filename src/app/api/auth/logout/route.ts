import { logout } from "../../../../lib/auth";
import { jsonResponse, wrapRouteHandler } from "../../../../lib/http";

export const POST = wrapRouteHandler(async (request: Request) => {
  const result = await logout(request);
  return jsonResponse(
    { success: true },
    {
      headers: {
        "Set-Cookie": result.clearCookieHeader,
      },
    }
  );
});
