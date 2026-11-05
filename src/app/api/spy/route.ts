// OWNER: Agent A. POST /api/spy → NDJSON stream of RunEvent (see src/lib/types.ts).
// M0: mock mode only. Real pipeline lands in M1 (src/lib/pipeline).
import { demoReport } from "@/fixtures/demo-report";
import type { CrustdataApi, RunEvent, SpyRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* mockRun(req: SpyRequest): AsyncGenerator<RunEvent> {
  const r = demoReport;
  const step = async function* (id: string, label: string, api: CrustdataApi, detail: string) {
    yield { type: "step", id, label, status: "running", api } as RunEvent;
    await sleep(350);
    yield { type: "step", id, label, status: "done", api, detail, credits: 0 } as RunEvent;
  };

  yield* step("resolve", `Resolving ${[req.you, ...req.competitors].join(", ")}`, "company.identify", "4 companies matched");
  yield { type: "company", role: "you", company: r.you };
  for (const d of r.competitors) {
    yield { type: "company", role: "competitor", company: d.company };
    const slug = d.company.name.toLowerCase();
    yield* step(`jobs:${slug}`, `Pulling 90 days of job postings for ${d.company.name}`, "job.search", `${d.hiring.totalOpenings} postings`);
    yield* step(`hires:${slug}`, `Finding people who just joined ${d.company.name}`, "person.search", `${d.recentHires.length} recent hires`);
    yield* step(`enrich:${slug}`, `Enriching key hires at ${d.company.name}`, "person.enrich", `${d.recentHires.filter((h) => h.enriched).length} profiles`);
    yield* step(`news:${slug}`, `Scanning news for ${d.company.name}`, "web.search", `${d.news.length} articles`);
    yield { type: "dossier", dossier: d };
  }
  yield* step("predict", "Predicting next launches", "claude", `${r.predictions.length} predictions`);
  for (const p of r.predictions) yield { type: "prediction", prediction: p };
  yield* step("counter", "Building counter-attack plans", "claude", `${r.plans.length} plans`);
  for (const p of r.plans) yield { type: "plan", plan: p };
  yield { type: "done", report: { ...r, request: req } };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as Partial<SpyRequest>;
  const req: SpyRequest = {
    you: body.you?.trim() || "Acme Payments",
    competitors: (body.competitors ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 3),
    lookbackDays: body.lookbackDays ?? 90,
  };
  // TODO(A, M1): when not mock, run the real pipeline. Until then everything streams the fixture.
  const mock = url.searchParams.get("mock") === "1" || process.env.CRUSTDATA_MOCK === "1";
  void mock;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gen = mockRun(req);
        for await (const ev of gen) controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        const ev: RunEvent = { type: "error", message: e instanceof Error ? e.message : String(e) };
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
