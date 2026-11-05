"use client";

import { useState } from "react";

type Signal = {
  id: string;
  label: string;
  flagged: boolean;
  points: number;
  severity: "high" | "medium" | "low";
  detail: string;
};

type Result = {
  query: string;
  matched: boolean;
  confidence: number | null;
  score: number;
  band: "Low" | "Elevated" | "High";
  signals: Signal[];
  facts: Record<string, string | number | null>;
  memo: string | null;
  memoError: string | null;
  raw: unknown;
};

const EXAMPLES = ["stripe.com", "retool.com", "linear.app"];

const bandStyle = {
  Low: { ring: "#16a34a", text: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40" },
  Elevated: { ring: "#d97706", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  High: { ring: "#dc2626", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
};

const sevDot = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-zinc-400" };

function fmt(key: string, v: string | number | null) {
  if (v === null || v === "") return "—";
  if (typeof v === "number" && /usd/i.test(key)) {
    return v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`;
  }
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return String(v);
}

const FACT_LABELS: [string, string][] = [
  ["name", "Name"],
  ["domain", "Domain"],
  ["yearFounded", "Founded"],
  ["headcount", "Headcount"],
  ["headcountYoY", "Headcount YoY %"],
  ["monthlyVisitors", "Monthly visitors"],
  ["openings", "Open roles"],
  ["followers", "LinkedIn followers"],
  ["fundingUsd", "Total funding"],
  ["investors", "Investors"],
  ["revenueUpperUsd", "Revenue (upper est.)"],
  ["hq", "Headquarters"],
  ["country", "Country"],
  ["industry", "Industry"],
];

function Memo({ text }: { text: string }) {
  // Minimal markdown: bullets and bold.
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split("\n").filter(Boolean).map((line, i) => {
        const html = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/^#+\s*/, "");
        const bullet = /^\s*[-*•]\s+/.test(line);
        return bullet ? (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-zinc-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: html.replace(/^\s*[-*•]\s+/, "") }} />
          </div>
        ) : (
          <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function analyze(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const style = result ? bandStyle[result.band] : null;
  const flagged = result?.signals.filter((s) => s.flagged) ?? [];
  const clear = result?.signals.filter((s) => !s.flagged) ?? [];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Powered by Crustdata</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Shell Company Detector</h1>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Check whether a company has a real operating footprint: people, traffic, hiring, and history. Built
            for KYC, vendor onboarding, and fraud review.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            analyze(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Domain, company name, or LinkedIn company URL"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
          />
          <button
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Investigating…" : "Investigate"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-500">
          Try:
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => analyze(ex)} className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
              {ex}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {result && style && (
          <div className="mt-8 space-y-6">
            <section className={`flex flex-col items-center gap-6 rounded-xl p-6 sm:flex-row ${style.bg}`}>
              <div
                className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
                style={{ background: `conic-gradient(${style.ring} ${result.score * 3.6}deg, rgba(128,128,128,.15) 0)` }}
              >
                <div className="grid h-24 w-24 place-items-center rounded-full bg-zinc-50 dark:bg-zinc-950">
                  <span className="text-3xl font-bold">{result.score}</span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className={`text-sm font-semibold uppercase tracking-wide ${style.text}`}>{result.band} shell risk</p>
                <h2 className="text-2xl font-bold">{result.facts.name ?? result.query}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {result.matched
                    ? `Matched in Crustdata${result.confidence !== null ? ` · confidence ${Math.round(result.confidence * 100)}%` : ""}`
                    : "No Crustdata record found"}
                  {" · "}
                  {flagged.length} of {result.signals.length} red flags
                </p>
              </div>
            </section>

            {(result.memo || result.memoError) && (
              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Analyst memo (Claude)</h3>
                {result.memo ? <Memo text={result.memo} /> : <p className="text-sm text-red-600">{result.memoError}</p>}
              </section>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Red flags</h3>
                {flagged.length === 0 && <p className="text-sm text-zinc-500">None. Looks like a real operating company.</p>}
                <ul className="space-y-3">
                  {flagged.map((s) => (
                    <li key={s.id} className="flex gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sevDot[s.severity]}`} />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {s.label} <span className="text-xs text-zinc-500">+{s.points}</span>
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {clear.length > 0 && (
                  <>
                    <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Passed checks</h4>
                    <ul className="flex flex-wrap gap-2">
                      {clear.map((s) => (
                        <li key={s.id} className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800">
                          ✓ {s.label}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Footprint</h3>
                <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                  {FACT_LABELS.map(([k, label]) => (
                    <div key={k} className="contents">
                      <dt className="text-zinc-500">{label}</dt>
                      <dd className="min-w-0 break-words text-right font-medium">{fmt(k, result.facts[k] ?? null)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <section>
              <button onClick={() => setShowRaw((v) => !v)} className="text-sm text-zinc-500 underline">
                {showRaw ? "Hide" : "Show"} raw Crustdata response
              </button>
              {showRaw && (
                <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
