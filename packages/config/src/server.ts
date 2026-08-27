import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  APP_URL: z.url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_SYSTEM_USER_TOKEN: z.string().min(1),
  META_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/),
  TOKEN_ENCRYPTION_KEY: z.string().min(32)
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(input);
}
