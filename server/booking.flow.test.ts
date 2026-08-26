import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { appointments, bookingAttempts, patients, slotHolds } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminAuth";
import type { TrpcContext } from "./_core/context";

const phone = `+9199${Date.now().toString().slice(-8)}`;
let bookingId: string | undefined;

function businessDate() {
  const candidate = new Date(Date.now() + 2 * 86400000);
  while (candidate.getDay() === 0) candidate.setDate(candidate.getDate() + 1);
  return candidate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function caller() {
  const ctx: TrpcContext = { user: null, req: { headers: { "x-forwarded-for": "127.0.0.1" }, ip: "127.0.0.1" } as TrpcContext["req"], res: {} as TrpcContext["res"] };
  return appRouter.createCaller(ctx);
}

async function adminCaller() {
  const token = await createAdminSessionToken("visioncare@beetlewebs.com");
  const ctx: TrpcContext = { user: null, req: { headers: { "x-forwarded-for": "127.0.0.1", cookie: `${ADMIN_SESSION_COOKIE}=${token}` }, ip: "127.0.0.1" } as TrpcContext["req"], res: {} as TrpcContext["res"], adminSession: null };
  return appRouter.createCaller(ctx);
}

describe("direct booking flow", () => {
  it("confirms an appointment after the security check without requesting an SMS code", async () => {
    const api = caller();
    const [service] = await api.booking.services();
    expect(service).toBeDefined();
    const date = businessDate();
    const time = "10:00";
    const confirmed = await api.booking.create({ fullName: "Test Booking", phone, captchaToken: "development-pass", serviceId: service!.id, date, time });
    bookingId = confirmed.bookingId;
    expect(confirmed.status).toBe("Confirmed");
    const slots = await api.booking.availableSlots({ date, serviceId: service!.id });
    expect(slots.find(slot => slot.time === time)?.available).toBe(false);
    const db = await getDb();
    const [appointment] = await db!.select().from(appointments).where(eq(appointments.bookingId, confirmed.bookingId)).limit(1);
    expect((await (await adminCaller()).admin.appointments.reschedule({ id: appointment!.id, date, time: "10:30" }))).toEqual({ success: true });
  });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  if (bookingId) await db.delete(appointments).where(eq(appointments.bookingId, bookingId));
  await db.delete(slotHolds).where(eq(slotHolds.phone, phone));
  await db.delete(bookingAttempts).where(eq(bookingAttempts.phone, phone));
  if (patient) await db.delete(patients).where(eq(patients.id, patient.id));
});
