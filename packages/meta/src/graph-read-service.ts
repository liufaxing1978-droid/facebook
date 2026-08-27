import { MetaClient } from "./client";
import {
  parseMetaAd,
  parseMetaAdAccount,
  parseMetaAdSet,
  parseMetaCampaign,
  type MetaAd,
  type MetaAdAccount,
  type MetaAdSet,
  type MetaCampaign,
  type MetaInsightRow
} from "./domain";
import { MetaClientError } from "./errors";
import { assertPageAllowed, parseGraphCollection } from "./graph-envelope";
import type { MetaDateRange, MetaInsightScope, MetaReadService } from "./services";

export type GraphMetaReadServiceOptions = Readonly<{
  maxPages?: number;
}>;

export class GraphMetaReadService implements MetaReadService {
  private readonly maxPages: number;

  constructor(
    private readonly client: MetaClient,
    options: GraphMetaReadServiceOptions = {}
  ) {
    this.maxPages = options.maxPages ?? 100;
    if (!Number.isInteger(this.maxPages) || this.maxPages < 1) {
      throw new MetaClientError("META_API_ERROR", "Meta Graph maxPages must be a positive integer");
    }
  }

  listAdAccounts(): Promise<MetaAdAccount[]> {
    return this.readCollection(
      "me/adaccounts",
      { fields: "id,name,account_status,currency,timezone_name" },
      parseMetaAdAccount
    );
  }

  listCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const id = this.requireParentId(adAccountId, "Ad Account");
    return this.readCollection(
      `${id}/campaigns`,
      { fields: "id,name,objective,status,effective_status" },
      parseMetaCampaign
    );
  }

  listAdSets(campaignId: string): Promise<MetaAdSet[]> {
    const id = this.requireParentId(campaignId, "Campaign");
    return this.readCollection(
      `${id}/adsets`,
      { fields: "id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget" },
      parseMetaAdSet
    );
  }

  listAds(adSetId: string): Promise<MetaAd[]> {
    const id = this.requireParentId(adSetId, "Ad Set");
    return this.readCollection(
      `${id}/ads`,
      { fields: "id,adset_id,name,status,effective_status,creative{id}" },
      parseMetaAd
    );
  }

  readInsights(scope: MetaInsightScope, range: MetaDateRange): Promise<MetaInsightRow[]> {
    void scope;
    void range;
    return Promise.reject(
      new MetaClientError("META_API_ERROR", "Insight reads are not available in P1 Task 3")
    );
  }

  private requireParentId(value: string, label: string): string {
    const id = value.trim();
    if (id.length === 0) {
      throw new MetaClientError("META_API_ERROR", `${label} id must be non-empty`);
    }
    return id;
  }

  private async readCollection<T>(
    path: string,
    query: Readonly<Record<string, string>>,
    itemParser: (input: unknown) => T
  ): Promise<T[]> {
    const result: T[] = [];
    const seen = new Set<string>();
    let pageNumber = 1;
    let payload = await this.client.request<unknown>(path, { method: "GET", query });

    while (true) {
      const page = parseGraphCollection(payload, itemParser);
      result.push(...page.items);

      if (page.next === undefined) {
        return result;
      }

      assertPageAllowed(page.next, seen, pageNumber + 1, this.maxPages);
      seen.add(page.next.toString());
      payload = await this.client.requestUrl<unknown>(page.next);
      pageNumber += 1;
    }
  }
}
