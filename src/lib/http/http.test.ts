import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetLogSink, setLogSink } from "../privacy";
import {
  checkOrigin,
  getAppOrigin,
  jsonResponse,
  wrapRouteHandler,
} from "./index";

describe("src/lib/http: Pembungkus Route Handler dan Response Helper", () => {
  const originalAppOrigin = process.env.APP_ORIGIN;
  const capturedLogs: Array<{ level: string; data: Record<string, unknown> }> =
    [];

  beforeEach(() => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    capturedLogs.length = 0;
    setLogSink((level, data) => {
      capturedLogs.push({ level, data });
    });
  });

  afterEach(() => {
    process.env.APP_ORIGIN = originalAppOrigin;
    resetLogSink();
  });

  it("jsonResponse: selalu menyertakan header Cache-Control: no-store", () => {
    expect(getAppOrigin()).toBe("http://localhost:3000");
    const res = jsonResponse({ status: "ok" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("Origin asing pada request pengubah state (POST, PUT, DELETE) ditolak dengan 403", async () => {
    const handler = wrapRouteHandler(async () => {
      return jsonResponse({ success: true });
    });

    // POST dengan Origin asing
    const badReq = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        origin: "http://malicious-site.com",
      },
    });

    expect(checkOrigin(badReq)).toBe(false);
    const badRes = await handler(badReq);
    expect(badRes.status).toBe(403);
    expect(badRes.headers.get("Cache-Control")).toBe("no-store");
    const badBody = await badRes.json();
    expect(badBody.error).toBe("Origin tidak diizinkan.");

    // POST tanpa Origin
    const noOriginReq = new Request("http://localhost:3000/api/scan", {
      method: "POST",
    });
    expect(checkOrigin(noOriginReq)).toBe(false);
    const noOriginRes = await handler(noOriginReq);
    expect(noOriginRes.status).toBe(403);

    // POST dengan Origin yang cocok
    const goodReq = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });
    expect(checkOrigin(goodReq)).toBe(true);
    const goodRes = await handler(goodReq);
    expect(goodRes.status).toBe(200);
    const goodBody = await goodRes.json();
    expect(goodBody.success).toBe(true);

    // GET tidak mewajibkan Origin
    const getReq = new Request("http://localhost:3000/api/info", {
      method: "GET",
    });
    const getRes = await handler(getReq);
    expect(getRes.status).toBe(200);
  });

  it("pembungkus http: handler yang melempar error berisi data sintetis → klien menerima galat generik dengan Cache-Control: no-store; data sintetis tidak ada di respons maupun output logger", async () => {
    const syntheticPhone = "081299998888";
    const syntheticEmail = "pasien.sintetis@example.com";
    const syntheticToken = "tok_secret1234567890abcdefgh";

    const failingHandler = wrapRouteHandler(async () => {
      throw new Error(
        `Gagal memproses data untuk telepon ${syntheticPhone}, email ${syntheticEmail}, token ${syntheticToken}`
      );
    });

    const req = new Request("http://localhost:3000/api/test-error", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    const res = await failingHandler(req);

    // 1. Klien menerima status 500 dan Cache-Control: no-store
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    // 2. Body respons generik — err.message tidak pernah dikirim ke klien
    const body = await res.json();
    expect(body.error).toBe("Terjadi kesalahan pada server.");

    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain(syntheticPhone);
    expect(bodyString).not.toContain(syntheticEmail);
    expect(bodyString).not.toContain(syntheticToken);

    // 3. Logger menerima kejadian error tapi data sintetis disaring atau dibuang
    expect(capturedLogs).toHaveLength(1);
    const logData = capturedLogs[0].data;
    expect(logData.event).toBe("route_handler_error");
    expect(logData.route).toBe("/api/test-error");
    expect(logData.method).toBe("POST");
    expect(logData.status).toBe(500);

    const logString = JSON.stringify(logData);
    expect(logString).not.toContain(syntheticPhone);
    expect(logString).not.toContain(syntheticEmail);
    expect(logString).not.toContain(syntheticToken);
  });

  it("pemeriksaan Origin menerima semua origin di APP_ORIGINS dan menolak lainnya", () => {
    const originalOrigins = process.env.APP_ORIGINS;
    try {
      process.env.APP_ORIGIN = "http://localhost:3000";
      process.env.APP_ORIGINS =
        "http://localhost:3000, http://192.168.1.100:3000, https://aksespass.example.com";

      // 1. Origin di APP_ORIGINS diterima
      const req1 = new Request("http://localhost:3000/api/scan", {
        headers: { origin: "http://localhost:3000" },
      });
      const req2 = new Request("http://localhost:3000/api/scan", {
        headers: { origin: "http://192.168.1.100:3000" },
      });
      const req3 = new Request("http://localhost:3000/api/scan", {
        headers: { origin: "https://aksespass.example.com" },
      });

      expect(checkOrigin(req1)).toBe(true);
      expect(checkOrigin(req2)).toBe(true);
      expect(checkOrigin(req3)).toBe(true);

      // 2. Origin lain ditolak
      const reqDenied1 = new Request("http://localhost:3000/api/scan", {
        headers: { origin: "http://192.168.1.101:3000" },
      });
      const reqDenied2 = new Request("http://localhost:3000/api/scan", {
        headers: { origin: "https://evil.com" },
      });

      expect(checkOrigin(reqDenied1)).toBe(false);
      expect(checkOrigin(reqDenied2)).toBe(false);
    } finally {
      process.env.APP_ORIGINS = originalOrigins;
    }
  });
});

