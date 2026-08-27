import { describe, expect, it } from "vitest";
import {
  parseMetaAd,
  parseMetaAdAccount,
  parseMetaAdSet,
  parseMetaCampaign,
  parseMetaInsightRow
} from "./domain";

describe("Meta domain parsers", () => {
  it("maps an ad account and ignores unknown API fields", () => {
    expect(
      parseMetaAdAccount({
        id: "act_123",
        name: "Primary",
        account_status: 1,
        currency: "USD",
        timezone_name: "America/Los_Angeles",
        future_field: "safe-to-ignore"
      })
    ).toEqual({
      id: "act_123",
      name: "Primary",
      status: 1,
      currency: "USD",
      timezone: "America/Los_Angeles"
    });
  });

  it("maps campaign, ad set, and ad relationships", () => {
    expect(
      parseMetaCampaign({
        id: "cmp_1",
        name: "Campaign",
        objective: "OUTCOME_TRAFFIC",
        status: "PAUSED",
        effective_status: "PAUSED"
      })
    ).toMatchObject({ id: "cmp_1", objective: "OUTCOME_TRAFFIC" });

    expect(
      parseMetaAdSet({
        id: "set_1",
        campaign_id: "cmp_1",
        name: "Taiwan",
        status: "PAUSED",
        effective_status: "PAUSED",
        daily_budget: "1000"
      })
    ).toMatchObject({ id: "set_1", campaignId: "cmp_1", dailyBudgetMinor: 1000 });

    expect(
      parseMetaAd({
        id: "ad_1",
        adset_id: "set_1",
        name: "Creative A",
        status: "PAUSED",
        effective_status: "PAUSED",
        creative: { id: "creative_1" }
      })
    ).toMatchObject({ id: "ad_1", adSetId: "set_1", creativeId: "creative_1" });
  });

  it("converts string insight metrics into numeric internal values", () => {
    expect(
      parseMetaInsightRow({
        date_start: "2026-08-26",
        date_stop: "2026-08-26",
        spend: "12.34",
        impressions: "1000",
        clicks: "42",
        ctr: "4.2",
        cpc: "0.2938",
        cpm: "12.34",
        reach: "880",
        frequency: "1.13636"
      })
    ).toEqual({
      dateStart: "2026-08-26",
      dateStop: "2026-08-26",
      spend: 12.34,
      impressions: 1000,
      clicks: 42,
      ctr: 4.2,
      cpc: 0.2938,
      cpm: 12.34,
      reach: 880,
      frequency: 1.13636
    });
  });
});
