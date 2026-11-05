// OWNER: Agent B (written by Agent A while B was unavailable).
// The verbatim sentence proving a target uses the competitor, with the competitor's name highlighted.
import type { TargetAccount } from "@/lib/types";

export function ProofQuote({ target }: { target: TargetAccount }) {
  if (!target.quote) return null;
  const brand = target.competitorName.split(/\s+/)[0];
  const parts = target.quote.split(new RegExp(`(${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"));
  const source = target.signal === "case_study" ? "case study" : "their job post";
  return (
    <blockquote className="mt-1.5 border-l-2 border-emerald-400/40 pl-2.5 text-xs italic leading-relaxed text-zinc-400">
      {parts.map((p, i) =>
        p.toLowerCase() === brand.toLowerCase() ? (
          <mark key={i} className="rounded bg-emerald-400/15 px-0.5 not-italic font-semibold text-emerald-200">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
      <a href={target.sourceUrl} target="_blank" rel="noreferrer" className="ml-1.5 not-italic text-[11px] text-zinc-500 hover:text-zinc-300">
        {source} ↗
      </a>
    </blockquote>
  );
}
