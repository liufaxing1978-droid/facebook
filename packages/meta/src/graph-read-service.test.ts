import { describe, expect, it } from "vitest";
import { MetaClient } from "./client";
import { GraphMetaReadService } from "./graph-read-service";

function createService(
  responder: (url: URL) => Promise<Response>,
  options?: { maxPages?: number }
): GraphMetaReadService {
  const fetchImpl: typeof fetch = (input) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    );
    return responder(url);
  };

  return new GraphMetaReadService(
    new MetaClient({
      graphVersion: "v26.0",
      accessToken: "test-token-never-real",
      fetchImpl
    }),
    options
  );
}

function account(id: string) {
  return {
    id,
    name: `Account ${id}`,
    account_status: 1,
    currency: "USD",
    timezone_name: "America/Los_Angeles",
    unknown_future_field: true
  };
}

describe("GraphMetaReadService.listAdAccounts", () => {
  it("reads and parses one ad account page with exact requested fields", async () => {
    let seen: URL | undefined;
    const service = createService((url) => {
      seen = url;
      return Promise.resolve(new Response(JSON.stringify({ data: [account("act_1")] }), { status: 200 }));
    });

    await expect(service.listAdAccounts()).resolves.toEqual([
      {
        id: "act_1",
        name: "Account act_1",
        status: 1,
        currency: "USD",
        timezone: "America/Los_Angeles"
      }
    ]);

    expect(seen?.pathname).toBe("/v26.0/me/adaccounts");
    expect(seen?.searchParams.get("fields")).toBe(
      "id,name,account_status,currency,timezone_name"
    );
  });

  it("preserves order across multiple pages", async () => {
    let calls = 0;
    const service = createService((url) => {
      calls += 1;
      if (url.searchParams.get("after") === "p2") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [account("act_2")] }), { status: 200 })
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [account("act_1")],
            paging: { next: "https://graph.facebook.com/v26.0/me/adaccounts?after=p2" }
          }),
          { status: 200 }
        )
      );
    });

    const result = await service.listAdAccounts();
    expect(result.map((item) => item.id)).toEqual(["act_1", "act_2"]);
    expect(calls).toBe(2);
  });

  it("fails closed when a required account id is missing", async () => {
    const service = createService(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                name: "Broken",
                account_status: 1,
                currency: "USD",
                timezone_name: "UTC"
              }
            ]
          }),
          { status: 200 }
        )
      )
    );

    await expect(service.listAdAccounts()).rejects.toThrow();
  });

  it("rejects a repeated paging.next URL", async () => {
    const repeated = "https://graph.facebook.com/v26.0/me/adaccounts?after=same";
    const service = createService((url) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [account(url.searchParams.get("after") === "same" ? "act_2" : "act_1")],
            paging: { next: repeated }
          }),
          { status: 200 }
        )
      )
    );

    await expect(service.listAdAccounts()).rejects.toThrow("repeated");
  });

  it("enforces the configured page cap before following another page", async () => {
    let calls = 0;
    const service = createService(
      () => {
        calls += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [account("act_1")],
              paging: { next: "https://graph.facebook.com/v26.0/me/adaccounts?after=p2" }
            }),
            { status: 200 }
          )
        );
      },
      { maxPages: 1 }
    );

    await expect(service.listAdAccounts()).rejects.toThrow("page limit");
    expect(calls).toBe(1);
  });
});
