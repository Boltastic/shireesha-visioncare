import { describe, expect, it } from "vitest";
import { isBookableSlot, isE164Phone, maskPhone, normalizePhone } from "./bookingUtils";

describe("booking input helpers", () => {
  it("normalizes and validates international phone numbers", () => {
    expect(normalizePhone("+91 (98765) 43210")).toBe("+919876543210");
    expect(isE164Phone("+91 98765 43210")).toBe(true);
    expect(isE164Phone("98765 43210")).toBe(false);
  });

  it("masks a phone number without exposing the full value", () => {
    expect(maskPhone("+919876543210")).toBe("+91 •••• 210");
  });

  it("rejects malformed and unavailable appointment slots", () => {
    expect(isBookableSlot("not-a-date", "09:00")).toBe(false);
    expect(isBookableSlot("2035-01-01", "12:00")).toBe(false);
  });
});
