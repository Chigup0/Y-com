// OWNER: Agent A. Orchestrates the real pipeline and emits RunEvents as it goes.
import { CreditMeter } from "@/lib/crustdata/client";
import { predictLaunches } from "@/lib/intel";
import type { CompanyRef, CompetitorDossier, CrustdataApi, RunEvent, SpyReport, SpyRequest } from "@/lib/types";
import { collectHires, enrichKeyHires } from "./hires";
import { collectJobs } from "./jobs";
import { collectNews } from "./news";
import { resolveCompany } from "./resolve";

type Emit = (ev: RunEvent) => void;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function runSpy(req: SpyRequest, emit: Emit): Promise<SpyReport> {
  const total = new CreditMeter();
  const lookback = req.lookbackDays ?? 90;

  /** Runs one step: emits running → done/error with the credits it spent. Returns null on failure. */
  async function step<T>(
    id: string,
    label: string,
    api: CrustdataApi,
    fn: (m: CreditMeter) => Promise<T>,
    detail: (r: T) => string,
  ): Promise<T | null> {
    emit({ type: "step", id, label, status: "running", api });
    const m = new CreditMeter();
    try {
      const r = await fn(m);
      total.add(m.total);
      emit({ type: "step", id, label, status: "done", api, detail: detail(r), credits: m.total });
      return r;
    } catch (e) {
      total.add(m.total);
      const msg = e instanceof Error ? e.message : String(e);
      emit({ type: "step", id, label, status: "error", api, detail: msg.slice(0, 200), credits: m.total });
      return null;
    }
  }

  // ---- 1. Resolve ----
  const you = await step(`resolve:you`, `Identifying ${req.you}`, "company.identify", (m) => resolveCompany(req.you, m), (c) => `${c.name} · ${c.headcount ?? "?"} employees`);
  if (!you) throw new Error(`Couldn't identify "${req.you}". Try its website domain instead.`);
  emit({ type: "company", role: "you", company: you });

  let rivalInputs = req.competitors;
  if (!rivalInputs.length && you.knownCompetitors?.length) rivalInputs = you.knownCompetitors.slice(0, 3);
  if (!rivalInputs.length) throw new Error("Add at least one competitor.");

  const rivals = (
    await Promise.all(
      rivalInputs.map((c) => step(`resolve:${slug(c)}`, `Identifying ${c}`, "company.identify", (m) => resolveCompany(c, m), (r) => `${r.name} · ${r.headcount ?? "?"} employees`)),
    )
  ).filter((c): c is CompanyRef => c !== null && c.crustdataCompanyId !== you.crustdataCompanyId);
  if (!rivals.length) throw new Error("None of the competitors could be identified.");
  for (const c of rivals) emit({ type: "company", role: "competitor", company: c });

  // ---- 2–4. Dossier per competitor, in parallel (the client rate-limits per endpoint) ----
  const dossiers = await Promise.all(
    rivals.map(async (company): Promise<CompetitorDossier> => {
      const s = slug(company.name);
      const before = total.total;
      const [jobsRes, hiresRes, news] = await Promise.all([
        step(`jobs:${s}`, `Pulling ${lookback} days of job postings for ${company.name}`, "job.search", (m) => collectJobs(company, lookback, m), (r) => {
          const abroad = r.hiring.byCountry.slice(0, 3).map((b) => `${b.count} ${b.key}`).join(", ");
          return `${r.hiring.totalOpenings} postings${abroad ? ` · ${abroad}` : ""}`;
        }),
        step(`hires:${s}`, `Finding people who joined ${company.name} recently`, "person.search", (m) => collectHires(company, lookback, m), (r) => `${r.total} new joiners`),
        step(`news:${s}`, `Scanning news about ${company.name}`, "web.search", (m) => collectNews(company, lookback, m), (r) => `${r.length} articles · ${r.filter((n) => n.excerpt).length} read in full`),
      ]);
      const hires = hiresRes?.hires ?? [];
      await step(`enrich:${s}`, `Deep-profiling key hires at ${company.name}`, "person.enrich", (m) => enrichKeyHires(hires, company.crustdataCompanyId, m), (n) => `${n} profiles enriched`);

      const dossier: CompetitorDossier = {
        company,
        jobs: jobsRes?.jobs ?? [],
        hiring: jobsRes?.hiring ?? { totalOpenings: 0, byCategory: [], byCountry: [], topTitles: [] },
        recentHires: hires,
        news: news ?? [],
        creditsUsed: Math.round((total.total - before) * 100) / 100, // approximate: parallel steps share the meter
      };
      emit({ type: "dossier", dossier });
      return dossier;
    }),
  );

  // ---- 5. Predict (Agent B) ----
  const knownIds = new Set(dossiers.map((d) => d.company.crustdataCompanyId));
  const predictions =
    (await step("predict", "Predicting each competitor's next launch", "claude", async () => {
      const all = await predictLaunches(you, dossiers);
      return all.filter((p) => knownIds.has(p.competitorId)); // drops fixture output from the stub
    }, (r) => `${r.length} predictions`)) ?? [];
  for (const p of predictions) emit({ type: "prediction", prediction: p });

  // ---- 6. Counter-attack: M3 ----

  return {
    request: req,
    you,
    competitors: dossiers,
    predictions,
    plans: [],
    generatedAt: new Date().toISOString(),
    creditsUsed: total.total,
    mock: false,
  };
}
