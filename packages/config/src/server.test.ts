import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server";

describe("parseServerEnv", () => {
  it("fails when META_GRAPH_VERSION is missing", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: "postgresql://x",
        REDIS_URL: "redis://x"
      })
    ).toThrow();
  });

  it("accepts a complete fake server environment", () => {
    const env = parseServerEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/xst",
      REDIS_URL: "redis://localhost:6379",
      APP_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
      META_APP_ID: "fake-app",
      META_APP_SECRET: "fake-secret",
      META_SYSTEM_USER_TOKEN: "fake-token",
      META_GRAPH_VERSION: "v26.0",
      TOKEN_ENCRYPTION_KEY: "01234567890123456789012345678901"
    });

    expect(env.META_GRAPH_VERSION).toBe("v26.0");
  });
});
