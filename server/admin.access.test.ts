import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("admin role protection", () => {
  it("rejects an authenticated non-admin user before exposing appointment data", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 9,
        openId: "non-admin-user",
        name: "Standard User",
        email: "standard@example.com",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
      adminSession: null,
    };

    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
