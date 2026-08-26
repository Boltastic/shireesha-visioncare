import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { appointments, availabilityRules, blockedDates, bookingAttempts, patients, services, siteSettings, slotHolds } from "../../drizzle/schema";
import { getDb } from "../db";
import { hasCaptchaSecretKey, readCaptchaSiteKey } from "../captchaConfig";
import { BUSINESS_OFFSET, hashValue, isBookableSlot, isE164Phone, maskPhone, normalizePhone, SLOT_TIMES, slotStart } from "../bookingUtils";
import { publicProcedure, router } from "../_core/trpc";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking is temporarily unavailable. Please try again shortly." });
  return db;
}

function clientIpHash(req: { headers?: Record<string, string | string[] | undefined>; ip?: string }) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return hashValue(candidate || req.ip || "unknown-client");
}

async function recordAttempt(kind: string, phone?: string, ipHash?: string) {
  const db = await requireDb();
  await db.insert(bookingAttempts).values({ kind, phone: phone ?? null, ipHash: ipHash ?? null });
}

async function enforceRateLimit(kind: string, phone: string, ipHash: string, max: number, windowMinutes: number) {
  const db = await requireDb();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const [phoneResult] = await db.select({ total: count() }).from(bookingAttempts).where(and(eq(bookingAttempts.kind, kind), eq(bookingAttempts.phone, phone), gte(bookingAttempts.createdAt, since)));
  const [ipResult] = await db.select({ total: count() }).from(bookingAttempts).where(and(eq(bookingAttempts.kind, kind), eq(bookingAttempts.ipHash, ipHash), gte(bookingAttempts.createdAt, since)));
  if (Number(phoneResult?.total ?? 0) >= max || Number(ipResult?.total ?? 0) >= max * 2) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a moment and try again." });
}

type CaptchaRequest = (url: string, init: RequestInit) => Promise<{ json: () => Promise<unknown> }>;

export async function verifyCaptcha(token: string, options?: { production?: boolean; secret?: string; request?: CaptchaRequest }) {
  const production = options?.production ?? process.env.NODE_ENV === "production";
  const secret = options?.secret ?? process.env.RECAPTCHA_SECRET_KEY;
  const request = options?.request ?? fetch;
  if (!production) {
    if (token === "development-pass") return;
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please complete the preview security check." });
  }
  if (!secret) return;
  const response = await request("https://www.google.com/recaptcha/api/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token }) });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "The security verification could not be confirmed." });
}

async function ensureAvailabilityRules() {
  const db = await requireDb();
  const existing = await db.select().from(availabilityRules).limit(1);
  if (!existing.length) await db.insert(availabilityRules).values([1, 2, 3, 4, 5, 6].map(dayOfWeek => ({ dayOfWeek, startTime: "09:00", endTime: "17:00", active: true })));
}

async function bookingSettings() {
  const db = await requireDb();
  const values = new Map((await db.select().from(siteSettings)).map(item => [item.key, Number(item.value)]));
  return { maxActiveBookings: values.get("max_active_bookings") || 2, minimumNoticeHours: values.get("min_booking_notice_hours") || 1, maximumBookingDays: values.get("max_booking_days") || 90 };
}

async function isConfiguredWorkingTime(date: string, time: string, durationMinutes = 30) {
  await ensureAvailabilityRules();
  const db = await requireDb();
  const dayOfWeek = new Date(`${date}T12:00:00${BUSINESS_OFFSET}`).getDay();
  const rule = (await db.select().from(availabilityRules).where(and(eq(availabilityRules.dayOfWeek, dayOfWeek), eq(availabilityRules.active, true))).limit(1))[0];
  if (!rule) return false;
  const [blocked] = await db.select().from(blockedDates).where(eq(blockedDates.date, date)).limit(1);
  const [hour, minute] = time.split(":").map(Number);
  const [closeHour, closeMinute] = rule.endTime.split(":").map(Number);
  return !blocked && time >= rule.startTime && (hour ?? 0) * 60 + (minute ?? 0) + durationMinutes <= (closeHour ?? 0) * 60 + (closeMinute ?? 0);
}

export const bookingRouter = router({
  captchaConfig: publicProcedure.query(() => ({ siteKey: readCaptchaSiteKey(), serverVerificationConfigured: hasCaptchaSecretKey() })),

  services: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select({ id: services.id, name: services.name, description: services.description, durationMinutes: services.durationMinutes }).from(services).where(eq(services.active, true));
  }),

  availableSlots: publicProcedure.input(z.object({ date: z.string(), serviceId: z.number() })).query(async ({ input }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return [];
    const db = await requireDb();
    const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
    if (!service) return [];
    const config = await bookingSettings();
    await ensureAvailabilityRules();
    const dayStart = new Date(`${input.date}T00:00:00${BUSINESS_OFFSET}`);
    const dayEnd = new Date(`${input.date}T23:59:59${BUSINESS_OFFSET}`);
    const activeAppointments = await db.select({ startTime: appointments.startTime }).from(appointments).where(and(gte(appointments.startTime, dayStart), lt(appointments.startTime, dayEnd), inArray(appointments.status, ["pending", "confirmed"])));
    const taken = new Set(activeAppointments.map(item => item.startTime.toISOString()));
    await db.delete(slotHolds).where(lt(slotHolds.expiresAt, new Date()));
    const held = new Set((await db.select({ slotKey: slotHolds.slotKey }).from(slotHolds).where(gte(slotHolds.expiresAt, new Date()))).map(item => item.slotKey));
    return Promise.all(SLOT_TIMES.map(async time => ({ time, available: isBookableSlot(input.date, time, config.minimumNoticeHours * 60, config.maximumBookingDays) && await isConfiguredWorkingTime(input.date, time, service.durationMinutes) && !taken.has(slotStart(input.date, time).toISOString()) && !held.has(slotStart(input.date, time).toISOString()) })));
  }),

  create: publicProcedure.input(z.object({ fullName: z.string().trim().min(2).max(120), phone: z.string().min(8).max(24), reason: z.string().trim().max(500).optional(), serviceId: z.number(), date: z.string(), time: z.string(), captchaToken: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    const phone = normalizePhone(input.phone);
    if (!isE164Phone(phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid mobile number." });
    await verifyCaptcha(input.captchaToken);
    const ipHash = clientIpHash(ctx.req);
    const config = await bookingSettings();
    if (!isBookableSlot(input.date, input.time, config.minimumNoticeHours * 60, config.maximumBookingDays)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an available future appointment time." });
    await enforceRateLimit("booking", phone, ipHash, 4, 60);
    const db = await requireDb();
    const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
    if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "That appointment service is no longer available." });
    if (!await isConfiguredWorkingTime(input.date, input.time, service.durationMinutes)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an available future appointment time." });
    const [activeCount] = await db.select({ total: count() }).from(appointments).innerJoin(patients, eq(appointments.patientId, patients.id)).where(and(eq(patients.phone, phone), inArray(appointments.status, ["pending", "confirmed"]), gte(appointments.startTime, new Date())));
    if (Number(activeCount?.total ?? 0) >= config.maxActiveBookings) throw new TRPCError({ code: "FORBIDDEN", message: "This number already has the maximum number of active future appointments." });
    let [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
    if (!patient) {
      try { await db.insert(patients).values({ fullName: input.fullName, phone, phoneVerified: false }); } catch { /* A concurrent booking may have created the same patient record. */ }
      [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
    } else await db.update(patients).set({ fullName: input.fullName, phoneVerified: false }).where(eq(patients.id, patient.id));
    if (!patient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking is temporarily unavailable. Please try again shortly." });
    const startTime = slotStart(input.date, input.time);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);
    const slotKey = startTime.toISOString();
    const [existingHold] = await db.select().from(slotHolds).where(and(eq(slotHolds.slotKey, slotKey), gte(slotHolds.expiresAt, new Date()))).limit(1);
    if (existingHold) throw new TRPCError({ code: "CONFLICT", message: "This appointment time is currently being reserved. Please choose another time." });
    const bookingId = `SVC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    try {
      await db.insert(appointments).values({ bookingId, patientId: patient.id, serviceId: service.id, startTime, endTime, slotKey, status: "confirmed", reason: input.reason || null });
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "This appointment slot was just taken. Please choose another time." });
      throw error;
    }
    await recordAttempt("booking", phone, ipHash);
    return { bookingId, patient: input.fullName, phone: maskPhone(phone), service: service.name, date: input.date, time: input.time, status: "Confirmed" as const };
  }),
});
