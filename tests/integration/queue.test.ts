import { afterAll, describe, expect, it } from "vitest";
import {
  createOperationQueue,
  enqueueOperation,
  queueHealth
} from "../../apps/worker/src/queue";

const queueName = `xst-meta-test-${crypto.randomUUID()}`;
const queue = createOperationQueue(queueName);

describe("queue baseline", () => {
  afterAll(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it("reports a healthy Redis connection", async () => {
    await expect(queueHealth()).resolves.toEqual({ status: "ok" });
  });

  it("uses operationId as the BullMQ job id", async () => {
    const operationId = `op-${crypto.randomUUID()}`;
    const first = await enqueueOperation(queue, "TEST", operationId, { value: 1 });
    const second = await enqueueOperation(queue, "TEST", operationId, { value: 2 });

    expect(first.id).toBe(operationId);
    expect(second.id).toBe(operationId);
    expect((await queue.getWaiting()).filter((job) => job.id === operationId)).toHaveLength(1);
  });
});
