import { describe, expect, it } from "vitest";
import { MetaClient } from "./client";
import { GraphMetaReadService } from "./graph-read-service";

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

const ok = (data: unknown) =>
  Promise.resolve(new Response(JSON.stringify({ data }), { status: 200 }));

describe("GraphMetaReadService hierarchy", () => {
  it("reads campaigns with exact path and fields", async () => {
    let seen: URL | undefined;
    const service = createService((url) => {
      seen = url;
      return ok([
        {
          id: "cmp_1",
          name: "Campaign 1",
          objective: "OUTCOME_TRAFFIC",
          status: "PAUSED",
          effective_status: "PAUSED",
          future_field: true
        }
      ]);
    });

    await expect(service.listCampaigns("act_1")).resolves.toEqual([
      {
        id: "cmp_1",
        name: "Campaign 1",
        objective: "OUTCOME_TRAFFIC",
        status: "PAUSED",
        effectiveStatus: "PAUSED"
      }
    ]);
    expect(seen?.pathname).toBe("/v26.0/act_1/campaigns");
    expect(seen?.searchParams.get("fields")).toBe(
      "id,name,objective,status,effective_status"
    );
  });

  it("reads ad sets with exact path and fields", async () => {
    let seen: URL | undefined;
    const service = createService((url) => {
      seen = url;
      return ok([
        {
          id: "as_1",
          campaign_id: "cmp_1",
          name: "Ad Set 1",
          status: "PAUSED",
          effective_status: "PAUSED"
        }
      ]);
    });

    await expect(service.listAdSets("cmp_1")).resolves.toEqual([
      {
        id: "as_1",
        campaignId: "cmp_1",
        name: "Ad Set 1",
        status: "PAUSED",
        effectiveStatus: "PAUSED"
      }
    ]);
    expect(seen?.pathname).toBe("/v26.0/cmp_1/adsets");
    expect(seen?.searchParams.get("fields")).toBe(
      "id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget"
    );
  });

  it("reads ads with exact path and fields", async () => {
    let seen: URL | undefined;
    const service = createService((url) => {
      seen = url;
      return ok([
        {
          id: "ad_1",
          adset_id: "as_1",
          name: "Ad 1",
          status: "PAUSED",
          effective_status: "PAUSED"
        }
      ]);
    });

    await expect(service.listAds("as_1")).resolves.toEqual([
      {
        id: "ad_1",
        adSetId: "as_1",
        name: "Ad 1",
        status: "PAUSED",
        effectiveStatus: "PAUSED"
      }
    ]);
    expect(seen?.pathname).toBe("/v26.0/as_1/ads");
    expect(seen?.searchParams.get("fields")).toBe(
      "id,adset_id,name,status,effective_status,creative{id}"
    );
  });

  it("uses the shared paginator for campaign pages", async () => {
    const service = createService((url) => {
      const id = url.searchParams.get("after") === "p2" ? "cmp_2" : "cmp_1";
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id,
                name: id,
                objective: "OUTCOME_TRAFFIC",
                status: "PAUSED",
                effective_status: "PAUSED"
              }
            ],
            ...(id === "cmp_1"
              ? { paging: { next: "https://graph.facebook.com/v26.0/act_1/campaigns?after=p2" } }
              : {})
          }),
          { status: 200 }
        )
      );
    });

    const result = await service.listCampaigns("act_1");
    expect(result.map((item) => item.id)).toEqual(["cmp_1", "cmp_2"]);
  });

  it("fails closed on blank parent ids before making a request", async () => {
    let calls = 0;
    const service = createService(() => {
      calls += 1;
      return ok([]);
    });

    await expect(service.listCampaigns("  ")).rejects.toThrow("id");
    await expect(service.listAdSets("")).rejects.toThrow("id");
    await expect(service.listAds("   ")).rejects.toThrow("id");
    expect(calls).toBe(0);
  });

  it("fails closed when a hierarchy item omits its required id", async () => {
    const service = createService(() =>
      ok([{ name: "Broken", objective: "OUTCOME_TRAFFIC", status: "PAUSED", effective_status: "PAUSED" }])
    );

    await expect(service.listCampaigns("act_1")).rejects.toThrow();
  });
});
