// Shared contract between Agent A (data/pipeline) and Agent B (intel/UI).
// ADDITIVE CHANGES ONLY: add optional fields or new types; never rename or remove.

/** Crustdata endpoints we call, used to label steps in the live agent log. */
export type CrustdataApi =
  | "company.autocomplete"
  | "company.identify"
  | "company.enrich"
  | "company.search"
  | "job.search"
  | "person.search"
  | "person.autocomplete"
  | "person.enrich"
  | "web.search"
  | "web.fetch"
  | "account.credits"
  | "claude"
  /** Rules-based intel (no LLM), used when ANTHROPIC_API_KEY is unset. */
  | "rules";

// ---------- Input ----------

export interface SpyRequest {
  /** Your company: name, domain, or LinkedIn company URL. */
  you: string;
  /** 1–3 competitors: name, domain, or LinkedIn company URL. */
  competitors: string[];
  /** Window for "recent" jobs and hires. Default 90. */
  lookbackDays?: number;
}

// ---------- Entities ----------

export interface CompanyRef {
  crustdataCompanyId: number;
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  logoUrl?: string | null;
  description?: string | null;
  headcount?: number | null;
  headcountGrowthYoY?: number | null;
  industries?: string[];
  hq?: string | null;
  totalFundingUsd?: number | null;
  /** Competitor names/websites from Company Enrichment; used to suggest rivals. */
  knownCompetitors?: string[];
}

export interface Bucket {
  key: string;
  count: number;
}

export interface JobPosting {
  id: number; // crustdata_job_id
  title: string;
  category: string | null; // Engineering, Sales, Operations, ...
  location: string | null; // location.raw
  country: string | null;
  workplaceType: string | null;
  postedAt: string; // ISO date
  url: string | null;
  /** First ~400 chars of content.description. */
  descriptionSnippet: string | null;
}

export interface HiringStats {
  totalOpenings: number; // total_count for the lookback window
  byCategory: Bucket[];
  byCountry: Bucket[];
  topTitles: Bucket[];
}

export interface Hire {
  personId: number; // crustdata_person_id
  name: string;
  title: string | null;
  startDate: string | null; // ISO date at the competitor
  location: string | null;
  seniority: string | null;
  function: string | null;
  profileUrl: string | null;
  headline: string | null;
  skills: string[];
  /** Previous employers, most recent first. */
  previousCompanies: string[];
  /** True if Person Enrichment was run on this person. */
  enriched: boolean;
}

export interface NewsItem {
  title: string;
  url: string;
  snippet: string | null;
  source: "web" | "news" | "social";
  publishedAt?: string | null;
  /** Readable text of the article (Web Fetch), up to ~2,500 chars. Only on the top item(s). */
  excerpt?: string | null;
}

export interface CompetitorDossier {
  company: CompanyRef;
  jobs: JobPosting[];
  hiring: HiringStats;
  recentHires: Hire[];
  news: NewsItem[];
  creditsUsed: number;
  /** Competitor's customers to pitch (filled after the dossier; also sent as a `targets` event). */
  targets?: TargetAccount[];
}

// ---------- Intelligence (Agent B produces these) ----------

export interface Evidence {
  kind: "job" | "hire" | "news";
  /** job id, person id, or URL, must exist in the dossier. */
  ref: string;
  /** Short human-readable quote, e.g. "Senior Rust Engineer, Cryptography · Dubai · Oct 12". */
  text: string;
}

export interface LaunchPrediction {
  id: string; // stable slug, e.g. "cashfree-uae-remittance"
  competitorId: number;
  competitorName: string;
  /** Punchy, e.g. "Cross-border crypto remittance for the Middle East". */
  headline: string;
  /** 2–3 sentences: what they're building and why we think so. */
  summary: string;
  confidence: "low" | "medium" | "high";
  confidenceScore: number; // 0–100
  /** e.g. "Q2 2027" or "3–6 months". */
  expectedWindow: string;
  /** Product area tag, e.g. "Payments infra", "Lending", "Geo expansion". */
  area: string;
  evidence: Evidence[];
  /** Why this matters to `you`. */
  threatToYou: string;
}

/** Customer of a competitor that we found on the web (Agent B extracts, Agent A resolves). */
export interface CustomerMention {
  name: string;
  domain?: string | null;
  sourceUrl: string;
  /** Sentence from the page proving the relationship. */
  quote?: string | null;
}

export interface Buyer {
  personId: number;
  name: string;
  title: string | null;
  profileUrl: string | null;
}

export interface TargetAccount {
  company: CompanyRef;
  /** Which competitor they currently use. */
  competitorName: string;
  sourceUrl: string;
  whyNow: string;
  buyers: Buyer[];
  /** How we found them: their own job posts mention the competitor, or a web case study / customer page. */
  signal?: "job_mention" | "case_study";
  /** Verbatim sentence proving the relationship, e.g. "…integrate payment gateways such as Cashfree…". */
  quote?: string | null;
  /** Job posts (job_mention) or pages (case_study) backing this target. */
  mentions?: number;
}

export interface EmailDraft {
  predictionId: string;
  to: { name: string; title: string | null; company: string; profileUrl?: string | null };
  subject: string;
  body: string;
}

export interface CounterAttackPlan {
  predictionId: string;
  /** 3–5 concrete actions for `you`. */
  actions: string[];
  targets: TargetAccount[];
  emails: EmailDraft[];
}

// ---------- Output ----------

export interface SpyReport {
  request: SpyRequest;
  you: CompanyRef;
  competitors: CompetitorDossier[];
  predictions: LaunchPrediction[];
  plans: CounterAttackPlan[];
  generatedAt: string;
  creditsUsed: number;
  /** True when built from fixture data. The UI must show a "Demo data" badge. */
  mock: boolean;
  /** Who wrote predictions/plans: Claude (ANTHROPIC_API_KEY set) or the rules engine (no key). */
  engine?: "claude" | "rules";
}

// ---------- Streaming protocol: POST /api/spy → NDJSON, one RunEvent per line ----------

export type StepStatus = "running" | "done" | "error";

export type RunEvent =
  | {
      type: "step";
      id: string; // stable per step, e.g. "jobs:cashfree"; the same id is re-sent on status change
      label: string; // "Pulling 90 days of job postings for Cashfree"
      status: StepStatus;
      api?: CrustdataApi;
      detail?: string; // "142 postings · 38 in UAE"
      credits?: number;
    }
  | { type: "company"; role: "you" | "competitor"; company: CompanyRef }
  | { type: "dossier"; dossier: CompetitorDossier }
  | { type: "prediction"; prediction: LaunchPrediction }
  | { type: "targets"; competitorId: number; targets: TargetAccount[] }
  | { type: "plan"; plan: CounterAttackPlan }
  | { type: "done"; report: SpyReport }
  | { type: "error"; message: string };
