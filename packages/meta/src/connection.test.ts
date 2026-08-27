import { describe, expect, it } from "vitest";
import { MetaClient } from "./client";
import { MetaClientError } from "./errors";
import { verifyMetaConnection } from "./connection";

function clientFor(
  handler: (url: URL, init: RequestInit) => Promise<Response>
): MetaClient {
  const fetchImpl: typeof fetch = (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    );
    return handler(url, init ?? {});
  };

  return new MetaClient({
    graphVersion: "v26.0",
    accessToken: "test-token-never-real",
    fetchImpl
  });
}

describe("verifyMetaConnection", () => {
  it("verifies identity through GET /me with id and name fields", async () => {
    let seenMethod: string | undefined;
    let seenUrl: URL | undefined;
    const client = clientFor((url, init) => {
      seenMethod = init.method;
      seenUrl = url;
      return Promise.resolve(
        new Response(JSON.stringify({ id: "user-123", name: "XST Owner", extra: true }), {
          status: 200
        })
      );
    });

    await expect(verifyMetaConnection(client)).resolves.toEqual({
      id: "user-123",
      name: "XST Owner"
    });

    expect(seenMethod).toBe("GET");
    expect(seenUrl?.pathname).toBe("/v26.0/me");
    expect(seenUrl?.searchParams.get("fields")).toBe("id,name");
    expect(seenUrl?.searchParams.get("access_token")).toBe("test-token-never-real");
  });

  it("fails closed when Meta identity id is missing", async () => {
    const client = clientFor(() =>
      Promise.resolve(new Response(JSON.stringify({ name: "No ID" }), { status: 200 }))
    );

    await expect(verifyMetaConnection(client)).rejects.toThrow("id");
  });

  it("fails closed when Meta identity id is blank", async () => {
    const client = clientFor(() =>
      Promise.resolve(new Response(JSON.stringify({ id: "   " }), { status: 200 }))
    );

    await expect(verifyMetaConnection(client)).rejects.toThrow("id");
  });

  it("propagates normalized auth errors", async () => {
    const client = clientFor(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { message: "Invalid OAuth access token.", code: 190 } }),
          { status: 401 }
        )
      )
    );

    await expect(verifyMetaConnection(client)).rejects.toBeInstanceOf(MetaClientError);
    await expect(verifyMetaConnection(client)).rejects.toMatchObject({ code: "META_AUTH_ERROR" });
  });
});
