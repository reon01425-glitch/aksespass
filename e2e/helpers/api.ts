import { expect, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";

type Playwright = PlaywrightWorkerArgs["playwright"];
import { loginApi, ACCOUNTS, type AccountKey } from "./auth";

export const FAC_A = "11111111-1111-4111-8111-111111111101";
export const FAC_B = "11111111-1111-4111-8111-111111111102";
export const ALL_FIELDS = ["komunikasi", "penglihatan", "pendengaran", "mobilitas", "sensorik_lingkungan", "pendampingan"];

/** Konteks API baru (cookie terpisah) yang sudah login sebagai akun demo. */
export async function apiAs(playwright: Playwright, baseURL: string, key: AccountKey): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const res = await loginApi(ctx, ACCOUNTS[key].phone, ACCOUNTS[key].portal);
  expect(res.ok(), `login ${key}: ${await res.text()}`).toBeTruthy();
  return ctx;
}

/** Konteks API tanpa login. */
export async function anon(playwright: Playwright, baseURL: string): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
}

/** Cabut semua QR aktif pasien lalu buat QR baru; mengembalikan token dan id. */
export async function freshQr(patient: APIRequestContext, facilityId = FAC_A, sharedFields = ["pendengaran", "komunikasi"]) {
  await patient.post("/api/pasien/qr/revoke-all");
  const res = await patient.post("/api/pasien/kunjungan/consent", { data: { facilityId, sharedFields, duration: "1 jam" } });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as { token: string; qrId: string; consentId: string; expiresAt: string };
}

export async function jsonOf(res: { text(): Promise<string> }) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}
