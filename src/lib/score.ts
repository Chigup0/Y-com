// Rule-based shell-company risk scoring over Crustdata company_data.
// Field paths are read defensively because sections can be missing per company.
import type { CompanyData } from "./crustdata";

export type Severity = "high" | "medium" | "low";

export interface Signal {
  id: string;
  label: string;
  flagged: boolean;
  points: number; // points added when flagged
  severity: Severity;
  detail: string;
}

export interface Facts {
  name: string | null;
  domain: string | null;
  description: string | null;
  linkedinUrl: string | null;
  yearFounded: number | null;
  headcount: number | null;
  headcountYoY: number | null;
  employeeRange: string | null;
  monthlyVisitors: number | null;
  openings: number | null;
  followers: number | null;
  fundingUsd: number | null;
  lastRound: string | null;
  investors: number;
  hq: string | null;
  country: string | null;
  industry: string | null;
  twitter: string | null;
  crunchbase: string | null;
  revenueUpperUsd: number | null;
  status: string | null;
}

export interface ScoreResult {
  score: number; // 0-100
  band: "Low" | "Elevated" | "High";
  signals: Signal[];
  facts: Facts;
}

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// Recursively find the first numeric value whose key matches the pattern.
function findNumber(obj: unknown, key: RegExp, depth = 0): number | null {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (key.test(k)) {
      const n = num(v);
      if (n !== null) return n;
    }
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const n = findNumber(v, key, depth + 1);
    if (n !== null) return n;
  }
  return null;
}

// Jurisdictions commonly used for opaque holding / shell entities.
const SECRECY_JURISDICTIONS = [
  "british virgin islands", "virgin islands, british", "bvi", "cayman", "panama", "seychelles",
  "belize", "marshall islands", "bermuda", "bahamas", "anguilla", "samoa", "vanuatu",
  "nevis", "st kitts", "saint kitts", "isle of man", "jersey", "guernsey", "liechtenstein",
  "labuan", "mauritius", "gibraltar", "cook islands", "turks and caicos",
];

export function extractFacts(c: CompanyData): Facts {
  const b = c.basic_info ?? {};
  const h = c.headcount ?? {};
  const f = c.funding ?? {};
  const loc = c.locations ?? {};
  const soc = c.social_profiles ?? {};
  const rev = c.revenue ?? {};
  const hq = loc.headquarters;
  return {
    name: str(b.name),
    domain: str(b.primary_domain) ?? str(b.website),
    description: str(b.description),
    linkedinUrl: str(b.professional_network_url) ?? str(soc.professional_network),
    yearFounded: num(b.year_founded),
    headcount: num(h.total) ?? num(h.headcount),
    headcountYoY: num(h.growth_percent?.yoy),
    employeeRange: str(b.employee_count_range),
    monthlyVisitors: findNumber(c.web_traffic, /monthly_visitors|visits|visitors/i),
    openings: num(c.hiring?.openings_count),
    followers: num(c.followers?.count),
    fundingUsd: num(f.total_investment_usd),
    lastRound: str(f.last_round_type),
    investors: Array.isArray(f.investors) ? f.investors.length : 0,
    hq: typeof hq === "string" ? hq : hq ? JSON.stringify(hq) : null,
    country: str(loc.country),
    industry: str(c.taxonomy?.professional_network_industry),
    twitter: str(soc.twitter_url),
    crunchbase: str(soc.crunchbase?.url),
    revenueUpperUsd: num(rev.estimated?.upper_bound_usd),
    status: str(b.status),
  };
}

const fmtUsd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`;

export function scoreCompany(company: CompanyData | null): ScoreResult {
  if (!company) {
    return {
      score: 80,
      band: "High",
      facts: extractFacts({}),
      signals: [
        {
          id: "no_footprint",
          label: "No public company footprint",
          flagged: true,
          points: 80,
          severity: "high",
          detail: "Crustdata could not match this company to any known record.",
        },
      ],
    };
  }

  const x = extractFacts(company);
  const year = new Date().getFullYear();
  const age = x.yearFounded ? year - x.yearFounded : null;
  const hc = x.headcount;
  const loc = `${x.hq ?? ""} ${x.country ?? ""}`.toLowerCase();
  const offshore = SECRECY_JURISDICTIONS.find((j) => loc.includes(j));
  const revenueLarge = (x.revenueUpperUsd ?? 0) >= 10_000_000;

  const signals: Signal[] = [
    {
      id: "ghost_headcount",
      label: "Ghost headcount",
      flagged: hc === null || hc <= 2,
      points: hc === null ? 15 : 25,
      severity: "high",
      detail: hc === null ? "No employee data at all." : `Only ${hc} employee profile(s) linked to the company.`,
    },
    {
      id: "tiny_team",
      label: "Very small team",
      flagged: hc !== null && hc > 2 && hc <= 10,
      points: 8,
      severity: "low",
      detail: `${hc} employees.`,
    },
    {
      id: "money_no_people",
      label: "Money without people",
      flagged: (x.fundingUsd ?? 0) >= 5_000_000 && (hc ?? 0) < 10,
      points: 20,
      severity: "high",
      detail: `Reports ${x.fundingUsd ? fmtUsd(x.fundingUsd) : "large"} raised but only ${hc ?? 0} employees.`,
    },
    {
      id: "revenue_no_people",
      label: "Revenue without people",
      flagged: revenueLarge && (hc ?? 0) < 10,
      points: 12,
      severity: "medium",
      detail: `Estimated revenue up to ${x.revenueUpperUsd ? fmtUsd(x.revenueUpperUsd) : "?"} with ${hc ?? 0} staff.`,
    },
    {
      id: "offshore",
      label: "Secrecy jurisdiction",
      flagged: Boolean(offshore),
      points: 18,
      severity: "high",
      detail: `Headquartered in a known secrecy jurisdiction (${offshore}).`,
    },
    {
      id: "no_web_traffic",
      label: "No real web traffic",
      flagged: x.monthlyVisitors === null || x.monthlyVisitors < 500,
      points: x.monthlyVisitors === null ? 8 : 12,
      severity: "medium",
      detail:
        x.monthlyVisitors === null
          ? "No web traffic data found."
          : `About ${Math.round(x.monthlyVisitors)} monthly visitors.`,
    },
    {
      id: "brand_new",
      label: "Recently incorporated",
      flagged: age !== null && age <= 2,
      points: 10,
      severity: "medium",
      detail: `Founded in ${x.yearFounded}.`,
    },
    {
      id: "no_founding_date",
      label: "No founding date",
      flagged: age === null,
      points: 5,
      severity: "low",
      detail: "Founding year is not public.",
    },
    {
      id: "no_social",
      label: "Thin social presence",
      flagged: (x.followers ?? 0) < 100 && !x.twitter,
      points: 8,
      severity: "low",
      detail: `${x.followers ?? 0} LinkedIn followers and no Twitter/X account.`,
    },
    {
      id: "dormant",
      label: "Dormant: no hiring, no growth",
      flagged: (x.openings ?? 0) === 0 && (x.headcountYoY ?? 0) <= 0,
      points: 6,
      severity: "low",
      detail: "No open roles and flat or shrinking headcount over the past year.",
    },
    {
      id: "no_description",
      label: "No business description",
      flagged: !x.description || x.description.length < 40,
      points: 6,
      severity: "low",
      detail: "Company does not describe what it does.",
    },
  ];

  const score = Math.min(100, signals.reduce((s, sig) => s + (sig.flagged ? sig.points : 0), 0));
  const band = score >= 50 ? "High" : score >= 25 ? "Elevated" : "Low";
  return { score, band, signals, facts: x };
}
