import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { resetRateLimits } from "./db";

export const ACCOUNTS = {
  pasien1: { phone: "+620000000001", portal: "pasien", home: "/pasien" },
  pasien2: { phone: "+620000000002", portal: "pasien", home: "/pasien" },
  pasien3: { phone: "+620000000003", portal: "pasien", home: "/pasien" },
  pasien4: { phone: "+620000000004", portal: "pasien", home: "/pasien" },
  pasien5: { phone: "+620000000006", portal: "pasien", home: "/pasien" },
  pendamping: { phone: "+620000000005", portal: "pasien", home: "/pendamping" },
  petugasA: { phone: "+620000000011", portal: "institusi", home: "/petugas" },
  petugasNonaktif: { phone: "+620000000012", portal: "institusi", home: "/petugas" },
  petugasB: { phone: "+620000000013", portal: "institusi", home: "/petugas" },
  adminA: { phone: "+620000000021", portal: "institusi", home: "/admin" },
  adminB: { phone: "+620000000022", portal: "institusi", home: "/admin" },
  kurator1: { phone: "+620000000031", portal: "institusi", home: "/kurator" },
  kurator2: { phone: "+620000000032", portal: "institusi", home: "/kurator" },
  kurator3: { phone: "+620000000033", portal: "institusi", home: "/kurator" },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

let ipCounter = 0;
const fakeIp = () => `10.${(Date.now() >> 8) % 250}.${Math.floor(ipCounter / 250) % 250}.${(ipCounter++ % 250) + 1}`;

/** Minta OTP lalu verifikasi lewat API; cookie sesi tersimpan di konteks. Mengembalikan respons verify. */
export async function loginApi(
  request: APIRequestContext,
  phone: string,
  portal: "pasien" | "institusi" = "pasien",
  extra: Record<string, unknown> = {}
) {
  await resetRateLimits();
  const req = await request.post("/api/auth/otp/request", { data: { phone }, headers: { "x-forwarded-for": fakeIp() } });
  expect(req.ok(), `request OTP ${phone}: ${await req.text()}`).toBeTruthy();
  const { devOtp } = await req.json();
  expect(devOtp, "OTP_MODE harus dev-display").toBeTruthy();
  // Halaman pasien/pendamping selalu mengirim intendedRole; portal institusi tidak.
  const intendedRole = portal === "pasien" ? (phone === "+620000000005" ? "companion" : "patient") : undefined;
  return request.post("/api/auth/otp/verify", { data: { phone, code: devOtp, portal, ...(intendedRole ? { intendedRole } : {}), ...extra } });
}

/** Login sebagai akun demo (via API) dan pastikan berhasil. */
export async function loginAs(context: BrowserContext, key: AccountKey) {
  const a = ACCOUNTS[key];
  const res = await loginApi(context.request, a.phone, a.portal);
  expect(res.ok(), `login ${key}: ${await res.text()}`).toBeTruthy();
}

/** Login lewat antarmuka (formulir OTP) untuk menguji alur layar. */
export async function loginViaUi(page: Page, key: AccountKey) {
  const a = ACCOUNTS[key];
  await resetRateLimits();
  const path = a.portal === "institusi" ? "/masuk/petugas" : "/masuk";
  await page.goto(path);
  await page.getByLabel(/nomor/i).first().fill(a.phone);
  const otpResp = page.waitForResponse((r) => r.url().includes("/api/auth/otp/request"));
  await page.getByRole("button", { name: /kirim|minta|lanjut/i }).first().click();
  const { devOtp } = await (await otpResp).json();
  return devOtp as string;
}

export async function logout(context: BrowserContext) {
  await context.request.post("/api/auth/logout");
  await context.clearCookies();
}
