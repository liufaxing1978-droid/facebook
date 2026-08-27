import { describe, expect, it } from "vitest";
import { MetaClient } from "./client";
import { assertPageAllowed, parseGraphCollection } from "./graph-envelope";

describe("parseGraphCollection", () => {
  it("parses data and next cursor while ignoring unknown fields", () => {
    const result = parseGraphCollection(
      {
        data: [{ id: "1", extra: true }],
        paging: { next: "https://graph.facebook.com/v26.0/x?after=abc" },
        extraRoot: 1
      },
      (value) => ({ id: String((value as { id: string }).id) })
    );

    expect(result.items).toEqual([{ id: "1" }]);
    expect(result.next?.toString()).toContain("after=abc");
  });

  it("fails closed when data is not an array", () => {
    expect(() => parseGraphCollection({ data: {} }, (value) => value)).toThrow("data");
  });

  it("rejects paging.next outside graph.facebook.com", () => {
    expect(() =>
      parseGraphCollection(
        { data: [], paging: { next: "https://example.com/steal" } },
        (value) => value
      )
    ).toThrow("graph.facebook.com");
  });
});

describe("assertPageAllowed", () => {
  it("rejects a repeated next URL", () => {
    const next = new URL("https://graph.facebook.com/v26.0/x?after=abc");
    expect(() => assertPageAllowed(next, new Set([next.toString()]), 2, 100)).toThrow("repeated");
  });

  it("rejects requests beyond the configured page cap", () => {
    const next = new URL("https://graph.facebook.com/v26.0/x?after=def");
    expect(() => assertPageAllowed(next, new Set(), 101, 100)).toThrow("page limit");
  });
});

describe("MetaClient.requestUrl", () => {
  it("follows only graph.facebook.com URLs and keeps access token server-side", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      seen.push(requestUrl);
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    };

    const client = new MetaClient({
      graphVersion: "v26.0",
      accessToken: "test-token-never-real",
      fetchImpl
    });

    await client.requestUrl(new URL("https://graph.facebook.com/v26.0/me/adaccounts?after=abc"));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("after=abc");
    expect(seen[0]).toContain("access_token=test-token-never-real");
    await expect(client.requestUrl(new URL("https://example.com/nope"))).rejects.toThrow("graph.facebook.com");
  });
});
