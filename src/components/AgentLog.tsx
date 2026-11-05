"use client";
// OWNER: Agent B. Live agent log: every pipeline step with its API, status, detail and credits.
import { useEffect, useRef, useState } from "react";
import type { CrustdataApi } from "@/lib/types";
import type { RunStatus, StepEvent } from "./useSpyRun";
import { credits } from "./format";

const API_LABEL: Record<CrustdataApi, string> = {
  "company.autocomplete": "Company Autocomplete",
  "company.identify": "Company Identify",
  "company.enrich": "Company Enrich",
  "company.search": "Company Search",
  "job.search": "Job Search",
  "person.search": "People Search",
  "person.autocomplete": "Person Autocomplete",
  "person.enrich": "Person Enrich",
  "web.search": "Web Search",
  "web.fetch": "Web Fetch",
  "account.credits": "Credits",
  claude: "Claude",
  rules: "Rules engine",
};

const API_STYLE: Partial<Record<CrustdataApi, string>> = {
  claude: "bg-orange-400/10 text-orange-300",
  rules: "bg-sky-400/10 text-sky-300",
};

function StatusIcon({ status }: { status: StepEvent["status"] }) {
  if (status === "running")
    return <span className="mt-1 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />;
  if (status === "error")
    return <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-300">!</span>;
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2.5 6.5l2.2 2.2 4.8-5" />
      </svg>
    </span>
  );
}

export function AgentLog({
  steps,
  status,
  startedAt,
  finishedAt,
}: {
  steps: StepEvent[];
  status: RunStatus;
  startedAt: number | null;
  finishedAt: number | null;
}) {
  // Scroll only the log list, never the page.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [steps.length]);

  // On phones, fold the log to its summary line once the run is done so the results come first.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (status === "running") setCollapsed(false);
    else if (status === "done" && typeof window !== "undefined" && window.innerWidth < 1024) setCollapsed(true);
  }, [status]);

  const total = steps.reduce((a, s) => a + (s.credits ?? 0), 0);
  const apis = new Set(steps.map((s) => s.api).filter(Boolean));
  const done = steps.filter((s) => s.status === "done").length;
  const secs = startedAt ? Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000) : 0;

  return (
    <section className="flex max-h-[45vh] flex-col rounded-2xl border border-white/10 bg-zinc-900/60 lg:max-h-[50vh]">
      <header className={`flex flex-wrap items-center lg:flex-nowrap justify-between gap-x-3 gap-y-1 px-4 py-3 ${collapsed ? "" : "border-b border-white/10"}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status === "running" ? "animate-pulse bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-zinc-500"}`} />
          <h2 className="text-sm font-semibold text-zinc-100">Agent log</h2>
        </div>
        <div className="flex gap-3 font-mono text-[11px] text-zinc-400">
          <span>{done}/{steps.length} steps</span>
          <span>{apis.size} APIs</span>
          <span className="text-emerald-300">{credits(total)} cr</span>
          {startedAt && <span>{secs}s</span>}
          {steps.length > 0 && (
            <button onClick={() => setCollapsed((v) => !v)} className="text-zinc-500 lg:hidden underline-offset-2 hover:text-zinc-200 hover:underline">
              {collapsed ? "show" : "hide"}
            </button>
          )}
        </div>
      </header>

      <ol ref={listRef} className={`flex-1 space-y-2.5 overflow-y-auto px-4 py-3 ${collapsed ? "hidden" : ""}`}>
        {steps.length === 0 && <li className="text-sm text-zinc-500">Waiting for the first step…</li>}
        {steps.map((s) => (
          <li key={s.id} className="flex gap-2.5">
            <StatusIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <div className={`text-[13px] leading-snug ${s.status === "running" ? "text-zinc-100" : s.status === "error" ? "text-rose-200" : "text-zinc-300"}`}>
                {s.label}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-zinc-500">
                {s.api && (
                  <span className={`rounded px-1.5 py-px ${API_STYLE[s.api] ?? "bg-white/5 text-zinc-400"}`}>
                    {API_LABEL[s.api] ?? s.api}
                  </span>
                )}
                {s.detail && <span className="text-zinc-400">{s.detail}</span>}
                {s.credits != null && s.credits > 0 && <span className="text-emerald-400/80">{credits(s.credits)} cr</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
