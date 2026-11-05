// OWNER: Agent A. Step 6: find a competitor's customers and the buyer to email at each.
//
// Two discovery signals:
//  1. job_mention: companies whose OWN job posts name the competitor ("integrate payment gateways such as
//     Cashfree"). Job Search, exact-phrase match on the description. Cheap and Crustdata-native.
//  2. case_study: competitor's customer pages / case studies (Web Search + Web Fetch), names extracted by
//     Agent B's `extractCustomers`, then resolved with Company Identify.
// Then: Company Search for size/industry, People Search for a buyer at each target.
import { and, cond, crustdata, daysAgo, htmlToText, type CreditMeter } from "@/lib/crustdata/client";
import { extractCustomers } from "@/lib/intel";
import type { Buyer, CompanyRef, TargetAccount } from "@/lib/types";

/** Industries that are rivals or intermediaries rather than customers. */
const EXCLUDE_INDUSTRY = /(financial services|banking|payments?|fintech|staffing|recruit|human resources|outsourcing)/i;
/** Company descriptions that mark a payments provider (rival or the competitor's own subsidiary), not a customer. */
const PAYMENTS_CO = /(payments? (gateway|service provider|institution|processor|processing|platform|infrastructure|solutions?|company|provider)|\bpsp\b|acquir(er|ing)|fintech|financial technology)/i;
const JUNIOR =/(intern|trainee|associate|analyst|assistant|executive|student|apprentice)/i;
const BUYER_TITLES = ["Founder", "CEO", "CFO", "CTO", "Finance", "Payments", "Head of Product", "VP Engineering"];

const cleanDomain = (d: unknown) =>
  typeof d === "string" ? d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : null;

/** Words near the mention that mean "we use it as our payments/infra vendor". */
const USAGE_CONTEXT = /(gateway|integrat|settlement|reconcil|checkout|payout|api|sdk|webhook|payment|collections?|subscription|vendor|stack|tools?)/i;
/** Words that mean "we want people who worked there" (talent, not customer). */
const TALENT_CONTEXT = /(background|experience (at|with companies)|worked at|ex-|alumni|companies like|candidates? from|profile)/i;

/**
 * Quote around a case-sensitive, whole-word mention of `brand` that reads like vendor usage.
 * Returns null for false positives such as "cashFree" in "pay you cash Free" or talent wish-lists.
 */
function usageQuote(text: string | undefined, brand: string, span = 140): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ");
  // Case-sensitive on purpose ("cashFree" in "pay you cash Free" is not Cashfree), but accept the ALL-CAPS form too.
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(?:${esc(brand)}|${esc(brand.toUpperCase())})\\b`, "g");
  for (const m of flat.matchAll(re)) {
    const i = m.index ?? 0;
    const near = flat.slice(Math.max(0, i - 150), i + brand.length + 150);
    if (!USAGE_CONTEXT.test(near) || TALENT_CONTEXT.test(near)) continue;
    const start = Math.max(0, flat.lastIndexOf(" ", Math.max(0, i - span)));
    return (start > 0 ? "…" : "") + flat.slice(start, i + brand.length + span).trim() + "…";
  }
  return null;
}

/** Shortest distinctive form of the competitor's name: "Cashfree Payments" → "Cashfree". */
function brand(company: CompanyRef) {
  const fromDomain = company.domain?.split(".")[0];
  const first = company.name.split(/\s+/)[0];
  const b = first.length >= 4 ? first : fromDomain ?? company.name;
  // "JUSPAY" → "Juspay": job posts use title case; short acronyms (e.g. "PayU", "CRED") are kept as-is.
  return b.length > 4 && b === b.toUpperCase() ? b[0] + b.slice(1).toLowerCase() : b;
}

interface Candidate {
  id: number;
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  mentions: number;
  quote: string | null;
  sourceUrl: string;
  signal: "job_mention" | "case_study";
}

async function fromJobMentions(competitor: CompanyRef, exclude: Set<string>, meter: CreditMeter): Promise<Candidate[]> {
  const name = brand(competitor);
  const { data } = await crustdata<any>(
    "/job/search",
    {
      filters: and(
        cond("content.description", "[.]", name),
        cond("metadata.date_added", "=>", daysAgo(365)),
        cond("company.basic_info.company_id", "!=", competitor.crustdataCompanyId),
      ),
      sorts: [{ field: "metadata.date_added", order: "desc" }],
      limit: 80,
      fields: ["job_details.title", "job_details.url", "company.basic_info", "content.description"],
    },
    { meter },
  );

  const byCompany = new Map<number, Candidate>();
  for (const j of data.job_listings ?? []) {
    const b = j.company?.basic_info ?? {};
    const id = Number(b.crustdata_company_id ?? b.company_id);
    const domain = cleanDomain(b.primary_domain);
    const industries: string[] = Array.isArray(b.industries) ? b.industries : [];
    if (!id || !b.name) continue;
    if (domain && exclude.has(domain)) continue;
    if (b.name.toLowerCase().includes(name.toLowerCase())) continue; // competitor's own entities
    if (industries.some((i) => EXCLUDE_INDUSTRY.test(i))) continue;
    const quote = usageQuote(j.content?.description, name);
    if (!quote) continue; // no mention that reads like vendor usage: skip
    const prev = byCompany.get(id);
    if (prev) prev.mentions++;
    else
      byCompany.set(id, {
        id,
        name: b.name,
        domain,
        linkedinUrl: b.professional_network_url ?? null,
        mentions: 1,
        quote,
        sourceUrl: j.job_details?.url ?? `https://${domain ?? ""}`,
        signal: "job_mention",
      });
  }
  return [...byCompany.values()].sort((a, b) => b.mentions - a.mentions);
}

async function fromCaseStudies(competitor: CompanyRef, exclude: Set<string>, meter: CreditMeter): Promise<Candidate[]> {
  const name = brand(competitor);
  const queries = [
    `"${name}" customer case study`,
    competitor.domain ? `site:${competitor.domain} customers OR case-study OR success-stories` : `"${name}" customers`,
  ];
  const results = (
    await Promise.all(queries.map((query) => crustdata<any>("/web/search/live", { query, sources: ["web"] }, { meter }).then((r) => r.data.results ?? []).catch(() => [])))
  ).flat();
  const urls = [...new Set(results.map((r: any) => r.url).filter((u: unknown): u is string => typeof u === "string"))]
    .filter((u) => /case|customer|success|stor(y|ies)/i.test(u))
    .slice(0, 4);
  if (!urls.length) return [];

  const { data: pages } = await crustdata<any[]>("/web/enrich/live", { urls }, { meter });
  const texts = (pages ?? [])
    .filter((p) => p.success && p.content)
    .map((p) => ({ url: p.url as string, title: (p.title as string) ?? null, text: htmlToText(p.content, 8000) }));
  if (!texts.length) return [];

  const mentions = await extractCustomers(competitor, texts);
  const out: Candidate[] = [];
  for (const m of mentions.slice(0, 8)) {
    const ident = m.domain ? { domains: [cleanDomain(m.domain)] } : { names: [m.name] };
    const { data } = await crustdata<any[]>("/company/identify", ident, { meter }).catch(() => ({ data: [] as any[] }));
    const c = data?.[0]?.matches?.[0]?.company_data;
    if (!c?.crustdata_company_id) continue;
    const domain = cleanDomain(c.basic_info?.primary_domain);
    if (domain && exclude.has(domain)) continue;
    out.push({
      id: c.crustdata_company_id,
      name: c.basic_info?.name ?? m.name,
      domain,
      linkedinUrl: c.basic_info?.professional_network_url ?? null,
      mentions: 1,
      quote: m.quote ?? null,
      sourceUrl: m.sourceUrl,
      signal: "case_study",
    });
  }
  return out;
}

/** Company Search by id: headcount + HQ for ranking and display. */
async function describe(cands: Candidate[], meter: CreditMeter): Promise<Map<number, Partial<CompanyRef>>> {
  const out = new Map<number, Partial<CompanyRef>>();
  if (!cands.length) return out;
  try {
    const { data } = await crustdata<any>(
      "/company/search",
      { filters: cond("crustdata_company_id", "in", cands.map((c) => c.id)), limit: cands.length, fields: ["crustdata_company_id", "basic_info", "headcount", "locations"] },
      { meter },
    );
    for (const c of data.companies ?? []) {
      out.set(c.crustdata_company_id, {
        headcount: c.headcount?.total ?? null,
        description: c.basic_info?.description ?? null,
        logoUrl: c.basic_info?.logo_permalink ?? null,
        hq: [c.locations?.city, c.locations?.country].filter(Boolean).join(", ") || null,
      });
    }
  } catch {
    /* ranking info is optional */
  }
  return out;
}

/** People Search: up to 2 decision makers at a target. */
async function findBuyers(companyId: number, meter: CreditMeter): Promise<Buyer[]> {
  const { data } = await crustdata<any>(
    "/person/search",
    {
      filters: and(
        cond("experience.employment_details.current.company_id", "=", companyId),
        { op: "or", conditions: BUYER_TITLES.map((t) => cond("experience.employment_details.current.title", "[.]", t)) },
      ),
      limit: 5,
      fields: ["crustdata_person_id", "basic_profile", "social_handles"],
    },
    { meter },
  );
  return (data.profiles ?? [])
    .map((p: any) => ({
      personId: Number(p.crustdata_person_id),
      name: p.basic_profile?.name ?? "Unknown",
      title: p.basic_profile?.current_title ?? null,
      profileUrl: p.social_handles?.professional_network_identifier?.profile_url ?? null,
    }))
    .filter((b: Buyer) => !JUNIOR.test(b.title ?? ""))
    .slice(0, 2);
}

/**
 * Customers of `competitor` worth pitching, with buyers. `exclude` = domains of you + rivals.
 * Max `max` targets; job-post mentions first (they're verifiable), then case studies.
 */
export async function findTargets(
  you: CompanyRef,
  competitor: CompanyRef,
  exclude: Set<string>,
  meter: CreditMeter,
  max = 5,
): Promise<TargetAccount[]> {
  const [jobs, studies] = await Promise.all([
    fromJobMentions(competitor, exclude, meter),
    fromCaseStudies(competitor, exclude, meter).catch(() => [] as Candidate[]),
  ]);
  const seen = new Set<number>([you.crustdataCompanyId, competitor.crustdataCompanyId]);
  const picked: Candidate[] = [];
  for (const c of [...studies, ...jobs]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    picked.push(c);
  }
  // Interleave so both signals show up, then cap.
  const top = [...picked.filter((c) => c.signal === "case_study").slice(0, 2), ...picked.filter((c) => c.signal === "job_mention")].slice(0, max);

  // Describe a few extra so we can drop payment companies / subsidiaries (e.g. PayU's iyzico) and still fill `max`.
  const pool = picked.slice(0, max + 3).sort((a, b) => Number(b.signal === "case_study") - Number(a.signal === "case_study"));
  const info = await describe(pool, meter);
  const isPaymentsCo = (id: number) => PAYMENTS_CO.test(info.get(id)?.description ?? "");
  const kept = [...top, ...pool.filter((c) => !top.includes(c))].filter((c) => !isPaymentsCo(c.id)).slice(0, max);
  const buyers = await Promise.all(kept.map((c) => findBuyers(c.id, meter).catch(() => [] as Buyer[])));
  const name = brand(competitor);

  return kept.map((c, i) => ({
    company: {
      crustdataCompanyId: c.id,
      name: c.name,
      domain: c.domain,
      linkedinUrl: c.linkedinUrl,
      ...info.get(c.id),
    },
    competitorName: competitor.name,
    sourceUrl: c.sourceUrl,
    signal: c.signal,
    quote: c.quote,
    mentions: c.mentions,
    whyNow:
      c.signal === "job_mention"
        ? `Their own job post${c.mentions > 1 ? `s (${c.mentions})` : ""} name${c.mentions > 1 ? "" : "s"} ${name} in the stack.`
        : `Featured as a ${name} customer on the web.`,
    buyers: buyers[i],
  }));
}
