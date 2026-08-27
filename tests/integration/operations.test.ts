import { describe, expect, it } from "vitest";
import { appendAuditEntry } from "../../packages/database/src/audit";
import { prisma } from "../../packages/database/src/client";
import {
  InvalidOperationTransitionError,
  createOperation,
  transitionOperation
} from "../../packages/database/src/operations";

describe("audited operation foundation", () => {
  it("creates REQUESTED operations and rejects duplicate operationId", async () => {
    const suffix = crypto.randomUUID();
    const operationId = `op-${suffix}`;

    const created = await createOperation({
      operationId,
      idempotencyKey: `idem-${suffix}`,
      kind: "CAMPAIGN_CREATE",
      request: { name: "P0 dry-run contract" }
    });

    expect(created).toMatchObject({ operationId, state: "REQUESTED" });

    await expect(
      createOperation({
        operationId,
        idempotencyKey: `idem-other-${suffix}`,
        kind: "CAMPAIGN_CREATE"
      })
    ).rejects.toThrow();
  });

  it("allows REQUESTED -> SUBMITTED -> VERIFIED", async () => {
    const suffix = crypto.randomUUID();
    const operationId = `op-${suffix}`;

    await createOperation({
      operationId,
      idempotencyKey: `idem-${suffix}`,
      kind: "ADSET_UPDATE"
    });

    const submitted = await transitionOperation(operationId, "SUBMITTED", {
      metaRequestId: "req_1"
    });
    expect(submitted.state).toBe("SUBMITTED");

    const verified = await transitionOperation(operationId, "VERIFIED", {
      effectiveStatus: "PAUSED"
    });
    expect(verified).toMatchObject({ state: "VERIFIED" });
  });

  it("rejects invalid or terminal state transitions", async () => {
    const suffix = crypto.randomUUID();
    const operationId = `op-${suffix}`;

    await createOperation({
      operationId,
      idempotencyKey: `idem-${suffix}`,
      kind: "AD_UPDATE"
    });

    await expect(transitionOperation(operationId, "VERIFIED")).rejects.toBeInstanceOf(
      InvalidOperationTransitionError
    );

    await transitionOperation(operationId, "FAILED", { reason: "test" });
    await expect(transitionOperation(operationId, "SUBMITTED")).rejects.toBeInstanceOf(
      InvalidOperationTransitionError
    );
  });

  it("appends an audit entry without overwriting prior audit facts", async () => {
    const entityId = `entity-${crypto.randomUUID()}`;

    const first = await appendAuditEntry({
      actorId: "user_owner",
      source: "SYSTEM",
      action: "META_OPERATION_TRANSITION",
      entityType: "MetaApiOperation",
      entityId,
      before: { state: "REQUESTED" },
      after: { state: "SUBMITTED" },
      result: "SUCCESS",
      metadata: { operationId: entityId }
    });

    const second = await appendAuditEntry({
      actorId: "user_owner",
      source: "SYSTEM",
      action: "META_OPERATION_TRANSITION",
      entityType: "MetaApiOperation",
      entityId,
      before: { state: "SUBMITTED" },
      after: { state: "VERIFIED" },
      result: "SUCCESS"
    });

    expect(second.id).not.toBe(first.id);

    const storedFirst = await prisma.auditLog.findUnique({ where: { id: first.id } });
    expect(storedFirst).toMatchObject({
      id: first.id,
      entityId,
      before: { state: "REQUESTED" },
      after: { state: "SUBMITTED" }
    });
  });
});
