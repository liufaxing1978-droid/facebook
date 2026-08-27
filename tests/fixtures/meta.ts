import type { MetaAd, MetaAdAccount, MetaAdSet, MetaCampaign, MetaInsightRow } from "../../packages/meta/src/domain";

export const fakeAdAccounts: readonly MetaAdAccount[] = [
  {
    id: "act_1",
    name: "Primary Account",
    status: 1,
    currency: "USD",
    timezone: "America/Los_Angeles"
  }
];

export const fakeCampaignsByAdAccount: Readonly<Record<string, readonly MetaCampaign[]>> = {
  act_1: [
    {
      id: "cmp_1",
      name: "Traffic Campaign",
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      effectiveStatus: "PAUSED"
    }
  ]
};

export const fakeAdSetsByCampaign: Readonly<Record<string, readonly MetaAdSet[]>> = {
  cmp_1: [
    {
      id: "set_1",
      campaignId: "cmp_1",
      name: "Taiwan",
      status: "PAUSED",
      effectiveStatus: "PAUSED",
      dailyBudgetMinor: 1000
    }
  ]
};

export const fakeAdsByAdSet: Readonly<Record<string, readonly MetaAd[]>> = {
  set_1: [
    {
      id: "ad_1",
      adSetId: "set_1",
      name: "Creative A",
      status: "PAUSED",
      effectiveStatus: "PAUSED",
      creativeId: "creative_1"
    }
  ]
};

export const fakeInsightsByScope: Readonly<Record<string, readonly MetaInsightRow[]>> = {
  "campaign:cmp_1": [
    {
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
    },
    {
      dateStart: "2026-08-27",
      dateStop: "2026-08-27",
      spend: 7.66,
      impressions: 600,
      clicks: 18,
      ctr: 3,
      cpc: 0.4256,
      cpm: 12.7667
    }
  ]
};

export const fakeMetaFixtures = {
  adAccounts: fakeAdAccounts,
  campaignsByAdAccount: fakeCampaignsByAdAccount,
  adSetsByCampaign: fakeAdSetsByCampaign,
  adsByAdSet: fakeAdsByAdSet,
  insightsByScope: fakeInsightsByScope
} as const;
