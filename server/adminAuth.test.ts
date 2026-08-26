import { randomBytes, scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signInAdmin, verifyPasswordHash } from "./adminAuth";

describe("password-only admin authentication", () => {
  it("accepts only the matching password for a salted verifier", () => {
    const salt = randomBytes(16).toString("hex");
    const encoded = `scrypt.${salt}.${scryptSync("test-only-password", salt, 64).toString("hex")}`;
    expect(verifyPasswordHash("test-only-password", encoded)).toBe(true);
    expect(verifyPasswordHash("wrong-password", encoded)).toBe(false);
  });

  it("rejects repeated invalid password attempts with a rate limit", async () => {
    const req = { headers: { "x-forwarded-for": "admin-auth-rate-limit-test" }, ip: "127.0.0.1" };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(signInAdmin("not-the-admin@example.com", "incorrect", req)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    await expect(signInAdmin("not-the-admin@example.com", "incorrect", req)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
