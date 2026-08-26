import { describe, expect, it } from "vitest";
import { hashValue } from "./bookingUtils";
import { sendOtp, verifyProviderOtp } from "./otp";

describe("development OTP adapter", () => {
  it("issues and verifies the documented preview code without exposing a live provider", async () => {
    const result = await sendOtp("+919876543210");
    expect(result.provider).toBe("development");
    expect(result.codeHash).toBe(hashValue("246810"));
    await expect(verifyProviderOtp("+919876543210", "246810", "development", result.codeHash)).resolves.toBe(true);
    await expect(verifyProviderOtp("+919876543210", "000000", "development", result.codeHash)).resolves.toBe(false);
  });
});
