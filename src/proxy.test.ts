import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";
import { createSessionCookieValue, type SessionClaims } from "./lib/auth/session";

describe("Proxy / Middleware (src/proxy.ts) Tanpa DB", () => {
  const baseClaims: SessionClaims = {
    sessionId: "abcdef0123456789abcdef0123456789",
    userId: "22222222-2222-4222-8222-222222222101",
    role: "patient",
    facilityId: null,
    expiresAt: Date.now() + 60000,
    version: 1,
  };

  it("rute publik (/, /masuk, /s/token, /api/auth/*, aset statis) lolos tanpa cookie", async () => {
    const publicPaths = [
      "http://localhost:3000/",
      "http://localhost:3000/masuk",
      "http://localhost:3000/masuk/bantuan",
      "http://localhost:3000/s",
      "http://localhost:3000/s/token123",
      "http://localhost:3000/api/auth/otp/request",
      "http://localhost:3000/api/auth/otp/verify",
      "http://localhost:3000/_next/static/chunks/main.js",
      "http://localhost:3000/favicon.ico",
    ];

    for (const url of publicPaths) {
      const req = new NextRequest(url);
      const res = await proxy(req);
      // NextResponse.next() tidak memiliki header Location untuk redirect
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("rute berprefiks peran tanpa cookie valid dialihkan (redirect) ke /masuk", async () => {
    const protectedPaths = [
      "http://localhost:3000/pasien",
      "http://localhost:3000/pasien/profil",
      "http://localhost:3000/pendamping",
      "http://localhost:3000/petugas",
      "http://localhost:3000/admin",
      "http://localhost:3000/kurator",
    ];

    for (const url of protectedPaths) {
      const req = new NextRequest(url);
      const res = await proxy(req);
      expect(res.headers.get("location")).toBe("http://localhost:3000/masuk");
    }
  });

  it("sesi pasien yang mengakses /petugas dialihkan (redirect) ke /pasien", async () => {
    const patientCookie = await createSessionCookieValue({
      ...baseClaims,
      role: "patient",
    });

    const req = new NextRequest("http://localhost:3000/petugas", {
      headers: {
        cookie: `aksespass_session=${patientCookie}`,
      },
    });

    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("http://localhost:3000/pasien");
  });

  it("sesi petugas yang mengakses /petugas diizinkan lolos", async () => {
    const staffCookie = await createSessionCookieValue({
      ...baseClaims,
      role: "staff",
      facilityId: "11111111-1111-4111-8111-111111111101",
    });

    const req = new NextRequest("http://localhost:3000/petugas", {
      headers: {
        cookie: `aksespass_session=${staffCookie}`,
      },
    });

    const res = await proxy(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("sesi petugas yang mengakses /admin dialihkan ke /petugas", async () => {
    const staffCookie = await createSessionCookieValue({
      ...baseClaims,
      role: "staff",
      facilityId: "11111111-1111-4111-8111-111111111101",
    });

    const req = new NextRequest("http://localhost:3000/admin", {
      headers: {
        cookie: `aksespass_session=${staffCookie}`,
      },
    });

    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("http://localhost:3000/petugas");
  });
});
