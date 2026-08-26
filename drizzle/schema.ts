import { boolean, datetime, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  phoneVerified: boolean("phoneVerified").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  durationMinutes: int("durationMinutes").notNull().default(30),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: varchar("bookingId", { length: 40 }).notNull().unique(),
  patientId: int("patientId").notNull(),
  serviceId: int("serviceId").notNull(),
  startTime: datetime("startTime", { mode: "date" }).notNull(),
  endTime: datetime("endTime", { mode: "date" }).notNull(),
  slotKey: varchar("slotKey", { length: 80 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "no_show"]).notNull().default("confirmed"),
  reason: text("reason"),
  calendarEventId: varchar("calendarEventId", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("appointments_patient_idx").on(table.patientId), index("appointments_start_idx").on(table.startTime)]);

export const otpChallenges = mysqlTable("otpChallenges", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  provider: varchar("provider", { length: 20 }).notNull(),
  codeHash: varchar("codeHash", { length: 64 }),
  verificationTokenHash: varchar("verificationTokenHash", { length: 64 }),
  attempts: int("attempts").notNull().default(0),
  expiresAt: datetime("expiresAt", { mode: "date" }).notNull(),
  resendAfter: datetime("resendAfter", { mode: "date" }).notNull(),
  verifiedAt: datetime("verifiedAt", { mode: "date" }),
  consumedAt: datetime("consumedAt", { mode: "date" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("otp_phone_idx").on(table.phone), index("otp_expiry_idx").on(table.expiresAt)]);

export const availabilityRules = mysqlTable("availabilityRules", {
  id: int("id").autoincrement().primaryKey(),
  dayOfWeek: int("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("availability_day_idx").on(table.dayOfWeek, table.active)]);

export const blockedDates = mysqlTable("blockedDates", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  reason: varchar("reason", { length: 180 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const slotHolds = mysqlTable("slotHolds", {
  id: int("id").autoincrement().primaryKey(),
  slotKey: varchar("slotKey", { length: 80 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  serviceId: int("serviceId").notNull(),
  expiresAt: datetime("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("slot_hold_expiry_idx").on(table.expiresAt), index("slot_hold_phone_idx").on(table.phone)]);

export const bookingAttempts = mysqlTable("bookingAttempts", {
  id: int("id").autoincrement().primaryKey(),
  kind: varchar("kind", { length: 32 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  ipHash: varchar("ipHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("attempt_kind_phone_idx").on(table.kind, table.phone, table.createdAt)]);

export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: varchar("value", { length: 500 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: int("entityId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_admin_idx").on(table.adminUserId, table.createdAt)]);
