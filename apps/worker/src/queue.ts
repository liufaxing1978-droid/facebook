import { Queue, type JobsOptions } from "bullmq";
import Redis, { type RedisOptions } from "ioredis";

export type OperationPayload = Readonly<Record<string, unknown>>;
export type OperationJobData = Readonly<{
  operationId: string;
  payload: OperationPayload;
}>;

function redisOptions(): RedisOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const options: RedisOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null
  };

  if (url.username) {
    options.username = decodeURIComponent(url.username);
  }
  if (url.password) {
    options.password = decodeURIComponent(url.password);
  }

  return options;
}

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1_000
  },
  removeOnComplete: 100,
  removeOnFail: 500
};

export function createOperationQueue(name: string): Queue<OperationJobData> {
  return new Queue<OperationJobData>(name, {
    connection: redisOptions(),
    defaultJobOptions
  });
}

export async function enqueueOperation(
  queue: Queue<OperationJobData>,
  name: string,
  operationId: string,
  payload: OperationPayload
) {
  return queue.add(
    name,
    { operationId, payload },
    {
      jobId: operationId
    }
  );
}

export async function queueHealth() {
  const redis = new Redis({
    ...redisOptions(),
    lazyConnect: true
  });

  try {
    await redis.connect();
    const response = await redis.ping();
    if (response !== "PONG") {
      throw new Error("Redis ping failed");
    }
    return { status: "ok" as const };
  } finally {
    if (redis.status === "ready") {
      await redis.quit();
    } else {
      redis.disconnect();
    }
  }
}
