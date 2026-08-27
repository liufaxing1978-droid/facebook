import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

export type AppendAuditEntryInput = Readonly<{
  actorId?: string;
  source: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  result: string;
  metadata?: Prisma.InputJsonValue;
}>;

export async function appendAuditEntry(input: AppendAuditEntryInput) {
  return prisma.auditLog.create({
    data: {
      source: input.source,
      action: input.action,
      entityType: input.entityType,
      result: input.result,
      ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
      ...(input.entityId !== undefined ? { entityId: input.entityId } : {}),
      ...(input.before !== undefined ? { before: input.before } : {}),
      ...(input.after !== undefined ? { after: input.after } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
    }
  });
}
