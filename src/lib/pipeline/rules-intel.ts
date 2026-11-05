// OWNER: Agent A. Rules-based intelligence used when there is no ANTHROPIC_API_KEY.
// Same output types as src/lib/intel (Agent B's Claude version), so the UI renders it unchanged.
// Every prediction is built only from evidence that exists in the dossier.
import type {
  CompanyRef,
  CompetitorDossier,
  CounterAttackPlan,
  EmailDraft,
  Evidence,
  LaunchPrediction,
  TargetAccount,
} from "@/lib/types";

interface Theme {
  id: string;
  area: string;
  headline: (c: string) => string;
  pattern: RegExp;
  what: string; // "a cross-border payments product"
  threat: (you: string, c: string) => string;
  actions: (you: string, c: string) => string[];
  pitch: string; // one line for emails
  trend: string; // "cross-border payments", for "Providers are moving into …"
  /** How telling this theme is. Generic hygiene hiring (risk, legal) is discounted. */
  weight: number;
}

const THEMES: Theme[] = [
  {
    id: "cross-border",
    area: "Cross-border",
    headline: (c) => `${c} is building out cross-border payments`,
    pattern: /(cross[- ]?border|remittance|\bforex\b|\bfx\b|\bpa-?cb\b|import|export|international payments|global payments|corridor|multi-?currency)/i,
    what: "a cross-border / international payments product",
    threat: (y, c) => `Exporters and D2C brands selling abroad are exactly the merchants ${y} wants to grow; ${c} will pitch them a bundled cross-border offer.`,
    actions: (y, c) => [
      `Ring-fence ${y}'s top exporters and international-selling merchants with a pricing lock before ${c} launches.`,
      `Get sales to lead with ${y}'s cross-border settlement times and FX transparency this quarter.`,
      `Track ${c}'s cross-border team page and job posts weekly for the launch market.`,
    ],
    pitch: "faster international settlement and transparent FX",
    trend: "cross-border payments",
    weight: 1.2,
  },
  {
    id: "crypto",
    area: "Digital assets",
    headline: (c) => `${c} is exploring crypto / stablecoin rails`,
    pattern: /(crypto|blockchain|stablecoin|web3|custody|\bwallet infra|fireblocks|coinbase|binance|\bmpc\b|tokeni[sz]ation)/i,
    what: "stablecoin or crypto-based settlement",
    threat: (y, c) => `If ${c} settles on stablecoin rails, it can undercut ${y} on cross-border cost.`,
    actions: (y) => [
      `Prepare ${y}'s regulatory positioning: regulated bank rails, no crypto exposure.`,
      `Brief large merchants' finance teams on compliance risk of crypto settlement.`,
      `Evaluate a partner-led stablecoin pilot so ${y} isn't caught flat-footed.`,
    ],
    pitch: "fully regulated settlement without crypto exposure",
    trend: "crypto-based settlement",
    weight: 1.2,
  },
  {
    id: "lending",
    area: "Lending",
    headline: (c) => `${c} is preparing merchant lending`,
    pattern: /(lending|\bcredit\b|underwrit|\bloans?\b|\bnbfc\b|\bbnpl\b|working capital|cash advance)/i,
    what: "merchant lending / working-capital loans",
    threat: (y) => `Merchants with a loan from their gateway rarely switch; this locks them away from ${y}.`,
    actions: (y, c) => [
      `Offer ${y}'s best merchants a working-capital or settlement-advance option before ${c} does.`,
      `Flag merchants with seasonal cash-flow gaps to account managers now.`,
    ],
    pitch: "working capital tied to your sales",
    trend: "merchant lending",
    weight: 1.1,
  },
  {
    id: "pos",
    area: "Offline payments",
    headline: (c) => `${c} is moving into offline / POS payments`,
    pattern: /(\bpos\b|soundbox|terminal|hardware|firmware|\bemv\b|device|offline merchants?|kirana|field sales)/i,
    what: "in-store devices and offline merchant acquiring",
    threat: (y) => `An offline device push attacks ${y}'s omnichannel merchants and tier-2 growth.`,
    actions: (y) => [
      `Bundle ${y}'s offline acceptance with online for omnichannel merchants.`,
      `Prioritise tier-2/3 field coverage where devices will land first.`,
    ],
    pitch: "one stack for online and in-store payments",
    trend: "in-store payments",
    weight: 1.1,
  },
  {
    id: "ai",
    area: "AI & automation",
    headline: (c) => `${c} is shipping AI agents for payments`,
    pattern: /(\bai\b|\bagentic\b|\bai agents?\b|\bllms?\b|genai|generative|machine learning|\bml engineer)/i,
    what: "AI agents that automate payments and operations",
    threat: (y, c) => `AI-led ops automation is a sticky differentiator for SMBs; ${c} will use it to poach ${y}'s self-serve merchants.`,
    actions: (y) => [
      `Show ${y}'s own automation (reconciliation, payouts, dispute handling) in every SMB demo.`,
      `Fast-track any AI assistant on ${y}'s roadmap to a public beta.`,
    ],
    pitch: "automated reconciliation and payouts",
    trend: "AI-driven payment automation",
    weight: 0.9,
  },
  {
    id: "risk",
    area: "Risk & compliance",
    headline: (c) => `${c} is hardening risk, disputes and compliance`,
    pattern: /(\brisk\b|fraud|chargeback|dispute|compliance|\baml\b|\bkyc\b|law enforcement|public policy|regulat|licen[cs]e|legal)/i,
    what: "stronger risk, dispute and compliance infrastructure (often ahead of a licence or a regulated launch)",
    threat: (y, c) => `${c} will sell "safer payments" to high-risk categories ${y} serves, and may be preparing a new licence.`,
    actions: (y) => [
      `Publish ${y}'s chargeback win-rate and dispute turnaround in sales collateral.`,
      `Check which licences or regulatory approvals ${y}'s rival is applying for.`,
    ],
    pitch: "lower chargebacks and faster dispute resolution",
    trend: "tighter risk and compliance",
    weight: 0.5,
  },
  {
    id: "banking",
    area: "Business banking",
    headline: (c) => `${c} is building business banking features`,
    pattern: /(neo-?bank|current account|banking alliances?|treasury|card issuing|corporate cards?|virtual accounts?|escrow)/i,
    what: "banking features: accounts, cards or treasury",
    threat: (y) => `Banking features move the relationship from "gateway" to "financial home", away from ${y}.`,
    actions: (y) => [
      `Cross-sell ${y}'s banking or payouts products to gateway-only merchants.`,
      `Offer treasury or settlement-account incentives to top merchants.`,
    ],
    pitch: "payments and banking in one place",
    trend: "business banking",
    weight: 1.0,
  },
];

const SENIOR = /(chief|cxo|vp|vice president|director|head|founder|partner|principal)/i;

const shortDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Hit {
  ev: Evidence;
  weight: number;
}

function scoreTheme(t: Theme, d: CompetitorDossier): { hits: Hit[]; score: number } {
  const hits: Hit[] = [];
  for (const j of d.jobs) {
    const inTitle = t.pattern.test(j.title);
    const inDesc = !inTitle && t.pattern.test(j.descriptionSnippet ?? "");
    if (inTitle || inDesc)
      hits.push({ weight: inTitle ? 3 : 1, ev: { kind: "job", ref: String(j.id), text: [j.title, j.location, shortDate(j.postedAt)].filter(Boolean).join(" · ") } });
  }
  for (const h of d.recentHires) {
    const inTitle = t.pattern.test(h.title ?? "");
    const background = [h.headline, h.skills.join(" "), h.previousCompanies.join(" ")].join(" ");
    const inBg = !inTitle && t.pattern.test(background);
    if (!inTitle && !inBg) continue;
    const senior = SENIOR.test(`${h.seniority ?? ""} ${h.title ?? ""}`);
    const prev = h.previousCompanies[0] ? ` (ex-${h.previousCompanies[0]})` : "";
    hits.push({ weight: (inTitle ? 4 : 1.5) * (senior ? 1.5 : 1), ev: { kind: "hire", ref: String(h.personId), text: `${h.name} joined as ${h.title ?? "a new hire"}${prev}` } });
  }
  for (const n of d.news) {
    if (t.pattern.test(`${n.title} ${n.snippet ?? ""}`)) hits.push({ weight: 3, ev: { kind: "news", ref: n.url, text: n.title } });
  }
  hits.sort((a, b) => b.weight - a.weight);
  return { hits, score: hits.reduce((s, h) => s + h.weight, 0) };
}

/** Countries (other than HQ) where the competitor is hiring ≥2 roles: geographic expansion. */
function geoExpansion(d: CompetitorDossier): { country: string; hits: Hit[] } | null {
  const hq = (d.company.hq ?? "").toLowerCase();
  const home = d.hiring.byCountry[0]?.key;
  for (const b of d.hiring.byCountry) {
    if (b.key === home || hq.includes(b.key.toLowerCase()) || b.count < 2) continue;
    const jobs = d.jobs.filter((j) => j.country === b.key);
    const hits = jobs.map((j) => ({ weight: 3, ev: { kind: "job" as const, ref: String(j.id), text: [j.title, j.location, shortDate(j.postedAt)].filter(Boolean).join(" · ") } }));
    if (hits.length >= 2) return { country: b.key, hits };
  }
  return null;
}

export function rulesPredict(you: CompanyRef, dossiers: CompetitorDossier[]): LaunchPrediction[] {
  const out: LaunchPrediction[] = [];
  for (const d of dossiers) {
    const c = d.company.name;
    const poached = d.recentHires.filter((h) => h.previousCompanies.some((p) => p.toLowerCase().includes(you.name.toLowerCase()))).length;
    const poachNote = poached >= 2 ? ` ${poached} of their recent hires came from ${you.name}.` : "";

    const candidates: LaunchPrediction[] = [];
    for (const t of THEMES) {
      const { hits, score: raw } = scoreTheme(t, d);
      const kinds = new Set(hits.map((h) => h.ev.kind));
      // Need ≥2 pieces of evidence and at least one job or hire (news alone is not a hiring signal).
      if (hits.length < 2 || !(kinds.has("job") || kinds.has("hire")) || raw < 6) continue;
      const seniorHires = hits.filter((h) => h.ev.kind === "hire" && h.weight >= 6).length;
      // Saturating curve so scores spread out; senior hires in the theme's own title are the strongest tell.
      const score = (raw + seniorHires * 6) * t.weight;
      const conf = Math.round(25 + 65 * (1 - Math.exp(-score / 30)));
      const jobs = hits.filter((h) => h.ev.kind === "job").length;
      const hires = hits.filter((h) => h.ev.kind === "hire").length;
      const news = hits.filter((h) => h.ev.kind === "news").length;
      const parts = [jobs && `${jobs} open role${jobs > 1 ? "s" : ""}`, hires && `${hires} recent hire${hires > 1 ? "s" : ""}`, news && `${news} news item${news > 1 ? "s" : ""}`].filter(Boolean).join(", ");
      candidates.push({
        id: `${slug(c)}-${t.id}`,
        competitorId: d.company.crustdataCompanyId,
        competitorName: c,
        headline: t.headline(c),
        summary: `${parts} point to ${t.what}. Strongest signal: ${hits[0].ev.text}.${poachNote}`,
        confidence: conf >= 70 ? "high" : conf >= 45 ? "medium" : "low",
        confidenceScore: conf,
        expectedWindow: seniorHires >= 2 ? "3–6 months" : seniorHires === 1 ? "4–8 months" : "6–12 months",
        area: t.area,
        evidence: hits.slice(0, 6).map((h) => h.ev),
        threatToYou: t.threat(you.name, c),
      });
    }

    const geo = geoExpansion(d);
    if (geo) {
      // Capped: Crustdata may match a regional entity (e.g. PayU India), so "abroad" can be a legacy home market.
      const conf = Math.min(60, 30 + geo.hits.length * 4);
      candidates.push({
        id: `${slug(c)}-expansion-${slug(geo.country)}`,
        competitorId: d.company.crustdataCompanyId,
        competitorName: c,
        headline: `${c} is building a team in ${geo.country}`,
        summary: `${geo.hits.length} open roles in ${geo.country}, outside its main hiring market. That points to a market launch or a new hub there; check whether ${c} already operates in ${geo.country}.${poachNote}`,
        confidence: "medium",
        confidenceScore: conf,
        expectedWindow: "3–9 months",
        area: "Geo expansion",
        evidence: geo.hits.slice(0, 6).map((h) => h.ev),
        threatToYou: `${you.name}'s merchants selling into ${geo.country} become ${c}'s first targets there.`,
      });
    }

    out.push(...candidates.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 2));
  }
  return out.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

export function rulesCounterAttack(
  you: CompanyRef,
  prediction: LaunchPrediction,
  targets: TargetAccount[],
): Pick<CounterAttackPlan, "actions" | "emails"> {
  const theme = THEMES.find((t) => prediction.id.endsWith(`-${t.id}`));
  const c = prediction.competitorName;
  const actions = theme
    ? theme.actions(you.name, c)
    : [
        `Contact ${c}'s customers in the affected market before the launch.`,
        `Brief sales on ${prediction.area.toLowerCase()} positioning against ${c}.`,
      ];
  if (targets.length) actions.push(`Work the ${targets.length} ${c} accounts below; each one names ${c} in its own job posts.`);

  const pitch = theme?.pitch ?? "a better deal on payments";
  const trend = theme?.trend ?? (prediction.area === "Geo expansion" ? "new markets" : prediction.area.toLowerCase());
  const emails: EmailDraft[] = [];
  for (const t of targets) {
    const b = t.buyers[0];
    if (!b) continue;
    const first = b.name.split(/\s+/)[0];
    const multi = new RegExp(you.name, "i").test(t.quote ?? "");
    emails.push({
      predictionId: prediction.id,
      to: { name: b.name, title: b.title, company: t.company.name, profileUrl: b.profileUrl },
      subject: `${t.company.name} + ${you.name}: ${pitch}`,
      body: [
        `Hi ${first},`,
        ``,
        multi
          ? `I noticed ${t.company.name} runs payments across several gateways, including ${c} and ${you.name}.`
          : `I noticed ${t.company.name} uses ${c} for payments.`,
        `Payment providers are pushing into ${trend}, and pricing and terms tend to shift when that happens.`,
        ``,
        `${you.name} can give ${t.company.name} ${pitch}, and we can lock today's pricing in now.`,
        multi ? `Happy to show how routing more volume through us would cut your costs.` : `Happy to run a side-by-side on your current costs.`,
        ``,
        `Worth 20 minutes this week?`,
        ``,
        `Best,`,
        `${you.name} team`,
      ].join("\n"),
    });
    if (emails.length >= 8) break;
  }
  return { actions: actions.slice(0, 5), emails };
}
