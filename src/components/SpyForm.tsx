"use client";
// OWNER: Agent B. Input form: you + up to 3 competitors + lookback + demo toggle.
import { useState } from "react";
import type { SpyRequest } from "@/lib/types";

const DEMO = { you: "Acme Payments", competitors: ["NovaPay", "Zentra", "PayLoom"] };

export function SpyForm({
  running,
  onRun,
  onStop,
}: {
  running: boolean;
  onRun: (req: SpyRequest, mock: boolean) => void;
  onStop: () => void;
}) {
  const [you, setYou] = useState(DEMO.you);
  const [competitors, setCompetitors] = useState<string[]>(DEMO.competitors);
  const [lookback, setLookback] = useState(90);
  const [mock, setMock] = useState(true);

  const filled = competitors.map((c) => c.trim()).filter(Boolean);
  const canRun = you.trim().length > 0 && filled.length > 0 && !running;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRun) return;
    onRun({ you: you.trim(), competitors: filled.slice(0, 3), lookbackDays: lookback }, mock);
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-400/60 focus:bg-white/[0.05]";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">Your company</span>
          <input className={input} value={you} onChange={(e) => setYou(e.target.value)} placeholder="Name, domain, or LinkedIn URL" />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">Competitors (up to 3)</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                className={input}
                value={competitors[i] ?? ""}
                onChange={(e) => {
                  const next = [...competitors];
                  next[i] = e.target.value;
                  setCompetitors(next);
                }}
                placeholder={`Competitor ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Lookback
          <select
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-emerald-400/60"
          >
            {[30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
          Demo data <span className="text-zinc-500">(fictional, 0 credits)</span>
        </label>

        <div className="ml-auto flex gap-2">
          {running && (
            <button type="button" onClick={onStop} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
              Stop
            </button>
          )}
          <button
            type="submit"
            disabled={!canRun}
            className="rounded-lg bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-emerald-400/60 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {running ? "Spying…" : "Run the spy"}
          </button>
        </div>
      </div>
    </form>
  );
}
