import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { appointments, auditLogs, availabilityRules, blockedDates, patients, services, siteSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { BUSINESS_OFFSET, isAvailableTime, slotStart } from "../bookingUtils";
import { adminProcedure, router } from "../_core/trpc";

const statusSchema = z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]);

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The admin service is temporarily unavailable." });
  return db;
}

async function audit(adminUserId: number, action: string, entityType: string, entityId?: number) {
  const db = await dbOrThrow();
  await db.insert(auditLogs).values({ adminUserId, action, entityType, entityId: entityId ?? null });
}

export const adminRouter = router({
  overview: adminProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const rows = await db
      .select({
        id: appointments.id,
        bookingId: appointments.bookingId,
        startTime: appointments.startTime,
        status: appointments.status,
        patientName: patients.fullName,
        phone: patients.phone,
        serviceName: services.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(and(gte(appointments.startTime, start), lt(appointments.startTime, end)))
      .orderBy(asc(appointments.startTime));
    const [upcoming] = await db.select({ total: count() }).from(appointments).where(and(gte(appointments.startTime, new Date()), inArray(appointments.status, ["pending", "confirmed"])));
    const [pending] = await db.select({ total: count() }).from(appointments).where(eq(appointments.status, "pending"));
    return { today: rows, totals: { today: rows.length, upcoming: Number(upcoming?.total ?? 0), pending: Number(pending?.total ?? 0) } };
  }),

  appointments: router({
    list: adminProcedure
      .input(z.object({ search: z.string().optional(), status: statusSchema.optional() }).optional())
      .query(async ({ input }) => {
        const db = await dbOrThrow();
        const filters = [];
        if (input?.status) filters.push(eq(appointments.status, input.status));
        if (input?.search?.trim()) {
          const value = `%${input.search.trim()}%`;
          filters.push(or(like(patients.fullName, value), like(patients.phone, value))!);
        }
        return db
          .select({
            id: appointments.id,
            bookingId: appointments.bookingId,
            startTime: appointments.startTime,
            endTime: appointments.endTime,
            status: appointments.status,
            reason: appointments.reason,
            patientName: patients.fullName,
            phone: patients.phone,
            serviceName: services.name,
          })
          .from(appointments)
          .innerJoin(patients, eq(appointments.patientId, patients.id))
          .innerJoin(services, eq(appointments.serviceId, services.id))
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(appointments.startTime));
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: statusSchema }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const patch: { status: typeof input.status; slotKey?: string } = { status: input.status };
        if (input.status === "cancelled") patch.slotKey = `released-${input.id}-${Date.now()}`;
        await db.update(appointments).set(patch).where(eq(appointments.id, input.id));
        await audit(ctx.user.id, `appointment_${input.status}`, "appointment", input.id);
        return { success: true };
      }),
    reschedule: adminProcedure
      .input(z.object({ id: z.number(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!isAvailableTime(input.time)) throw new TRPCError({ code: "BAD_REQUEST", message: "Please select an available appointment time." });
        const db = await dbOrThrow();
        const [appointment] = await db.select().from(appointments).where(eq(appointments.id, input.id)).limit(1);
        if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found." });
        const dayOfWeek = new Date(`${input.date}T12:00:00${BUSINESS_OFFSET}`).getDay();
        const [rule] = await db.select().from(availabilityRules).where(and(eq(availabilityRules.dayOfWeek, dayOfWeek), eq(availabilityRules.active, true))).limit(1);
        const [blocked] = await db.select().from(blockedDates).where(eq(blockedDates.date, input.date)).limit(1);
        if (!rule || blocked || input.time < rule.startTime || input.time >= rule.endTime) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This time is outside the centre’s configured availability." });
        }
        const startTime = slotStart(input.date, input.time);
        const endTime = new Date(startTime.getTime() + (appointment.endTime.getTime() - appointment.startTime.getTime()));
        const slotKey = startTime.toISOString();
        const conflict = await db.select().from(appointments).where(and(eq(appointments.slotKey, slotKey), inArray(appointments.status, ["pending", "confirmed"]))).limit(1);
        if (conflict.length && conflict[0]!.id !== appointment.id) {
          throw new TRPCError({ code: "CONFLICT", message: "This appointment slot was just taken. Please choose another time." });
        }
        await db.update(appointments).set({ startTime, endTime, slotKey, status: "confirmed" }).where(eq(appointments.id, appointment.id));
        await audit(ctx.user.id, "appointment_rescheduled", "appointment", appointment.id);
        return { success: true };
      }),
  }),

  patients: router({
    list: adminProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await dbOrThrow();
        const filters = input?.search?.trim() ? or(like(patients.fullName, `%${input.search.trim()}%`), like(patients.phone, `%${input.search.trim()}%`)) : undefined;
        const patientRows = await db.select().from(patients).where(filters).orderBy(desc(patients.updatedAt));
        const allAppointments = await db.select().from(appointments);
        return patientRows.map(patient => {
          const patientAppointments = allAppointments.filter(item => item.patientId === patient.id);
          const future = patientAppointments.filter(item => item.startTime.getTime() > Date.now() && ["pending", "confirmed"].includes(item.status));
          return {
            ...patient,
            appointmentCount: patientAppointments.length,
            lastAppointment: patientAppointments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime ?? null,
            upcomingAppointment: future.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]?.startTime ?? null,
          };
        });
      }),
  }),

  services: router({
    list: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return db.select().from(services).orderBy(asc(services.name));
    }),
    create: adminProcedure
      .input(z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(300).optional(), durationMinutes: z.number().int().min(10).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const result = await db.insert(services).values({ name: input.name, description: input.description || null, durationMinutes: input.durationMinutes, active: true });
        await audit(ctx.user.id, "service_created", "service", Number(result[0].insertId));
        return { success: true };
      }),
    toggle: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        await db.update(services).set({ active: input.active }).where(eq(services.id, input.id));
        await audit(ctx.user.id, "service_updated", "service", input.id);
        return { success: true };
      }),
  }),

  settings: router({
    list: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return db.select().from(siteSettings).orderBy(asc(siteSettings.key));
    }),
    update: adminProcedure
      .input(z.object({ key: z.string().min(2).max(64), value: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        await db.insert(siteSettings).values({ key: input.key, value: input.value }).onDuplicateKeyUpdate({ set: { value: input.value } });
        await audit(ctx.user.id, "setting_updated", "setting");
        return { success: true };
      }),
  }),

  availability: router({
    list: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return {
        rules: await db.select().from(availabilityRules).orderBy(asc(availabilityRules.dayOfWeek)),
        blocked: await db.select().from(blockedDates).orderBy(asc(blockedDates.date)),
      };
    }),
    saveRule: adminProcedure
      .input(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [existing] = await db.select().from(availabilityRules).where(eq(availabilityRules.dayOfWeek, input.dayOfWeek)).limit(1);
        if (existing) await db.update(availabilityRules).set(input).where(eq(availabilityRules.id, existing.id));
        else await db.insert(availabilityRules).values(input);
        await audit(ctx.user.id, "availability_updated", "availability");
        return { success: true };
      }),
  }),
});
