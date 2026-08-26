import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("booking CAPTCHA configuration", () => {
  it("exposes the configured public Site Key through the lightweight booking configuration endpoint", async () => {
    const ctx: TrpcContext = { user: null, adminSession: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    await expect(appRouter.createCaller(ctx).booking.captchaConfig()).resolves.toMatchObject({ siteKey: expect.stringMatching(/^6L/), serverVerificationConfigured: true });
  });

  it("reports protected server verification readiness without returning the Secret Key", async () => {
    const ctx: TrpcContext = { user: null, adminSession: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const config = await appRouter.createCaller(ctx).booking.captchaConfig();
    expect(config.serverVerificationConfigured).toBe(true);
    expect(Object.keys(config)).toEqual(["siteKey", "serverVerificationConfigured"]);
  });
});
