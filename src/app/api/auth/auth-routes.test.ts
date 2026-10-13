import { describe, expect, it } from "vitest";
import { POST as requestOtpHandler } from "./otp/request/route";
import { POST as verifyOtpHandler } from "./otp/verify/route";
import { POST as logoutHandler } from "./logout/route";

describe("Route Handlers Auth (/api/auth/*)", () => {
  const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

  it("POST dengan Origin asing atau tanpa Origin mengembalikan status 403", async () => {
    // 1. Tanpa Origin
    const reqNoOrigin = new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone: "081299998001" }),
      headers: { "Content-Type": "application/json" },
    });
    const resNoOrigin = await requestOtpHandler(reqNoOrigin);
    expect(resNoOrigin.status).toBe(403);
    const bodyNoOrigin = await resNoOrigin.json();
    expect(bodyNoOrigin.error).toMatch(/origin tidak diizinkan/i);

    // 2. Origin asing
    const reqForeign = new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone: "081299998001" }),
      headers: {
        "Content-Type": "application/json",
        origin: "https://attacker.example.com",
      },
    });
    const resForeign = await requestOtpHandler(reqForeign);
    expect(resForeign.status).toBe(403);
    const bodyForeign = await resForeign.json();
    expect(bodyForeign.error).toMatch(/origin tidak diizinkan/i);
  });

  it("POST /api/auth/otp/request dengan Origin valid mengembalikan 200 dan kode OTP", async () => {
    const req = new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone: "081299998002" }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
      },
    });

    const res = await requestOtpHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.devOtp).toMatch(/^\d{6}$/);
  });

  it("POST /api/auth/otp/verify dengan Origin valid mengembalikan 200 dan Set-Cookie sesi", async () => {
    // Request OTP dulu
    const testPhone = "081299998003";
    const reqOtp = new Request("http://localhost:3000/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone: testPhone }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
      },
    });
    const resOtp = await requestOtpHandler(reqOtp);
    const otpData = await resOtp.json();

    // Verify OTP
    const reqVerify = new Request("http://localhost:3000/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        phone: testPhone,
        code: otpData.devOtp,
        intendedRole: "patient",
      }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
      },
    });

    const resVerify = await verifyOtpHandler(reqVerify);
    expect(resVerify.status).toBe(200);
    expect(resVerify.headers.get("Cache-Control")).toBe("no-store");
    expect(resVerify.headers.get("Set-Cookie")).toBeTruthy();
    expect(resVerify.headers.get("Set-Cookie")).toContain("HttpOnly");

    const verifyData = await resVerify.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.destination).toBe("/pasien");
    expect(verifyData.role).toBe("patient");
  });

  it("POST /api/auth/logout mengembalikan 200 dan header pembersihan cookie", async () => {
    const reqLogout = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        origin: APP_ORIGIN,
      },
    });

    const resLogout = await logoutHandler(reqLogout);
    expect(resLogout.status).toBe(200);
    expect(resLogout.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const logoutData = await resLogout.json();
    expect(logoutData.success).toBe(true);
  });
});
