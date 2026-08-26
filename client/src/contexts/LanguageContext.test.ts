import { describe, expect, it } from "vitest";
import { translationCopy } from "./LanguageContext";

describe("English–Telugu public copy", () => {
  it("provides Telugu wording for all translated public navigation and booking keys", () => {
    const requiredKeys = ["nav.home", "nav.services", "nav.about", "nav.contact", "nav.book", "booking.eyebrow", "booking.headline", "booking.service", "booking.date", "booking.time", "booking.details", "booking.confirm", "booking.continue", "booking.private", "booking.privateBody", "booking.stepService", "booking.stepDetails", "booking.confirmAppointment"];
    requiredKeys.forEach(key => expect(translationCopy.te[key]).toMatch(/[\u0C00-\u0C7F]/));
  });
});
