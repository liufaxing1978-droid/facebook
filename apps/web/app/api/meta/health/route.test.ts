import { describe, expect, it } from "vitest";
import { MetaClientError } from "../../../../../../packages/meta/src/errors";
import { createMetaHealthHandler } from "./route";

describe("GET /api/meta/health", () => {
  it("returns only sanitized connected identity metadata", async () => {
    const handler = createMetaHealthHandler(() =>
      Promise.resolve({ id: "provider-user-1", name: "XST Meta" })
    );

    const response = await handler();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "connected",
      identity: { id: "provider-user-1", name: "XST Meta" }
    });
  });

  it.each(["META_AUTH_ERROR", "META_PERMISSION_ERROR"] as const)(
    "sanitizes %s without raw Meta data, token, trace id or stack",
    async (code) => {
      const handler = createMetaHealthHandler(() =>
        Promise.reject(
          new MetaClientError(code, "sensitive provider message", { status: 403, metaCode: 190 })
        )
      );

      const response = await handler();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({ status: "error", code });
      expect(JSON.stringify(body)).not.toContain("sensitive provider message");
      expect(JSON.stringify(body)).not.toContain("test-token");
      expect(JSON.stringify(body)).not.toContain("trace");
      expect(JSON.stringify(body)).not.toContain("stack");
    }
  );

  it("maps unknown verifier failures to a stable sanitized API error", async () => {
    const handler = createMetaHealthHandler(() => Promise.reject(new Error("raw failure")));

    const response = await handler();
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "META_API_ERROR"
    });
    expect(response.status).toBe(503);
  });
});
