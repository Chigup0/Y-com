// OWNER: Agent B. Claude-powered intelligence.
// Signatures are the integration contract with Agent A's route. Keep them stable.
// Without ANTHROPIC_API_KEY these fall back to fixture data so the demo still runs end to end.
import type {
  CompanyRef,
  CompetitorDossier,
  CounterAttackPlan,
  CustomerMention,
  EmailDraft,
  Evidence,
  LaunchPrediction,
  TargetAccount,
} from "@/lib/types";
import { demoPlans, demoPredictions } from "@/fixtures/demo-report";
import { callJson, hasAnthropicKey } from "./claude";
import {
  COUNTER_SYSTEM,
  CUSTOMERS_SYSTEM,
  PREDICT_SYSTEM,
  counterSchema,
  customersSchema,
  predictSchema,
} from "./prompts";

// ---------- helpers ----------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const shortDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n) + "…" : s) : null);

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function toConfidence(score: number): LaunchPrediction["confidence"] {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/** Evidence text is rebuilt from the dossier so the UI never shows a fact Claude invented. */
function buildEvidenceIndex(d: CompetitorDossier) {
  const index = new Map<string, Evidence>();
  for (const j of d.jobs) {
    const text = [j.title, j.location, shortDate(j.postedAt)].filter(Boolean).join(" · ");
    index.set(`job:${j.id}`, { kind: "job", ref: String(j.id), text });
  }
  for (const h of d.recentHires) {
    const prev = h.previousCompanies[0] ? ` (ex-${h.previousCompanies[0]})` : "";
    const text = `${h.name} joined as ${h.title ?? "a new hire"}${prev}`;
    index.set(`hire:${h.personId}`, { kind: "hire", ref: String(h.personId), text });
  }
  for (const n of d.news) index.set(`news:${n.url}`, { kind: "news", ref: n.url, text: n.title });
  return index;
}

/** Compact JSON view of a dossier for the prompt (ids are what Claude must cite). */
function dossierForPrompt(d: CompetitorDossier) {
  const c = d.company;
  return {
    competitor: {
      name: c.name,
      domain: c.domain,
      description: c.description ?? null,
      hq: c.hq ?? null,
      headcount: c.headcount ?? null,
      headcountGrowthYoYPct: c.headcountGrowthYoY ?? null,
      industries: c.industries ?? [],
    },
    hiringStats: d.hiring,
    jobs: d.jobs.map((j) => ({
      job_id: String(j.id),
      title: j.title,
      category: j.category,
      location: j.location,
      workplace: j.workplaceType,
      posted: j.postedAt,
      description: clip(j.descriptionSnippet, 400),
    })),
    recentHires: d.recentHires.map((h) => ({
      person_id: String(h.personId),
      name: h.name,
      title: h.title,
      started: h.startDate,
      seniority: h.seniority,
      function: h.function,
      location: h.location,
      headline: h.headline,
      skills: h.skills.slice(0, 15),
      previousCompanies: h.previousCompanies.slice(0, 5),
    })),
    news: d.news.map((n) => ({
      url: n.url,
      title: n.title,
      snippet: clip(n.snippet, 300),
      published: n.publishedAt ?? null,
    })),
  };
}

function youForPrompt(you: CompanyRef) {
  return {
    name: you.name,
    domain: you.domain,
    description: you.description ?? null,
    hq: you.hq ?? null,
    headcount: you.headcount ?? null,
    industries: you.industries ?? [],
  };
}

// ---------- Step 5: predict launches ----------

interface RawPrediction {
  slug: string;
  headline: string;
  summary: string;
  confidenceScore: number;
  expectedWindow: string;
  area: string;
  evidence: { kind: "job" | "hire" | "news"; ref: string }[];
  threatToYou: string;
}

async function predictForCompetitor(you: CompanyRef, d: CompetitorDossier): Promise<LaunchPrediction[]> {
  if (d.jobs.length + d.recentHires.length + d.news.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const user = [
    `Today is ${today}.`,
    `<you>\n${JSON.stringify(youForPrompt(you))}\n</you>`,
    `<dossier>\n${JSON.stringify(dossierForPrompt(d))}\n</dossier>`,
    `Predict what ${d.company.name} will launch next. Return 1–2 predictions (0 if the signals are too weak).`,
  ].join("\n\n");

  const out = await callJson<{ predictions: RawPrediction[] }>({
    system: PREDICT_SYSTEM,
    user,
    schema: predictSchema,
    effort: "medium",
  });

  const index = buildEvidenceIndex(d);
  const compSlug = slugify(d.company.name) || String(d.company.crustdataCompanyId);
  const result: LaunchPrediction[] = [];

  for (const p of out.predictions ?? []) {
    const seen = new Set<string>();
    const evidence: Evidence[] = [];
    for (const e of p.evidence ?? []) {
      const key = `${e.kind}:${String(e.ref).trim()}`;
      const ev = index.get(key);
      if (ev && !seen.has(key)) {
        seen.add(key);
        evidence.push(ev);
      }
    }
    if (evidence.length < 2) continue; // not enough verifiable support

    const score = Math.max(0, Math.min(100, Math.round(Number(p.confidenceScore) || 0)));
    let id = `${compSlug}-${slugify(p.slug || p.headline) || "launch"}`;
    while (result.some((r) => r.id === id)) id += "-2";

    result.push({
      id,
      competitorId: d.company.crustdataCompanyId,
      competitorName: d.company.name,
      headline: p.headline.trim(),
      summary: p.summary.trim(),
      confidence: toConfidence(score),
      confidenceScore: score,
      expectedWindow: p.expectedWindow.trim(),
      area: p.area.trim(),
      evidence: evidence.slice(0, 8),
      threatToYou: p.threatToYou.trim(),
    });
  }
  return result.slice(0, 2);
}

/**
 * Step 5: predict each competitor's next launch from its dossier.
 * Must only cite evidence refs (job id / person id / url) present in `dossiers`.
 * Target: 1–2 predictions per competitor, sorted by confidenceScore desc.
 */
export async function predictLaunches(you: CompanyRef, dossiers: CompetitorDossier[]): Promise<LaunchPrediction[]> {
  if (!hasAnthropicKey()) {
    const ids = new Set(dossiers.map((d) => d.company.crustdataCompanyId));
    return demoPredictions.filter((p) => ids.has(p.competitorId));
  }

  // One call per competitor, in parallel: faster, and one bad dossier can't sink the rest.
  const settled = await Promise.allSettled(dossiers.map((d) => predictForCompetitor(you, d)));
  const failures = settled.filter((s): s is PromiseRejectedResult => s.status === "rejected");
  if (failures.length === settled.length && settled.length > 0) throw failures[0].reason;
  for (const f of failures) console.error("[intel] predictLaunches failed for one competitor:", f.reason);

  return settled
    .flatMap((s) => (s.status === "fulfilled" ? s.value : []))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// ---------- Step 6a: extract customers ----------

/** Per-page cap so one giant page can't crowd out the rest (~5k tokens each). */
const MAX_PAGE_CHARS = 20_000;

/**
 * Step 6a: from fetched web pages (case studies, customer pages, press), list companies
 * that are customers of `competitor`. `pages[].text` is visible text (Agent A strips the HTML).
 */
export async function extractCustomers(
  competitor: CompanyRef,
  pages: { url: string; title: string | null; text: string }[],
): Promise<CustomerMention[]> {
  const usable = pages.filter((p) => p.text && p.text.trim().length > 50);
  if (usable.length === 0 || !hasAnthropicKey()) return [];

  const docs = usable
    .map(
      (p, i) =>
        `<page index="${i + 1}" url="${p.url}" title="${(p.title ?? "").replace(/"/g, "'")}">\n${p.text.slice(0, MAX_PAGE_CHARS)}\n</page>`,
    )
    .join("\n\n");

  const out = await callJson<{
    customers: { name: string; domain: string | null; sourceUrl: string; quote: string }[];
  }>({
    system: CUSTOMERS_SYSTEM,
    user: `Competitor: ${competitor.name}${competitor.domain ? ` (${competitor.domain})` : ""}\n\n${docs}\n\nList the companies these pages show are customers of ${competitor.name}.`,
    schema: customersSchema,
    effort: "low",
  });

  const byUrl = new Map(usable.map((p) => [p.url, normalise(p.text)]));
  const compName = normalise(competitor.name);
  const seen = new Set<string>();
  const result: CustomerMention[] = [];

  for (const c of out.customers ?? []) {
    const name = c.name?.trim();
    if (!name) continue;
    const key = normalise(name);
    if (seen.has(key) || key === compName) continue;
    const pageText = byUrl.get(c.sourceUrl);
    if (!pageText || !pageText.includes(key)) continue; // name must literally appear on the cited page
    const quote = c.quote?.trim() || null;
    seen.add(key);
    result.push({
      name,
      domain: c.domain?.trim() || null,
      sourceUrl: c.sourceUrl,
      quote: quote && pageText.includes(normalise(quote)) ? quote : null,
    });
  }
  return result.slice(0, 15);
}

// ---------- Step 6b: counter-attack plan + emails ----------

const MAX_EMAILS = 8;

/**
 * Step 6b: given a prediction and resolved target accounts (with buyers), write
 * 3–5 actions for `you` and one email per buyer (max ~8 emails).
 */
export async function draftCounterAttack(
  you: CompanyRef,
  prediction: LaunchPrediction,
  targets: TargetAccount[],
): Promise<Pick<CounterAttackPlan, "actions" | "emails">> {
  if (!hasAnthropicKey()) {
    const plan = demoPlans.find((p) => p.predictionId === prediction.id);
    return { actions: plan?.actions ?? [], emails: plan?.emails ?? [] };
  }

  // Pick buyers round-robin across targets so one big account doesn't take every email slot.
  const picks: { buyer: TargetAccount["buyers"][number]; target: TargetAccount }[] = [];
  for (let round = 0; picks.length < MAX_EMAILS; round++) {
    let added = false;
    for (const t of targets) {
      const b = t.buyers[round];
      if (b && picks.length < MAX_EMAILS) {
        picks.push({ buyer: b, target: t });
        added = true;
      }
    }
    if (!added) break;
  }

  const user = [
    `<you>\n${JSON.stringify(youForPrompt(you))}\n</you>`,
    `<prediction>\n${JSON.stringify({
      competitor: prediction.competitorName,
      headline: prediction.headline,
      summary: prediction.summary,
      expectedWindow: prediction.expectedWindow,
      area: prediction.area,
      threatToYou: prediction.threatToYou,
      evidence: prediction.evidence.map((e) => e.text),
    })}\n</prediction>`,
    `<targets>\n${JSON.stringify(
      targets.map((t) => ({
        company: t.company.name,
        domain: t.company.domain,
        industries: t.company.industries ?? [],
        headcount: t.company.headcount ?? null,
        usesCompetitor: t.competitorName,
        whyNow: t.whyNow,
      })),
    )}\n</targets>`,
    `<recipients>\n${JSON.stringify(
      picks.map(({ buyer, target }) => ({
        buyer_id: String(buyer.personId),
        name: buyer.name,
        title: buyer.title,
        company: target.company.name,
      })),
    )}\n</recipients>`,
    picks.length
      ? `Write the action plan and exactly one email per recipient (${picks.length} emails).`
      : "There are no recipients: write the action plan and return an empty emails array.",
  ].join("\n\n");

  const out = await callJson<{
    actions: string[];
    emails: { buyer_id: string; subject: string; body: string }[];
  }>({
    system: COUNTER_SYSTEM,
    user,
    schema: counterSchema,
    effort: "medium",
  });

  const byId = new Map(picks.map((p) => [String(p.buyer.personId), p]));
  const used = new Set<string>();
  const emails: EmailDraft[] = [];
  for (const e of out.emails ?? []) {
    const pick = byId.get(String(e.buyer_id).trim());
    if (!pick || used.has(String(pick.buyer.personId))) continue;
    used.add(String(pick.buyer.personId));
    emails.push({
      predictionId: prediction.id,
      to: {
        name: pick.buyer.name,
        title: pick.buyer.title,
        company: pick.target.company.name,
        profileUrl: pick.buyer.profileUrl,
      },
      subject: e.subject.trim(),
      body: e.body.trim(),
    });
  }

  return {
    actions: (out.actions ?? []).map((a) => a.trim()).filter(Boolean).slice(0, 5),
    emails,
  };
}
