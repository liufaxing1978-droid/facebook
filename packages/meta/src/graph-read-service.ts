import { MetaClient } from "./client";
import {
  parseMetaAdAccount,
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

  listCampaigns(_adAccountId: string): Promise<MetaCampaign[]> {
    return Promise.reject(
      new MetaClientError("META_API_ERROR", "Campaign reads are not available in P1 Task 3")
    );
  }

  listAdSets(_campaignId: string): Promise<MetaAdSet[]> {
    return Promise.reject(
      new MetaClientError("META_API_ERROR", "Ad Set reads are not available in P1 Task 3")
    );
  }

  listAds(_adSetId: string): Promise<MetaAd[]> {
    return Promise.reject(
      new MetaClientError("META_API_ERROR", "Ad reads are not available in P1 Task 3")
    );
  }

  readInsights(_scope: MetaInsightScope, _range: MetaDateRange): Promise<MetaInsightRow[]> {
    return Promise.reject(
      new MetaClientError("META_API_ERROR", "Insight reads are not available in P1 Task 3")
    );
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
