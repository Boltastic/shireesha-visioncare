import { describe, expect, it, vi } from "vitest";

const updateWhere = vi.fn(async () => undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));
const auditValues = vi.fn(async () => undefined);
const db = {
  update: vi.fn(() => ({ set: updateSet })),
  insert: vi.fn(() => ({ values: auditValues })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => db) }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("administrator appointment actions", () => {
  it("allows an administrator to update an appointment status and emits an audit record", async () => {
    const ctx: TrpcContext = {
      user: { id: 3, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).admin.appointments.updateStatus({ id: 44, status: "cancelled" });
    expect(result).toEqual({ success: true });
    expect(db.update).toHaveBeenCalled();
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({ action: "appointment_cancelled", entityId: 44 }));
  });
});
