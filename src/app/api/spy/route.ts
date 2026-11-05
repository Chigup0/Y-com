// OWNER: Agent A. POST /api/spy → NDJSON stream of RunEvent (see src/lib/types.ts).
// Real pipeline by default; mock (fictional fixture, 0 credits) with ?mock=1, CRUSTDATA_MOCK=1, or no API key.
import { demoReport } from "@/fixtures/demo-report";
import { isMockEnv } from "@/lib/crustdata/client";
import { runSpy } from "@/lib/pipeline/run";
import type { CrustdataApi, RunEvent, SpyRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mockRun(req: SpyRequest, emit: (ev: RunEvent) => void) {
  const r = demoReport;
  const step = async (id: string, label: string, api: CrustdataApi, detail: string) => {
    emit({ type: "step", id, label, status: "running", api });
    await sleep(350);
    emit({ type: "step", id, label, status: "done", api, detail, credits: 0 });
  };

  await step("resolve", `Identifying ${[r.you.name, ...r.competitors.map((c) => c.company.name)].join(", ")}`, "company.identify", "4 companies matched");
  emit({ type: "company", role: "you", company: r.you });
  for (const d of r.competitors) {
    emit({ type: "company", role: "competitor", company: d.company });
    const s = d.company.name.toLowerCase();
    await step(`jobs:${s}`, `Pulling 90 days of job postings for ${d.company.name}`, "job.search", `${d.hiring.totalOpenings} postings`);
    await step(`hires:${s}`, `Finding people who joined ${d.company.name} recently`, "person.search", `${d.recentHires.length} new joiners`);
    await step(`news:${s}`, `Scanning news about ${d.company.name}`, "web.search", `${d.news.length} articles`);
    await step(`enrich:${s}`, `Deep-profiling key hires at ${d.company.name}`, "person.enrich", `${d.recentHires.filter((h) => h.enriched).length} profiles enriched`);
    emit({ type: "dossier", dossier: d });
  }
  await step("predict", "Predicting each competitor's next launch", "claude", `${r.predictions.length} predictions`);
  for (const p of r.predictions) emit({ type: "prediction", prediction: p });
  await step("counter", "Building counter-attack plans", "claude", `${r.plans.length} plans`);
  for (const p of r.plans) emit({ type: "plan", plan: p });
  emit({ type: "done", report: { ...r, request: req } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as Partial<SpyRequest>;
  const req: SpyRequest = {
    you: body.you?.trim() || "",
    competitors: (body.competitors ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 3),
    lookbackDays: Math.min(Math.max(body.lookbackDays ?? 90, 7), 365),
  };
  // Public deploys: set SPY_ACCESS_CODE so strangers can't spend Crustdata credits. Without the code → demo data.
  const required = process.env.SPY_ACCESS_CODE;
  const supplied = body.accessCode ?? request.headers.get("x-spy-key") ?? url.searchParams.get("key") ?? "";
  const locked = Boolean(required) && supplied !== required;
  const mock = url.searchParams.get("mock") === "1" || isMockEnv() || locked;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (ev: RunEvent) => controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      try {
        if (locked && url.searchParams.get("mock") !== "1") {
          emit({ type: "step", id: "access", label: "Live data needs an access code; showing demo data", status: "done", detail: "add ?key=… to the page URL" });
        }
        if (mock) await mockRun(req, emit);
        else {
          if (!req.you) throw new Error("Enter your company.");
          const report = await runSpy(req, emit);
          emit({ type: "done", report });
        }
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
