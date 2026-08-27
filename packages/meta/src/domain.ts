import { z } from "zod";

const nonEmptyString = z.string().min(1);
const numericString = z.string().regex(/^-?\d+(?:\.\d+)?$/);

const adAccountApiSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  account_status: z.number().int(),
  currency: nonEmptyString,
  timezone_name: nonEmptyString
});

const campaignApiSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  objective: nonEmptyString,
  status: nonEmptyString,
  effective_status: nonEmptyString
});

const adSetApiSchema = z.object({
  id: nonEmptyString,
  campaign_id: nonEmptyString,
  name: nonEmptyString,
  status: nonEmptyString,
  effective_status: nonEmptyString,
  daily_budget: numericString.optional(),
  lifetime_budget: numericString.optional()
});

const adApiSchema = z.object({
  id: nonEmptyString,
  adset_id: nonEmptyString,
  name: nonEmptyString,
  status: nonEmptyString,
  effective_status: nonEmptyString,
  creative: z.object({ id: nonEmptyString }).optional()
});

const insightApiSchema = z.object({
  date_start: nonEmptyString,
  date_stop: nonEmptyString,
  spend: numericString,
  impressions: numericString,
  clicks: numericString,
  ctr: numericString,
  cpc: numericString,
  cpm: numericString,
  reach: numericString.optional(),
  frequency: numericString.optional()
});

export type MetaAdAccount = Readonly<{
  id: string;
  name: string;
  status: number;
  currency: string;
  timezone: string;
}>;

export type MetaCampaign = Readonly<{
  id: string;
  name: string;
  objective: string;
  status: string;
  effectiveStatus: string;
}>;

export type MetaAdSet = Readonly<{
  id: string;
  campaignId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudgetMinor?: number;
  lifetimeBudgetMinor?: number;
}>;

export type MetaAd = Readonly<{
  id: string;
  adSetId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  creativeId?: string;
}>;

export type MetaInsightRow = Readonly<{
  dateStart: string;
  dateStop: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach?: number;
  frequency?: number;
}>;

export function parseMetaAdAccount(input: unknown): MetaAdAccount {
  const value = adAccountApiSchema.parse(input);
  return {
    id: value.id,
    name: value.name,
    status: value.account_status,
    currency: value.currency,
    timezone: value.timezone_name
  };
}

export function parseMetaCampaign(input: unknown): MetaCampaign {
  const value = campaignApiSchema.parse(input);
  return {
    id: value.id,
    name: value.name,
    objective: value.objective,
    status: value.status,
    effectiveStatus: value.effective_status
  };
}

export function parseMetaAdSet(input: unknown): MetaAdSet {
  const value = adSetApiSchema.parse(input);
  const result: {
    id: string;
    campaignId: string;
    name: string;
    status: string;
    effectiveStatus: string;
    dailyBudgetMinor?: number;
    lifetimeBudgetMinor?: number;
  } = {
    id: value.id,
    campaignId: value.campaign_id,
    name: value.name,
    status: value.status,
    effectiveStatus: value.effective_status
  };

  if (value.daily_budget !== undefined) {
    result.dailyBudgetMinor = Number(value.daily_budget);
  }
  if (value.lifetime_budget !== undefined) {
    result.lifetimeBudgetMinor = Number(value.lifetime_budget);
  }

  return result;
}

export function parseMetaAd(input: unknown): MetaAd {
  const value = adApiSchema.parse(input);
  const result: {
    id: string;
    adSetId: string;
    name: string;
    status: string;
    effectiveStatus: string;
    creativeId?: string;
  } = {
    id: value.id,
    adSetId: value.adset_id,
    name: value.name,
    status: value.status,
    effectiveStatus: value.effective_status
  };

  if (value.creative !== undefined) {
    result.creativeId = value.creative.id;
  }

  return result;
}

export function parseMetaInsightRow(input: unknown): MetaInsightRow {
  const value = insightApiSchema.parse(input);
  const result: {
    dateStart: string;
    dateStop: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    reach?: number;
    frequency?: number;
  } = {
    dateStart: value.date_start,
    dateStop: value.date_stop,
    spend: Number(value.spend),
    impressions: Number(value.impressions),
    clicks: Number(value.clicks),
    ctr: Number(value.ctr),
    cpc: Number(value.cpc),
    cpm: Number(value.cpm)
  };

  if (value.reach !== undefined) {
    result.reach = Number(value.reach);
  }
  if (value.frequency !== undefined) {
    result.frequency = Number(value.frequency);
  }

  return result;
}
