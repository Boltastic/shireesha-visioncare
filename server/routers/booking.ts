import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import {
  appointments,
  availabilityRules,
  blockedDates,
  bookingAttempts,
  otpChallenges,
  patients,
  services,
  siteSettings,
  slotHolds,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  BUSINESS_OFFSET,
  hashValue,
  isBookableSlot,
  isE164Phone,
  maskPhone,
  normalizePhone,
  SLOT_TIMES,
  slotStart,
} from "../bookingUtils";
import { issueVerificationToken, sendOtp, verifyProviderOtp } from "../otp";
import { publicProcedure, router } from "../_core/trpc";

const publicServiceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number(),
});

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
  const [phoneResult] = await db
    .select({ total: count() })
    .from(bookingAttempts)
    .where(and(eq(bookingAttempts.kind, kind), eq(bookingAttempts.phone, phone), gte(bookingAttempts.createdAt, since)));
  const [ipResult] = await db
    .select({ total: count() })
    .from(bookingAttempts)
    .where(and(eq(bookingAttempts.kind, kind), eq(bookingAttempts.ipHash, ipHash), gte(bookingAttempts.createdAt, since)));
  if (Number(phoneResult?.total ?? 0) >= max || Number(ipResult?.total ?? 0) >= max * 2) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a moment and try again." });
  }
}

async function verifyCaptcha(token: string) {
  if (process.env.NODE_ENV !== "production") {
    if (token === "development-pass") return;
    throw new TRPCError({ code: "BAD_REQUEST", message: "Please complete the preview security check." });
  }
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Appointments are temporarily unavailable. Please try again shortly." });
  }
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: "The security verification could not be confirmed." });
}

async function ensureSetupService() {
  const db = await requireDb();
  const existing = await db.select().from(services).where(eq(services.active, true)).limit(1);
  if (existing.length) return existing[0]!;
  await db.insert(services).values({
    name: "Vision care appointment",
    description: "Choose a suitable time to discuss your needs with the centre.",
    durationMinutes: 30,
    active: true,
  });
  const [created] = await db.select().from(services).where(eq(services.active, true)).limit(1);
  return created!;
}

async function ensureAvailabilityRules() {
  const db = await requireDb();
  const existing = await db.select().from(availabilityRules).limit(1);
  if (existing.length) return;
  await db.insert(availabilityRules).values([1, 2, 3, 4, 5, 6].map(dayOfWeek => ({ dayOfWeek, startTime: "09:00", endTime: "17:00", active: true })));
}

async function bookingSettings() {
  const db = await requireDb();
  const all = await db.select().from(siteSettings);
  const values = new Map(all.map(item => [item.key, Number(item.value)]));
  return {
    maxActiveBookings: values.get("max_active_bookings") || 2,
    slotHoldMinutes: values.get("slot_hold_minutes") || 5,
    minimumNoticeHours: values.get("min_booking_notice_hours") || 1,
    maximumBookingDays: values.get("max_booking_days") || 90,
  };
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
  const requestedEnd = (hour ?? 0) * 60 + (minute ?? 0) + durationMinutes;
  const closing = (closeHour ?? 0) * 60 + (closeMinute ?? 0);
  return !blocked && time >= rule.startTime && requestedEnd <= closing;
}

export const bookingRouter = router({
  services: publicProcedure.query(async () => {
    await ensureSetupService();
    const db = await requireDb();
    return db
      .select({ id: services.id, name: services.name, description: services.description, durationMinutes: services.durationMinutes })
      .from(services)
      .where(eq(services.active, true));
  }),

  availableSlots: publicProcedure
    .input(z.object({ date: z.string(), serviceId: z.number() }))
    .query(async ({ input }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return [];
      const db = await requireDb();
      const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
      if (!service) return [];
      const config = await bookingSettings();
      await ensureAvailabilityRules();
      const dayStart = new Date(`${input.date}T00:00:00${BUSINESS_OFFSET}`);
      const dayEnd = new Date(`${input.date}T23:59:59${BUSINESS_OFFSET}`);
      const activeAppointments = await db
        .select({ startTime: appointments.startTime })
        .from(appointments)
        .where(and(gte(appointments.startTime, dayStart), lt(appointments.startTime, dayEnd), inArray(appointments.status, ["pending", "confirmed"])));
      const taken = new Set(activeAppointments.map(item => item.startTime.toISOString()));
      await db.delete(slotHolds).where(lt(slotHolds.expiresAt, new Date()));
      const activeHolds = await db.select({ slotKey: slotHolds.slotKey }).from(slotHolds).where(gte(slotHolds.expiresAt, new Date()));
      const held = new Set(activeHolds.map(item => item.slotKey));
      return Promise.all(SLOT_TIMES.map(async time => ({
        time,
        available: isBookableSlot(input.date, time, config.minimumNoticeHours * 60, config.maximumBookingDays) && await isConfiguredWorkingTime(input.date, time, service.durationMinutes) && !taken.has(slotStart(input.date, time).toISOString()) && !held.has(slotStart(input.date, time).toISOString()),
      })));
    }),

  requestOtp: publicProcedure
    .input(z.object({ phone: z.string().min(8).max(24), captchaToken: z.string().min(1), serviceId: z.number(), date: z.string(), time: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const phone = normalizePhone(input.phone);
      if (!isE164Phone(phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a mobile number with country code, for example +91 98765 43210." });
      const ipHash = clientIpHash(ctx.req);
      const config = await bookingSettings();
      const db = await requireDb();
      const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
      if (!service || !isBookableSlot(input.date, input.time, config.minimumNoticeHours * 60, config.maximumBookingDays) || !await isConfiguredWorkingTime(input.date, input.time, service.durationMinutes)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That appointment time is no longer available. Please choose another time." });
      }
      await verifyCaptcha(input.captchaToken);
      await enforceRateLimit("otp_request", phone, ipHash, 3, 60);
      await db.delete(slotHolds).where(lt(slotHolds.expiresAt, new Date()));
      const slotKey = slotStart(input.date, input.time).toISOString();
      const [existingHold] = await db.select().from(slotHolds).where(eq(slotHolds.slotKey, slotKey)).limit(1);
      const holdExpiry = new Date(Date.now() + config.slotHoldMinutes * 60 * 1000);
      if (existingHold && existingHold.phone !== phone) throw new TRPCError({ code: "CONFLICT", message: "This appointment slot is being reserved by another patient. Please choose another time." });
      if (existingHold) await db.update(slotHolds).set({ expiresAt: holdExpiry, phone, serviceId: input.serviceId }).where(eq(slotHolds.id, existingHold.id));
      else await db.insert(slotHolds).values({ slotKey, phone, serviceId: input.serviceId, expiresAt: holdExpiry });
      const { provider, codeHash } = await sendOtp(phone);
      const resendAfter = new Date(Date.now() + 60 * 1000);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const result = await db.insert(otpChallenges).values({
        phone,
        provider,
        codeHash,
        expiresAt,
        resendAfter,
        attempts: 0,
      });
      await recordAttempt("otp_request", phone, ipHash);
      return { challengeId: Number(result[0].insertId), resendAfter, provider, holdExpiresAt: holdExpiry };
    }),

  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string(), challengeId: z.number(), code: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ input, ctx }) => {
      const phone = normalizePhone(input.phone);
      const ipHash = clientIpHash(ctx.req);
      await enforceRateLimit("otp_verify", phone, ipHash, 5, 15);
      const db = await requireDb();
      const [challenge] = await db
        .select()
        .from(otpChallenges)
        .where(and(eq(otpChallenges.id, input.challengeId), eq(otpChallenges.phone, phone)))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);
      if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This verification code has expired. Please request a new code." });
      }
      if (challenge.attempts >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please request a new code." });
      const verified = await verifyProviderOtp(phone, input.code, challenge.provider as "development" | "twilio", challenge.codeHash);
      await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id));
      await recordAttempt("otp_verify", phone, ipHash);
      if (!verified) throw new TRPCError({ code: "BAD_REQUEST", message: "The verification code is incorrect. Please try again." });
      const verificationToken = issueVerificationToken();
      await db
        .update(otpChallenges)
        .set({ verifiedAt: new Date(), verificationTokenHash: hashValue(verificationToken) })
        .where(eq(otpChallenges.id, challenge.id));
      return { verificationToken };
    }),

  create: publicProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().min(8).max(24),
        reason: z.string().trim().max(500).optional(),
        serviceId: z.number(),
        date: z.string(),
        time: z.string(),
        challengeId: z.number(),
        verificationToken: z.string().min(12),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const phone = normalizePhone(input.phone);
      if (!isE164Phone(phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid mobile number." });
      const ipHash = clientIpHash(ctx.req);
      const config = await bookingSettings();
      if (!isBookableSlot(input.date, input.time, config.minimumNoticeHours * 60, config.maximumBookingDays)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an available future appointment time." });
      await enforceRateLimit("booking", phone, ipHash, 4, 60);
      const db = await requireDb();
      const [challenge] = await db
        .select()
        .from(otpChallenges)
        .where(and(eq(otpChallenges.id, input.challengeId), eq(otpChallenges.phone, phone)))
        .limit(1);
      if (
        !challenge ||
        !challenge.verifiedAt ||
        challenge.expiresAt.getTime() < Date.now() ||
        challenge.verificationTokenHash !== hashValue(input.verificationToken)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Please verify your phone number before booking." });
      }
      const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "That appointment service is no longer available." });
      if (!await isConfiguredWorkingTime(input.date, input.time, service.durationMinutes)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an available future appointment time." });
      const [activeCount] = await db
        .select({ total: count() })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .where(and(eq(patients.phone, phone), inArray(appointments.status, ["pending", "confirmed"]), gte(appointments.startTime, new Date())));
      if (Number(activeCount?.total ?? 0) >= config.maxActiveBookings) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This number already has the maximum number of active future appointments." });
      }
      let [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
      if (!patient) {
        try {
          await db.insert(patients).values({ fullName: input.fullName, phone, phoneVerified: true });
        } catch {
          // A concurrent booking may have created the same private patient record.
        }
        [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
      } else {
        await db.update(patients).set({ fullName: input.fullName, phoneVerified: true }).where(eq(patients.id, patient.id));
      }
      if (!patient) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking is temporarily unavailable. Please try again shortly." });
      const startTime = slotStart(input.date, input.time);
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);
      const slotKey = startTime.toISOString();
      const [hold] = await db.select().from(slotHolds).where(and(eq(slotHolds.slotKey, slotKey), eq(slotHolds.phone, phone), eq(slotHolds.serviceId, input.serviceId), gte(slotHolds.expiresAt, new Date()))).limit(1);
      if (!hold) throw new TRPCError({ code: "CONFLICT", message: "Your reserved time has expired. Please choose the appointment time again." });
      const bookingId = `SVC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      try {
        await db.insert(appointments).values({
          bookingId,
          patientId: patient.id,
          serviceId: service.id,
          startTime,
          endTime,
          slotKey,
          status: "confirmed",
          reason: input.reason || null,
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "This appointment slot was just taken. Please choose another time." });
        }
        throw error;
      }
      await db.update(otpChallenges).set({ consumedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
      await db.delete(slotHolds).where(eq(slotHolds.id, hold.id));
      await recordAttempt("booking", phone, ipHash);
      return {
        bookingId,
        patient: input.fullName,
        phone: maskPhone(phone),
        service: service.name,
        date: input.date,
        time: input.time,
        status: "Confirmed" as const,
      };
    }),
});
