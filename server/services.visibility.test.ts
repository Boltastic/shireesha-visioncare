import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { services } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const serviceName = `Automated service visibility ${Date.now()}`;
let serviceId: number | undefined;

function caller() {
  const ctx: TrpcContext = { user: null, adminSession: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
  return appRouter.createCaller(ctx);
}

describe("public booking service visibility", () => {
  it("shows active admin-managed services and excludes a service once it is paused", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const result = await db!.insert(services).values({ name: serviceName, description: "Temporary automated visibility check", durationMinutes: 30, active: true });
    serviceId = Number(result[0].insertId);

    await expect(caller().booking.services()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: serviceId, name: serviceName })]));
    await db!.update(services).set({ active: false }).where(eq(services.id, serviceId));
    await expect(caller().booking.services()).resolves.not.toEqual(expect.arrayContaining([expect.objectContaining({ id: serviceId })]));
  });
});

afterAll(async () => {
  if (!serviceId) return;
  const db = await getDb();
  if (db) await db.delete(services).where(eq(services.id, serviceId));
});
