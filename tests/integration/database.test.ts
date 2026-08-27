import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../packages/database/src/client";
import { databaseHealth } from "../../packages/database/src/health";

describe("database baseline", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reports a healthy PostgreSQL connection", async () => {
    await expect(databaseHealth()).resolves.toEqual({ status: "ok" });
  });

  it("persists an operation id exactly once", async () => {
    const suffix = crypto.randomUUID();
    const operationId = `op-${suffix}`;
    const idempotencyKey = `idem-${suffix}`;

    await prisma.metaApiOperation.create({
      data: {
        operationId,
        idempotencyKey,
        kind: "TEST",
        state: "REQUESTED"
      }
    });

    const stored = await prisma.metaApiOperation.findUnique({
      where: { operationId }
    });

    expect(stored?.operationId).toBe(operationId);
    await expect(
      prisma.metaApiOperation.create({
        data: {
          operationId,
          idempotencyKey: `other-${suffix}`,
          kind: "TEST",
          state: "REQUESTED"
        }
      })
    ).rejects.toThrow();
  });
});
