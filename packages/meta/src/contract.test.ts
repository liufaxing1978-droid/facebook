import { describe, expect, it } from "vitest";
import { fakeMetaFixtures } from "../../../tests/fixtures/meta";
import { FakeMetaService } from "./fake";
import type { MetaReadService } from "./services";

type ServiceFactory = () => MetaReadService;

export function defineMetaReadServiceContract(name: string, createService: ServiceFactory) {
  describe(`${name} MetaReadService contract`, () => {
    it("lists ad accounts deterministically", async () => {
      const service = createService();
      await expect(service.listAdAccounts()).resolves.toEqual(fakeMetaFixtures.adAccounts);
    });

    it("preserves the account -> campaign -> ad set -> ad hierarchy", async () => {
      const service = createService();

      const campaigns = await service.listCampaigns("act_1");
      expect(campaigns).toHaveLength(1);
      expect(campaigns[0]?.id).toBe("cmp_1");

      const adSets = await service.listAdSets("cmp_1");
      expect(adSets).toHaveLength(1);
      expect(adSets[0]).toMatchObject({ id: "set_1", campaignId: "cmp_1" });

      const ads = await service.listAds("set_1");
      expect(ads).toHaveLength(1);
      expect(ads[0]).toMatchObject({ id: "ad_1", adSetId: "set_1" });
    });

    it("returns empty lists for unknown parent IDs", async () => {
      const service = createService();
      await expect(service.listCampaigns("act_missing")).resolves.toEqual([]);
      await expect(service.listAdSets("cmp_missing")).resolves.toEqual([]);
      await expect(service.listAds("set_missing")).resolves.toEqual([]);
    });

    it("reads insight rows for a scope and date range", async () => {
      const service = createService();
      const rows = await service.readInsights(
        { level: "campaign", id: "cmp_1" },
        { since: "2026-08-27", until: "2026-08-27" }
      );

      expect(rows).toEqual([fakeMetaFixtures.insightsByScope["campaign:cmp_1"]?.[1]]);
    });
  });
}

defineMetaReadServiceContract("FakeMetaService", () => new FakeMetaService(fakeMetaFixtures));
