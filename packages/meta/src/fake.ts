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

  async listAdAccounts(): Promise<MetaAdAccount[]> {
    return [...this.fixtures.adAccounts];
  }

  async listCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    return [...(this.fixtures.campaignsByAdAccount[adAccountId] ?? [])];
  }

  async listAdSets(campaignId: string): Promise<MetaAdSet[]> {
    return [...(this.fixtures.adSetsByCampaign[campaignId] ?? [])];
  }

  async listAds(adSetId: string): Promise<MetaAd[]> {
    return [...(this.fixtures.adsByAdSet[adSetId] ?? [])];
  }

  async readInsights(scope: MetaInsightScope, range: MetaDateRange): Promise<MetaInsightRow[]> {
    const key = `${scope.level}:${scope.id}`;
    return (this.fixtures.insightsByScope[key] ?? []).filter(
      (row) => row.dateStart >= range.since && row.dateStop <= range.until
    );
  }
}
