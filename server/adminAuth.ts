import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { readAdminCredentials } from "./adminCredentials";

export const ADMIN_SESSION_COOKIE = "shireesha_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export type AdminSession = { email: string };

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return createHash("sha256").update(secret).digest();
}

function attemptKey(email: string, ip: string) {
  return createHash("sha256").update(`${email}|${ip}`).digest("hex");
}

function requestIp(req: { headers?: Record<string, string | string[] | undefined>; ip?: string }) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return value?.trim() || req.ip || "unknown";
}

export function verifyPasswordHash(password: string, encodedHash: string) {
  const [algorithm, salt, expected] = encodedHash.split(".");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createAdminSessionToken(email: string) {
  return new SignJWT({ scope: "admin-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
}

export async function getAdminSession(req: { headers?: Record<string, string | string[] | undefined> }): Promise<AdminSession | null> {
  const header = req.headers?.cookie;
  const cookieHeader = Array.isArray(header) ? header.join(";") : header ?? "";
  const token = parse(cookieHeader)[ADMIN_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = typeof payload.sub === "string" ? payload.sub : undefined;
    if (payload.scope !== "admin-password" || !email || email !== readAdminCredentials().email) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function signInAdmin(email: string, password: string, req: { headers?: Record<string, string | string[] | undefined>; ip?: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const key = attemptKey(normalizedEmail, requestIp(req));
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  }
  const credentials = readAdminCredentials();
  const valid = normalizedEmail === credentials.email && verifyPasswordHash(password, credentials.passwordHash);
  if (!valid) {
    attempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: now + ATTEMPT_WINDOW_MS });
    throw new TRPCError({ code: "UNAUTHORIZED", message: "The email or password is incorrect." });
  }
  attempts.delete(key);
  return { email: credentials.email, token: await createAdminSessionToken(credentials.email) };
}

export function adminCookieOptions(req: Parameters<typeof getSessionCookieOptions>[0]) {
  return { ...getSessionCookieOptions(req), maxAge: SESSION_SECONDS * 1000 };
}
