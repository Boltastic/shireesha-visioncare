import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminAuth";
import { readAdminCredentials } from "./adminCredentials";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("admin password session endpoint", () => {
  it("returns an authenticated session only when the protected session cookie is present", async () => {
    const email = readAdminCredentials().email;
    const token = await createAdminSessionToken(email);
    const ctx: TrpcContext = { user: null, adminSession: null, req: { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } } as TrpcContext["req"], res: {} as TrpcContext["res"] };

    await expect(appRouter.createCaller(ctx).adminAuth.session()).resolves.toEqual({ authenticated: true, email });
  });
});
