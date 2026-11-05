// OWNER: Agent A. Step 1: input string → CompanyRef (Company Identify + Company Enrichment).
import { crustdata, type CreditMeter } from "@/lib/crustdata/client";
import type { CompanyRef } from "@/lib/types";

type IdKind = "domains" | "names" | "professional_network_profile_urls";

export function detectIdentifier(raw: string): { kind: IdKind; value: string } {
  const input = raw.trim();
  if (/linkedin\.com\/company\//i.test(input)) return { kind: "professional_network_profile_urls", value: input };
  if (!/\s/.test(input) && /\.[a-z]{2,}/i.test(input)) {
    const domain = input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
    return { kind: "domains", value: domain };
  }
  return { kind: "names", value: input };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Company Identify (free) → best match id, then Company Enrichment (2 credits) for firmographics. */
export async function resolveCompany(input: string, meter: CreditMeter): Promise<CompanyRef> {
  const { kind, value } = detectIdentifier(input);
  const { data: ident } = await crustdata<any[]>("/company/identify", { [kind]: [value] }, { meter });
  const match = ident?.[0]?.matches?.[0]?.company_data;
  if (!match?.crustdata_company_id) throw new Error(`Couldn't find a company matching "${input}" in Crustdata.`);

  const id: number = match.crustdata_company_id;
  const b = match.basic_info ?? {};
  const ref: CompanyRef = {
    crustdataCompanyId: id,
    name: b.name ?? input,
    domain: b.primary_domain ?? null,
    linkedinUrl: b.professional_network_url ?? null,
    logoUrl: b.logo_permalink ?? null,
    description: b.description ?? null,
    industries: Array.isArray(b.industries) ? b.industries : undefined,
  };

  try {
    const { data } = await crustdata<any[]>(
      "/company/enrich",
      { crustdata_company_ids: [id], fields: ["basic_info", "headcount", "funding", "locations", "competitors"] },
      { meter },
    );
    const c = data?.[0]?.matches?.[0]?.company_data;
    if (c) {
      ref.headcount = num(c.headcount?.total) ?? ref.headcount ?? null;
      ref.headcountGrowthYoY = num(c.headcount?.growth_percent?.yoy);
      ref.totalFundingUsd = num(c.funding?.total_investment_usd);
      const hq = c.locations?.headquarters;
      ref.hq = typeof hq === "string" ? hq : [c.locations?.city, c.locations?.country].filter(Boolean).join(", ") || null;
      ref.description = ref.description || c.basic_info?.description || null;
      ref.logoUrl = ref.logoUrl || c.basic_info?.logo_permalink || null;
      // competitors = { paid_seo: [domains], organic_seo: [domains], all_domains: [noisy urls] }.
      // Paid-search overlap is the strongest signal of a direct rival, then organic.
      const comp = c.competitors ?? {};
      const domains = [...(comp.paid_seo ?? []), ...(comp.organic_seo ?? [])]
        .filter((d: unknown): d is string => typeof d === "string")
        .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
        .filter((d) => d && d !== ref.domain);
      if (domains.length) ref.knownCompetitors = [...new Set(domains)].slice(0, 8);
    }
  } catch {
    // Enrichment is a nice-to-have; identify alone is enough to continue.
  }
  return ref;
}

/** Company Autocomplete (free), for the input typeahead. */
export async function suggestCompanies(query: string): Promise<string[]> {
  const { data } = await crustdata<{ suggestions: { value: string }[] }>(
    "/company/search/autocomplete",
    { field: "basic_info.name", query, limit: 8 },
    { noCache: false },
  );
  return (data.suggestions ?? []).map((s) => s.value);
}
