import { describe, expect, it } from "vitest";
import { verifyCaptcha } from "./routers/booking";

describe("production CAPTCHA verification", () => {
  it("accepts a provider-confirmed token and posts the server secret only to Google", async () => {
    const requests: Array<{ url: string; body: URLSearchParams }> = [];
    await expect(verifyCaptcha("valid-token", { production: true, secret: "server-secret", request: async (url, init) => {
      requests.push({ url, body: init.body as URLSearchParams });
      return { json: async () => ({ success: true }) };
    } })).resolves.toBeUndefined();
    expect(requests[0]?.url).toBe("https://www.google.com/recaptcha/api/siteverify");
    expect(requests[0]?.body.get("secret")).toBe("server-secret");
    expect(requests[0]?.body.get("response")).toBe("valid-token");
  });

  it("rejects invalid provider responses while keeping bookings available when server verification is not configured", async () => {
    await expect(verifyCaptcha("invalid-token", { production: true, secret: "server-secret", request: async () => ({ json: async () => ({ success: false }) }) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(verifyCaptcha("valid-token", { production: true, secret: "" })).resolves.toBeUndefined();
  });
});
