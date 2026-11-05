"use client";
// OWNER: Agent B. Streams POST /api/spy (NDJSON RunEvents) into UI state.
import { useCallback, useRef, useState } from "react";
import type {
  CompanyRef,
  CompetitorDossier,
  CounterAttackPlan,
  LaunchPrediction,
  RunEvent,
  SpyReport,
  SpyRequest,
} from "@/lib/types";

export type StepEvent = Extract<RunEvent, { type: "step" }>;
export type RunStatus = "idle" | "running" | "done" | "error";

export interface SpyState {
  status: RunStatus;
  steps: StepEvent[]; // first-seen order, latest status per id
  you: CompanyRef | null;
  companies: CompanyRef[];
  dossiers: CompetitorDossier[];
  predictions: LaunchPrediction[];
  plans: CounterAttackPlan[];
  report: SpyReport | null;
  error: string | null;
  mockRequested: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

const initial: SpyState = {
  status: "idle",
  steps: [],
  you: null,
  companies: [],
  dossiers: [],
  predictions: [],
  plans: [],
  report: null,
  error: null,
  mockRequested: false,
  startedAt: null,
  finishedAt: null,
};

const upsertBy = <T,>(list: T[], item: T, key: (t: T) => string | number) => {
  const k = key(item);
  const i = list.findIndex((x) => key(x) === k);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
};

function apply(s: SpyState, ev: RunEvent): SpyState {
  switch (ev.type) {
    case "step":
      return { ...s, steps: upsertBy(s.steps, ev, (x) => x.id) };
    case "company":
      return ev.role === "you"
        ? { ...s, you: ev.company }
        : { ...s, companies: upsertBy(s.companies, ev.company, (c) => c.crustdataCompanyId) };
    case "dossier":
      return { ...s, dossiers: upsertBy(s.dossiers, ev.dossier, (d) => d.company.crustdataCompanyId) };
    case "prediction":
      return { ...s, predictions: upsertBy(s.predictions, ev.prediction, (p) => p.id) };
    case "plan":
      return { ...s, plans: upsertBy(s.plans, ev.plan, (p) => p.predictionId) };
    case "targets":
      return {
        ...s,
        dossiers: s.dossiers.map((d) => (d.company.crustdataCompanyId === ev.competitorId ? { ...d, targets: ev.targets } : d)),
      };
    case "done": {
      const r = ev.report;
      return {
        ...s,
        status: "done",
        report: r,
        you: r.you,
        companies: r.competitors.map((d) => d.company),
        dossiers: r.competitors,
        predictions: r.predictions,
        plans: r.plans,
        finishedAt: Date.now(),
      };
    }
    case "error":
      return { ...s, status: "error", error: ev.message, finishedAt: Date.now() };
    default:
      return s;
  }
}

export function useSpyRun() {
  const [state, setState] = useState<SpyState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (req: SpyRequest, mock: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ ...initial, status: "running", mockRequested: mock, startedAt: Date.now() });

    const push = (ev: RunEvent) => setState((s) => apply(s, ev));
    try {
      const res = await fetch(`/api/spy${mock ? "?mock=1" : ""}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            push(JSON.parse(line) as RunEvent);
          } catch {
            /* skip malformed line */
          }
        }
      }
      if (buf.trim()) push(JSON.parse(buf) as RunEvent);
      // Stream ended without a done/error event.
      setState((s) => (s.status === "running" ? { ...s, status: "error", error: "The run ended unexpectedly.", finishedAt: Date.now() } : s));
    } catch (e) {
      if (ac.signal.aborted) return;
      setState((s) => ({ ...s, status: "error", error: e instanceof Error ? e.message : String(e), finishedAt: Date.now() }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => (s.status === "running" ? { ...s, status: "error", error: "Stopped.", finishedAt: Date.now() } : s));
  }, []);

  return { state, run, stop };
}
