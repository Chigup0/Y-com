"use client";
// OWNER: Agent B. A launch prediction with confidence meter and clickable evidence chips.
import type { Evidence, LaunchPrediction } from "@/lib/types";
import { ACCENTS } from "./format";

const CONF_STYLE: Record<LaunchPrediction["confidence"], string> = {
  high: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  medium: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  low: "bg-zinc-400/10 text-zinc-300 border-zinc-400/20",
};

const KIND_ICON: Record<Evidence["kind"], string> = { job: "💼", hire: "👤", news: "📰" };
const KIND_LABEL: Record<Evidence["kind"], string> = { job: "Job", hire: "Hire", news: "News" };

export function PredictionCard({
  prediction: p,
  accentIndex,
  hasPlan,
  engine,
  onEvidence,
  onPlan,
}: {
  prediction: LaunchPrediction;
  accentIndex: number;
  hasPlan: boolean;
  engine: "claude" | "rules" | null;
  onEvidence: (e: Evidence, competitorId: number) => void;
  onPlan: () => void;
}) {
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  const score = Math.max(0, Math.min(100, p.confidenceScore));

  return (
    <article id={`prediction-${p.id}`} className="relative scroll-mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent.bg}`} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-semibold ${accent.text}`}>{p.competitorName}</span>
        <span className="text-zinc-600">·</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">{p.area}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">⏱ {p.expectedWindow}</span>
        {engine === "rules" && (
          <span title="Scored by keyword rules over the hiring data, without an AI model" className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-sky-300">
            Rules engine
          </span>
        )}
        <span className={`ml-auto rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide ${CONF_STYLE[p.confidence]}`}>
          {p.confidence} confidence
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-zinc-50 sm:text-xl">{p.headline}</h3>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full ${accent.bg}`} style={{ width: `${score}%` }} />
        </div>
        <span className="font-mono text-xs tabular-nums text-zinc-400">{score}/100</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-300">{p.summary}</p>

      <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-100">
        <span className="font-semibold text-rose-300">Threat to you: </span>
        {p.threatToYou}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Evidence ({p.evidence.length})</div>
        <div className="flex flex-wrap gap-1.5">
          {p.evidence.map((e) => (
            <button
              key={`${e.kind}:${e.ref}`}
              onClick={() => onEvidence(e, p.competitorId)}
              title={`${KIND_LABEL[e.kind]} · ${e.ref}`}
              className="group flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-left text-xs text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-zinc-100"
            >
              <span aria-hidden>{KIND_ICON[e.kind]}</span>
              <span className="truncate">{e.text}</span>
              {e.kind === "news" && <span className="text-zinc-500 group-hover:text-zinc-300">↗</span>}
            </button>
          ))}
        </div>
      </div>

      {hasPlan && (
        <button onClick={onPlan} className="mt-4 text-sm font-medium text-emerald-300 hover:text-emerald-200">
          See counter-attack plan →
        </button>
      )}
    </article>
  );
}
