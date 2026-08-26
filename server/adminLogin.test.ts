import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { ADMIN_SESSION_COOKIE } from "./adminAuth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const originalEmail = process.env.ADMIN_LOGIN_EMAIL;
const originalHash = process.env.ADMIN_PASSWORD_HASH;

afterEach(() => {
  process.env.ADMIN_LOGIN_EMAIL = originalEmail;
  process.env.ADMIN_PASSWORD_HASH = originalHash;
});

describe("administrator password login", () => {
  it("creates an authenticated HttpOnly session after valid credentials", async () => {
    const email = "test-admin@example.com";
    const password = "test-only-password";
    const salt = randomBytes(16).toString("hex");
    process.env.ADMIN_LOGIN_EMAIL = email;
    process.env.ADMIN_PASSWORD_HASH = `scrypt.${salt}.${scryptSync(password, salt, 64).toString("hex")}`;
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: null,
      adminSession: null,
      req: { protocol: "https", headers: { "x-forwarded-for": "admin-login-success-test" }, ip: "127.0.0.1" } as TrpcContext["req"],
      res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) } as TrpcContext["res"],
    };

    await expect(appRouter.createCaller(ctx).adminAuth.login({ email, password })).resolves.toEqual({ authenticated: true, email });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: ADMIN_SESSION_COOKIE, options: { httpOnly: true, secure: true, sameSite: "none", maxAge: 28800000 } });
  });
});
