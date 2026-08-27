import { describe, expect, it } from "vitest";
import { MetaClient } from "./client";
import { GraphMetaReadService } from "./graph-read-service";
import type { MetaInsightScope } from "./services";

function createService(responder: (url: URL) => Promise<Response>): GraphMetaReadService {
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
    })
  );
}

const metricRow = {
  date_start: "2026-08-01",
  date_stop: "2026-08-07",
  spend: "12.34",
  impressions: "1000",
  reach: "800",
  clicks: "25",
  ctr: "2.5",
  cpc: "0.4936",
  cpm: "12.34"
};

const range = { since: "2026-08-01", until: "2026-08-07" } as const;

const scopes: MetaInsightScope[] = [
  { level: "account", id: "act_1" },
  { level: "campaign", id: "cmp_1" },
  { level: "adset", id: "as_1" },
  { level: "ad", id: "ad_1" }
];

describe("GraphMetaReadService.readInsights", () => {
  it.each(scopes)("reads $level insights with exact path and query", async (scope) => {
    let seen: URL | undefined;
    const service = createService((url) => {
      seen = url;
      return Promise.resolve(
        new Response(JSON.stringify({ data: [metricRow] }), { status: 200 })
      );
    });

    await expect(service.readInsights(scope, range)).resolves.toEqual([
      {
        dateStart: "2026-08-01",
        dateStop: "2026-08-07",
        spend: 12.34,
        impressions: 1000,
        reach: 800,
        clicks: 25,
        ctr: 2.5,
        cpc: 0.4936,
        cpm: 12.34
      }
    ]);

    expect(seen?.pathname).toBe(`/v26.0/${scope.id}/insights`);
    expect(seen?.searchParams.get("fields")).toBe(
      "date_start,date_stop,spend,impressions,reach,clicks,ctr,cpc,cpm"
    );
    expect(seen?.searchParams.get("level")).toBe(scope.level);
    expect(seen?.searchParams.get("time_range")).toBe(
      JSON.stringify({ since: range.since, until: range.until })
    );
    expect(seen?.searchParams.get("limit")).toBe("500");
  });

  it("uses the shared paginator for insights pages", async () => {
    const service = createService((url) => {
      const second = url.searchParams.get("after") === "p2";
      const row = { ...metricRow, date_start: second ? "2026-08-02" : "2026-08-01" };
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [row],
            ...(second
              ? {}
              : {
                  paging: {
                    next: "https://graph.facebook.com/v26.0/act_1/insights?after=p2"
                  }
                })
          }),
          { status: 200 }
        )
      );
    });

    const rows = await service.readInsights({ level: "account", id: "act_1" }, range);
    expect(rows.map((row) => row.dateStart)).toEqual(["2026-08-01", "2026-08-02"]);
  });

  it("fails closed on malformed numeric metrics", async () => {
    const service = createService(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [{ ...metricRow, spend: "not-a-number" }] }), {
          status: 200
        })
      )
    );

    await expect(service.readInsights({ level: "account", id: "act_1" }, range)).rejects.toThrow();
  });

  it("fails closed on empty metric values under the existing parser policy", async () => {
    const service = createService(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [{ ...metricRow, clicks: "" }] }), { status: 200 })
      )
    );

    await expect(service.readInsights({ level: "account", id: "act_1" }, range)).rejects.toThrow();
  });

  it("rejects blank scope ids and malformed dates before making a request", async () => {
    let calls = 0;
    const service = createService(() => {
      calls += 1;
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    await expect(
      service.readInsights({ level: "account", id: "  " }, range)
    ).rejects.toThrow("id");
    await expect(
      service.readInsights(
        { level: "account", id: "act_1" },
        { since: "2026/08/01", until: "2026-08-07" }
      )
    ).rejects.toThrow("YYYY-MM-DD");
    await expect(
      service.readInsights(
        { level: "account", id: "act_1" },
        { since: "2026-08-01", until: "08-07-2026" }
      )
    ).rejects.toThrow("YYYY-MM-DD");

    expect(calls).toBe(0);
  });
});
