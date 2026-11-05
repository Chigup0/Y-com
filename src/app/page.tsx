"use client";
// OWNER: Agent B. Secret Product Spy main page.
import { useEffect, useMemo, useState } from "react";
import type { Evidence } from "@/lib/types";
import { AgentLog } from "@/components/AgentLog";
import { CompetitorCard } from "@/components/CompetitorCard";
import { PlanSection } from "@/components/PlanSection";
import { PredictionCard } from "@/components/PredictionCard";
import { SpyForm } from "@/components/SpyForm";
import { useSpyRun } from "@/components/useSpyRun";
import { ACCENTS, evidenceDomId } from "@/components/format";

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">{children}</h2>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="h-3 w-1/4 rounded bg-white/10" />
      <div className="mt-3 h-5 w-3/4 rounded bg-white/10" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="mt-2 h-3 rounded bg-white/5" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

const HOW = [
  { n: "01", t: "Read their hiring", d: "Job Search and People Search pull every role they opened and everyone who just joined." },
  { n: "02", t: "Predict the launch", d: "Claude, or a free rules engine, clusters the signals into concrete launch predictions, each backed by real jobs and hires." },
  { n: "03", t: "Strike first", d: "Find their customers, the buyer at each, and get ready-to-send emails." },
];

export default function Home() {
  const { state, run, stop } = useSpyRun();
  const [highlight, setHighlight] = useState<string | null>(null);

  const running = state.status === "running";
  const engine = state.report?.engine ?? (state.steps.some((st) => st.api === "rules") ? "rules" : null);
  const isMock = state.report ? state.report.mock : state.mockRequested;

  const accentById = useMemo(() => {
    const m = new Map<number, number>();
    state.companies.forEach((c, i) => m.set(c.crustdataCompanyId, i));
    state.dossiers.forEach((d) => {
      if (!m.has(d.company.crustdataCompanyId)) m.set(d.company.crustdataCompanyId, m.size);
    });
    return m;
  }, [state.companies, state.dossiers]);
  const accentOf = (id: number) => accentById.get(id) ?? 0;

  const planIds = useMemo(() => new Set(state.plans.map((p) => p.predictionId)), [state.plans]);
  const credits = state.report?.creditsUsed ?? state.steps.reduce((a, s) => a + (s.credits ?? 0), 0);

  useEffect(() => {
    if (!highlight) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(highlight)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setHighlight(null), 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [highlight]);

  function onEvidence(e: Evidence) {
    if (e.kind === "news" && /^https?:\/\//.test(e.ref)) {
      window.open(e.ref, "_blank", "noopener,noreferrer");
      return;
    }
    setHighlight(evidenceDomId(e.kind, e.ref));
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const predictingStarted = state.steps.some((s) => s.id === "predict");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.10),transparent_70%)]" />
      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" aria-hidden>
                🕵️
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Secret Product Spy</h1>
              {isMock && state.status !== "idle" && (
                <span className="whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  Demo data
                </span>
              )}
              {state.report?.engine && !isMock && (
                <span
                  title={state.report.engine === "rules" ? "Predictions and emails come from a transparent rules engine (no LLM key set)." : "Predictions and emails written by Claude."}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    state.report.engine === "rules" ? "border-sky-400/40 bg-sky-400/10 text-sky-300" : "border-orange-400/40 bg-orange-400/10 text-orange-300"
                  }`}
                >
                  {state.report.engine === "rules" ? "Rules engine" : "Claude"}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Predict what your competitors launch next from who they&apos;re hiring, then pitch their customers before they ship.
            </p>
          </div>
          <div className="text-xs text-zinc-500">
            Powered by <span className="text-zinc-300">Crustdata</span>{engine !== "rules" && (<> + <span className="text-zinc-300">Claude</span></>)}
          </div>
        </header>

        <SpyForm running={running} onRun={run} onStop={stop} />

        {state.error && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            <span className="font-semibold">Run failed:</span> {state.error}
          </div>
        )}

        {state.status === "idle" ? (
          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {HOW.map((h) => (
              <div key={h.n} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
                <div className="font-mono text-xs text-emerald-400">{h.n}</div>
                <div className="mt-2 font-semibold text-zinc-100">{h.t}</div>
                <p className="mt-1 text-sm text-zinc-400">{h.d}</p>
              </div>
            ))}
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <AgentLog steps={state.steps} status={state.status} startedAt={state.startedAt} finishedAt={state.finishedAt} />
              {state.companies.length > 0 && (
                <nav className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-sm">
                  {state.you && (
                    <div className="mb-2 text-xs text-zinc-500">
                      You: <span className="text-zinc-200">{state.you.name}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {state.companies.map((c) => (
                      <button
                        key={c.crustdataCompanyId}
                        onClick={() => scrollTo(`competitor-${c.crustdataCompanyId}`)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-zinc-300 hover:bg-white/5"
                      >
                        <span className={`h-2 w-2 rounded-full ${ACCENTS[accentOf(c.crustdataCompanyId) % ACCENTS.length].bg}`} />
                        {c.name}
                        <span className="ml-auto text-xs text-zinc-500">
                          {state.predictions.filter((p) => p.competitorId === c.crustdataCompanyId).length || ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  {state.status === "done" && (
                    <div className="mt-3 border-t border-white/10 pt-3 text-xs text-zinc-500">
                      {state.predictions.length} predictions · {state.plans.length} plans · {credits} credits
                    </div>
                  )}
                </nav>
              )}
            </aside>

            <div className="min-w-0 space-y-10">
              <section>
                <SectionTitle sub={state.predictions.length ? "sorted by confidence" : undefined}>Predicted launches</SectionTitle>
                <div className="space-y-4">
                  {state.predictions.map((p) => (
                    <PredictionCard
                      key={p.id}
                      prediction={p}
                      accentIndex={accentOf(p.competitorId)}
                      hasPlan={planIds.has(p.id)}
                      engine={engine}
                      onEvidence={onEvidence}
                      onPlan={() => scrollTo(`plan-${p.id}`)}
                    />
                  ))}
                  {state.predictions.length === 0 && running && (
                    <>
                      <Skeleton />
                      {!predictingStarted && <p className="text-xs text-zinc-500">Predictions appear once the dossiers are in.</p>}
                    </>
                  )}
                  {state.predictions.length === 0 && state.status === "done" && (
                    <p className="text-sm text-zinc-500">No launch signal strong enough to call. Try a longer lookback.</p>
                  )}
                </div>
              </section>

              {(state.plans.length > 0 || (running && predictingStarted)) && (
                <section>
                  <SectionTitle>Counter-attack plans</SectionTitle>
                  <div className="space-y-4">
                    {state.plans.map((plan) => {
                      const pred = state.predictions.find((p) => p.id === plan.predictionId);
                      return <PlanSection key={plan.predictionId} plan={plan} prediction={pred} accentIndex={pred ? accentOf(pred.competitorId) : 0} />;
                    })}
                    {state.plans.length === 0 && running && <Skeleton lines={4} />}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle sub={state.dossiers.length ? `${state.dossiers.length} dossiers` : undefined}>Competitor dossiers</SectionTitle>
                <div className="space-y-4">
                  {state.dossiers.map((d) => (
                    <CompetitorCard
                      key={d.company.crustdataCompanyId}
                      dossier={d}
                      accentIndex={accentOf(d.company.crustdataCompanyId)}
                      highlight={highlight}
                    />
                  ))}
                  {running &&
                    state.companies
                      .filter((c) => !state.dossiers.some((d) => d.company.crustdataCompanyId === c.crustdataCompanyId))
                      .map((c) => <Skeleton key={c.crustdataCompanyId} lines={5} />)}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
