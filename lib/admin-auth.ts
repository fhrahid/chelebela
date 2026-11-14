import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "chhelebela_admin";
const SESSION_HOURS = 8;
let failedLoginCount = 0;
let loginLockedUntil = 0;

function adminConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 16 || !secret || secret.length < 32) return null;
  return { password, secret };
}

export function isAdminConfigured(): boolean {
  return adminConfig() !== null;
}

export function isAdminLoginAllowed(): boolean {
  if (Date.now() >= loginLockedUntil) {
    failedLoginCount = 0;
    loginLockedUntil = 0;
  }
  return loginLockedUntil === 0;
}

export function noteAdminLogin(success: boolean): void {
  if (success) {
    failedLoginCount = 0;
    loginLockedUntil = 0;
    return;
  }
  failedLoginCount++;
  if (failedLoginCount >= 10) {
    loginLockedUntil = Date.now() + 5 * 60 * 1000;
  }
}

export function verifyAdminPassword(input: string): boolean {
  const config = adminConfig();
  if (!config) return false;
  const submitted = createHash("sha256").update(input).digest();
  const expected = createHash("sha256").update(config.password).digest();
  return timingSafeEqual(submitted, expected);
}

export function createAdminSession(): { value: string; expiresAt: number } | null {
  const config = adminConfig();
  if (!config) return null;
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const signature = createHmac("sha256", config.secret).update(String(expiresAt)).digest("hex");
  return { value: `${expiresAt}.${signature}`, expiresAt };
}

export function isAdminRequest(request: Request): boolean {
  const config = adminConfig();
  if (!config) return false;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  if (!cookie) return false;
  const [expiresText, signature] = cookie.split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !/^[a-f0-9]{64}$/.test(signature ?? "")) {
    return false;
  }
  const expected = createHmac("sha256", config.secret).update(expiresText).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function isSameAdminOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const expectedHost = (forwardedHost || request.headers.get("host") || new URL(request.url).host).toLowerCase();
    return new URL(origin).host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}
