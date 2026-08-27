import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/src/errors";
import { MetaClient } from "./client";

type FetchLike = typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createClient(fetchImpl: FetchLike, timeoutMs = 50) {
  return new MetaClient({
    graphVersion: "v26.0",
    accessToken: "test-token-never-real",
    fetchImpl,
    timeoutMs
  });
}

async function expectCode(promise: Promise<unknown>, code: AppError["code"]) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("MetaClient", () => {
  it("builds a versioned Graph URL from configuration", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ data: [{ id: "act_1" }] }));
    const client = createClient(fetchImpl);

    await client.request<{ data: Array<{ id: string }> }>("me/adaccounts", {
      query: { fields: "id,name", limit: 25 }
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [input, init] = fetchImpl.mock.calls[0] ?? [];
    const url = new URL(String(input));
    expect(url.origin).toBe("https://graph.facebook.com");
    expect(url.pathname).toBe("/v26.0/me/adaccounts");
    expect(url.searchParams.get("fields")).toBe("id,name");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("access_token")).toBe("test-token-never-real");
    expect(init?.method).toBe("GET");
  });

  it("maps request timeout to META_API_ERROR", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      })
    );

    await expectCode(createClient(fetchImpl, 5).request("me"), "META_API_ERROR");
  });

  it("maps Meta authentication failures", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ error: { message: "Invalid OAuth access token.", type: "OAuthException", code: 190 } }, 400)
    );

    await expectCode(createClient(fetchImpl).request("me"), "META_AUTH_ERROR");
  });

  it("maps Meta permission failures", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ error: { message: "Permissions error", type: "OAuthException", code: 200 } }, 403)
    );

    await expectCode(createClient(fetchImpl).request("act_1/campaigns"), "META_PERMISSION_ERROR");
  });

  it("maps Meta rate limiting failures", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ error: { message: "Application request limit reached", type: "OAuthException", code: 4 } }, 429)
    );

    await expectCode(createClient(fetchImpl).request("act_1/insights"), "META_RATE_LIMIT");
  });

  it("maps unknown Graph failures to META_API_ERROR", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({ error: { message: "Unexpected Graph failure", type: "GraphMethodException", code: 100 } }, 500)
    );

    await expectCode(createClient(fetchImpl).request("me"), "META_API_ERROR");
  });
});
