import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { appointments, bookingAttempts, otpChallenges, patients, slotHolds } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const phone = `+9199${Date.now().toString().slice(-8)}`;
let bookingId: string | undefined;

function businessDate() {
  const candidate = new Date(Date.now() + 2 * 86400000);
  while (candidate.getDay() === 0) candidate.setDate(candidate.getDate() + 1);
  return candidate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function caller() {
  const ctx: TrpcContext = {
    user: null,
    req: { headers: { "x-forwarded-for": "127.0.0.1" }, ip: "127.0.0.1" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

function adminCaller() {
  const ctx: TrpcContext = {
    user: { id: 1, openId: "booking-flow-admin", name: "Test Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: { "x-forwarded-for": "127.0.0.1" }, ip: "127.0.0.1" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("verified booking flow", () => {
  it("holds a slot, verifies the number, and creates one confirmed appointment", async () => {
    const api = caller();
    const [service] = await api.booking.services();
    expect(service).toBeDefined();
    const date = businessDate();
    const time = "10:00";
    const otpRequest = await api.booking.requestOtp({ phone, captchaToken: "development-pass", serviceId: service!.id, date, time });
    expect(otpRequest.provider).toBe("development");
    const verification = await api.booking.verifyOtp({ phone, challengeId: otpRequest.challengeId, code: "246810" });
    const confirmed = await api.booking.create({
      fullName: "Test Booking",
      phone,
      serviceId: service!.id,
      date,
      time,
      challengeId: otpRequest.challengeId,
      verificationToken: verification.verificationToken,
    });
    bookingId = confirmed.bookingId;
    expect(confirmed.status).toBe("Confirmed");
    const slots = await api.booking.availableSlots({ date, serviceId: service!.id });
    expect(slots.find(slot => slot.time === time)?.available).toBe(false);
    const db = await getDb();
    const [appointment] = await db!.select().from(appointments).where(eq(appointments.bookingId, confirmed.bookingId)).limit(1);
    const rescheduled = await adminCaller().admin.appointments.reschedule({ id: appointment!.id, date, time: "10:30" });
    expect(rescheduled).toEqual({ success: true });
  });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  if (bookingId) await db.delete(appointments).where(eq(appointments.bookingId, bookingId));
  await db.delete(slotHolds).where(eq(slotHolds.phone, phone));
  await db.delete(otpChallenges).where(eq(otpChallenges.phone, phone));
  await db.delete(bookingAttempts).where(eq(bookingAttempts.phone, phone));
  if (patient) await db.delete(patients).where(eq(patients.id, patient.id));
});
