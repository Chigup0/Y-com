// Thin client for Crustdata's Company Enrich API (x-api-version 2025-11-01).
// Docs: https://docs.crustdata.com/company-docs/enrichment/reference.md

const BASE_URL = "https://api.crustdata.com";

export const ENRICH_FIELDS = [
  "basic_info",
  "headcount",
  "funding",
  "locations",
  "taxonomy",
  "revenue",
  "hiring",
  "followers",
  "social_profiles",
  "web_traffic",
];

export type IdentifierKind = "domains" | "names" | "professional_network_profile_urls";

export function detectIdentifier(raw: string): { kind: IdentifierKind; value: string } {
  const input = raw.trim();
  if (/linkedin\.com\/company\//i.test(input)) {
    return { kind: "professional_network_profile_urls", value: input };
  }
  // Looks like a domain or URL: no spaces and has a dot.
  if (!/\s/.test(input) && /\.[a-z]{2,}/i.test(input)) {
    const domain = input
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
    return { kind: "domains", value: domain };
  }
  return { kind: "names", value: input };
}

export type CompanyData = Record<string, any>;

export interface EnrichResult {
  matched: boolean;
  confidence: number | null;
  company: CompanyData | null;
  raw: unknown;
}

export class CrustdataError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function enrichCompany(input: string): Promise<EnrichResult> {
  const apiKey = process.env.CRUSTDATA_API_KEY;
  if (!apiKey) throw new CrustdataError("CRUSTDATA_API_KEY is not set in .env.local", 500);

  const { kind, value } = detectIdentifier(input);
  const res = await fetch(`${BASE_URL}/company/enrich`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "x-api-version": "2025-11-01",
    },
    body: JSON.stringify({ [kind]: [value], fields: ENRICH_FIELDS }),
    cache: "no-store",
  });

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    throw new CrustdataError(`Crustdata ${res.status}: ${msg.slice(0, 300)}`, res.status);
  }

  // Response is an array of { matched_on, match_type, matches: [{ confidence_score, company_data }] }.
  const first = Array.isArray(body) ? body[0] : body;
  const match = first?.matches?.[0];
  return {
    matched: Boolean(match?.company_data),
    confidence: typeof match?.confidence_score === "number" ? match.confidence_score : null,
    company: match?.company_data ?? null,
    raw: body,
  };
}
