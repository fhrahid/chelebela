import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE,
  createAdminSession,
  isAdminConfigured,
  isAdminRequest,
  isSameAdminOrigin,
  verifyAdminPassword,
} from "../lib/admin-auth";

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
});

describe("admin access", () => {
  it("uses a signed, expiring HTTP cookie and compares passwords safely", () => {
    process.env.ADMIN_PASSWORD = "course-project-password";
    process.env.ADMIN_SESSION_SECRET = "random-session-secret-that-is-long-enough-123456";

    expect(isAdminConfigured()).toBe(true);
    expect(verifyAdminPassword("course-project-password")).toBe(true);
    expect(verifyAdminPassword("incorrect")).toBe(false);

    const session = createAdminSession();
    expect(session).not.toBeNull();
    if (!session) return;
    const request = new Request("https://example.test/api/admin/metrics", {
      headers: { cookie: `${ADMIN_COOKIE}=${session.value}` },
    });
    expect(isAdminRequest(request)).toBe(true);
    expect(isAdminRequest(new Request("https://example.test/api/admin/metrics", {
      headers: { cookie: `${ADMIN_COOKIE}=1.invalid` },
    }))).toBe(false);
  });

  it("requires matching same-origin headers for admin mutations", () => {
    expect(isSameAdminOrigin(new Request("https://example.test/api/admin/login", {
      headers: { origin: "https://example.test", host: "example.test" },
    }))).toBe(true);
    expect(isSameAdminOrigin(new Request("https://example.test/api/admin/login", {
      headers: { origin: "https://attacker.test", host: "example.test" },
    }))).toBe(false);
  });
});
