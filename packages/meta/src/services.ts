import type { MetaAd, MetaAdAccount, MetaAdSet, MetaCampaign, MetaInsightRow } from "./domain";

export type MetaInsightScope = Readonly<{
  level: "account" | "campaign" | "adset" | "ad";
  id: string;
}>;

export type MetaDateRange = Readonly<{
  since: string;
  until: string;
}>;

export interface MetaReadService {
  listAdAccounts(): Promise<MetaAdAccount[]>;
  listCampaigns(adAccountId: string): Promise<MetaCampaign[]>;
  listAdSets(campaignId: string): Promise<MetaAdSet[]>;
  listAds(adSetId: string): Promise<MetaAd[]>;
  readInsights(scope: MetaInsightScope, range: MetaDateRange): Promise<MetaInsightRow[]>;
}
