import type { MetaAd, MetaAdAccount, MetaAdSet, MetaCampaign, MetaInsightRow } from "./domain";
import type { MetaDateRange, MetaInsightScope, MetaReadService } from "./services";

export type FakeMetaFixtures = Readonly<{
  adAccounts: readonly MetaAdAccount[];
  campaignsByAdAccount: Readonly<Record<string, readonly MetaCampaign[]>>;
  adSetsByCampaign: Readonly<Record<string, readonly MetaAdSet[]>>;
  adsByAdSet: Readonly<Record<string, readonly MetaAd[]>>;
  insightsByScope: Readonly<Record<string, readonly MetaInsightRow[]>>;
}>;

export class FakeMetaService implements MetaReadService {
  constructor(private readonly fixtures: FakeMetaFixtures) {}

  listAdAccounts(): Promise<MetaAdAccount[]> {
    return Promise.resolve([...this.fixtures.adAccounts]);
  }

  listCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    return Promise.resolve([...(this.fixtures.campaignsByAdAccount[adAccountId] ?? [])]);
  }

  listAdSets(campaignId: string): Promise<MetaAdSet[]> {
    return Promise.resolve([...(this.fixtures.adSetsByCampaign[campaignId] ?? [])]);
  }

  listAds(adSetId: string): Promise<MetaAd[]> {
    return Promise.resolve([...(this.fixtures.adsByAdSet[adSetId] ?? [])]);
  }

  readInsights(scope: MetaInsightScope, range: MetaDateRange): Promise<MetaInsightRow[]> {
    const key = `${scope.level}:${scope.id}`;
    const rows = (this.fixtures.insightsByScope[key] ?? []).filter(
      (row) => row.dateStart >= range.since && row.dateStop <= range.until
    );
    return Promise.resolve([...rows]);
  }
}
