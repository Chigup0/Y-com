"use client";
// OWNER: Agent B. One competitor's dossier: firmographics, hiring charts, recent hires, notable jobs.
import { useState } from "react";
import type { CompetitorDossier } from "@/lib/types";
import { ACCENTS, compactNum, compactUsd, evidenceDomId, pct, shortDate } from "./format";
import { HiringChart } from "./HiringChart";

const JOBS_PREVIEW = 6;

export function CompetitorCard({
  dossier,
  accentIndex,
  highlight,
}: {
  dossier: CompetitorDossier;
  accentIndex: number;
  /** DOM id of an evidence row to expand and highlight (from an evidence chip click). */
  highlight: string | null;
}) {
  const { company: c, jobs, hiring, recentHires, news } = dossier;
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  const [showAllJobs, setShowAllJobs] = useState(false);

  const highlightedJobIndex = highlight ? jobs.findIndex((j) => evidenceDomId("job", j.id) === highlight) : -1;
  const jobsShown = showAllJobs || highlightedJobIndex >= JOBS_PREVIEW ? jobs : jobs.slice(0, JOBS_PREVIEW);

  const facts = [
    c.hq,
    c.headcount != null ? `${compactNum(c.headcount)} people` : null,
    c.headcountGrowthYoY != null ? `${pct(c.headcountGrowthYoY)} YoY` : null,
    c.totalFundingUsd ? `${compactUsd(c.totalFundingUsd)} raised` : null,
  ].filter(Boolean);

  const ring = (id: string) => (highlight === id ? `ring-2 ${accent.ring} bg-white/[0.06]` : "");

  return (
    <article id={`competitor-${c.crustdataCompanyId}`} className="scroll-mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1" />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.soft} text-lg font-bold ${accent.text}`}>
              {c.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-zinc-50">{c.name}</h3>
            <div className="truncate text-xs text-zinc-400">
              {c.domain && <span className="text-zinc-300">{c.domain}</span>}
              {c.domain && facts.length > 0 && " · "}
              {facts.join(" · ")}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-bold tabular-nums ${accent.text}`}>{hiring.totalOpenings}</div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">open roles</div>
        </div>
      </header>

      {c.description && <p className="mt-3 text-sm text-zinc-400">{c.description}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <HiringChart title="By function" data={hiring.byCategory} color={accent.fill} />
        <HiringChart title="By country" data={hiring.byCountry} color={accent.fill} />
      </div>

      {hiring.topTitles.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Top titles</div>
          <div className="flex flex-wrap gap-1.5">
            {hiring.topTitles.slice(0, 8).map((t) => (
              <span key={t.key} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
                {t.key} <span className="text-zinc-500">×{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Who just joined <span className="text-zinc-600">({recentHires.length})</span>
          </div>
          {recentHires.length === 0 && <p className="text-sm text-zinc-500">No recent hires found.</p>}
          <ul className="space-y-2">
            {recentHires.map((h) => {
              const id = evidenceDomId("hire", h.personId);
              return (
                <li key={h.personId} id={id} className={`scroll-mt-24 rounded-lg border border-white/5 p-2.5 transition ${ring(id)}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 text-sm">
                      {h.profileUrl ? (
                        <a href={h.profileUrl} target="_blank" rel="noreferrer" className="font-medium text-zinc-100 hover:underline">
                          {h.name}
                        </a>
                      ) : (
                        <span className="font-medium text-zinc-100">{h.name}</span>
                      )}
                      {h.title && <span className="text-zinc-400"> · {h.title}</span>}
                    </div>
                    {h.startDate && <span className="shrink-0 text-[11px] text-zinc-500">{shortDate(h.startDate)}</span>}
                  </div>
                  {h.previousCompanies.length > 0 && (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      ex-<span className="text-zinc-300">{h.previousCompanies.slice(0, 3).join(", ")}</span>
                    </div>
                  )}
                  {h.skills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {h.skills.slice(0, 6).map((s) => (
                        <span key={s} className="rounded bg-white/5 px-1.5 py-px text-[11px] text-zinc-400">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Notable postings <span className="text-zinc-600">({jobs.length})</span>
          </div>
          {jobs.length === 0 && <p className="text-sm text-zinc-500">No postings in the window.</p>}
          <ul className="space-y-1.5">
            {jobsShown.map((j) => {
              const id = evidenceDomId("job", j.id);
              return (
                <li key={j.id} id={id} className={`scroll-mt-24 rounded-lg border border-white/5 px-2.5 py-2 transition ${ring(id)}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 text-sm text-zinc-100">
                      {j.url ? (
                        <a href={j.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {j.title} ↗
                        </a>
                      ) : (
                        j.title
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-500">{shortDate(j.postedAt)}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {[j.category, j.location, j.workplaceType].filter(Boolean).join(" · ")}
                  </div>
                  {j.descriptionSnippet && highlight === id && <p className="mt-1 text-xs text-zinc-400">{j.descriptionSnippet}</p>}
                </li>
              );
            })}
          </ul>
          {jobs.length > JOBS_PREVIEW && (
            <button onClick={() => setShowAllJobs((v) => !v)} className="mt-2 text-xs text-zinc-400 hover:text-zinc-200">
              {showAllJobs ? "Show fewer" : `Show all ${jobs.length}`}
            </button>
          )}
        </div>
      </div>

      {news.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">In the news</div>
          <ul className="space-y-1.5">
            {news.slice(0, 5).map((n) => {
              const id = evidenceDomId("news", n.url);
              return (
                <li key={n.url} id={id} className={`scroll-mt-24 rounded-lg px-1 text-sm ${ring(id)}`}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="text-zinc-200 hover:underline">
                    {n.title} ↗
                  </a>
                  {n.publishedAt && <span className="ml-2 text-[11px] text-zinc-500">{shortDate(n.publishedAt)}</span>}
                  {n.snippet && <p className="text-xs text-zinc-500">{n.snippet}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
