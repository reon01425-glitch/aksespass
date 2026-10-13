import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_NAME,
  ROLE_HOME_DESTINATIONS,
  SECURE_COOKIE_NAME,
} from "./lib/auth/constants";
import {
  extractSessionCookieFromHeader,
  verifySessionCookie,
} from "./lib/auth/session";

const ROLE_PREFIX_MAP: ReadonlyArray<{
  prefix: string;
  role: "patient" | "companion" | "staff" | "facility_admin" | "curator";
}> = [
  { prefix: "/pasien", role: "patient" },
  { prefix: "/pendamping", role: "companion" },
  { prefix: "/petugas", role: "staff" },
  { prefix: "/admin", role: "facility_admin" },
  { prefix: "/kurator", role: "curator" },
];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  );
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/mulai" || pathname.startsWith("/mulai/")) return true;
  if (pathname === "/masuk" || pathname.startsWith("/masuk/")) return true;
  if (pathname === "/s" || pathname.startsWith("/s/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/preferences")) return true;
  return isStaticAsset(pathname);
}

function isStaffLikeRole(role: string): boolean {
  return role === "staff" || role === "facility_admin" || role === "curator";
}

/**
 * Proxy/Middleware Next.js 16 (tanpa akses DB atau pg).
 * Memeriksa cookie sesi bertanda tangan secara murni di edge/runtime
 * dan mengarahkan pengguna sesuai batasan rute berprefiks peran.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // 1. Rute publik dan aset statis selalu dilewati
  if (isPublicRoute(pathname)) {
    const res = NextResponse.next();
    if (pathname === "/s" || pathname.startsWith("/s/")) {
      res.headers.set("Cache-Control", "no-store");
    }
    return res;
  }

  // 2. Periksa apakah rute memiliki prefiks peran tertentu
  const matchedRoleRule = ROLE_PREFIX_MAP.find(
    (rule) =>
      pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  );

  // Jika bukan rute berprefiks peran (misal rute /api lain), biarkan route handler
  // menjaga dirinya sendiri lewat requireSession.
  if (!matchedRoleRule) {
    return NextResponse.next();
  }

  // 3. Baca cookie sesi
  const cookieFromReq =
    request.cookies.get(SECURE_COOKIE_NAME)?.value ||
    request.cookies.get(COOKIE_NAME)?.value ||
    extractSessionCookieFromHeader(request.headers.get("cookie"));

  if (!cookieFromReq) {
    const masukUrl = new URL("/masuk", request.url);
    return NextResponse.redirect(masukUrl);
  }

  // 4. Verifikasi kriptografis murni (Web Crypto, tanpa DB)
  const claims = await verifySessionCookie(cookieFromReq);
  if (!claims) {
    // Cookie ada tetapi kedaluwarsa atau tidak valid -> hapus cookie dan arahkan
    // dengan alasan sesi-berakhir (daftar alasan tetap di getAuthReasonMessage).
    const isStaffGroup = isStaffLikeRole(matchedRoleRule.role);
    const dest = isStaffGroup
      ? "/masuk/petugas?alasan=sesi-berakhir"
      : "/masuk?alasan=sesi-berakhir";

    const redirectRes = NextResponse.redirect(new URL(dest, request.url));
    redirectRes.cookies.delete(COOKIE_NAME);
    redirectRes.cookies.delete(SECURE_COOKIE_NAME);
    return redirectRes;
  }

  // 5. Periksa kecocokan peran dengan prefiks rute
  if (claims.role !== matchedRoleRule.role) {
    const homeDest = ROLE_HOME_DESTINATIONS[claims.role] || "/masuk";
    const redirectUrl = new URL(homeDest, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const res = NextResponse.next();
  if (
    pathname === "/s" ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/petugas")
  ) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
