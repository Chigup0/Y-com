# Secret Product Spy: instructions for Claude agents

Two Claude agents build this in parallel tonight. **Read `ROADMAP.md` first** (product, pipeline, API facts),
then this file (who owns what). The shared contract is `src/lib/types.ts`.

## Who you are

- **Agent A, Data and pipeline:** the agent that wrote this file. Owns Crustdata calls and orchestration.
- **Agent B, Intelligence and UI:** if you are reading this as a newly started agent, **you are Agent B**
  unless the user says otherwise.

## Ownership (only edit files you own)

| Area | Owner | Files |
|---|---|---|
| Crustdata client (auth, retry/backoff on 429, rate limiting, disk cache, credit tracking) | A | `src/lib/crustdata/**` |
| Pipeline steps: resolve, jobs, hires, enrich, news, customers, buyers | A | `src/lib/pipeline/**` |
| Streaming API route / orchestrator | A | `src/app/api/spy/**`, `src/app/api/suggest/**` |
| Claude prompts: launch prediction, customer extraction, action plan + emails | B | `src/lib/intel/**` |
| All UI: page, components, charts, styling | B | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/**` |
| Demo fixture data | B (A may add fields) | `src/fixtures/**` |
| Shared contract | both, **additive changes only** | `src/lib/types.ts` |
| Docs | both | `ROADMAP.md`, `CLAUDE.md`, `README.md` |

**Integration seam:**
- A's route calls B's functions in `src/lib/intel/index.ts`: `predictLaunches`, `extractCustomers`, `draftCounterAttack`.
  Their signatures are fixed; stub versions return fixture data until B implements them.
- B's UI only talks to `POST /api/spy`, which streams NDJSON `RunEvent`s (see `types.ts`).
  Add `?mock=1` (or set `CRUSTDATA_MOCK=1`) to stream the demo fixture with no API key.

## Git workflow

- Everyone commits straight to `main`; ownership keeps files disjoint.
- Before every push: `git pull --rebase`, then `npm run build` must pass, then `git push`.
- Small commits, prefixed `[A]` or `[B]`, e.g. `[B] prediction cards with evidence chips`.
- Changing `types.ts`: only add optional fields or new types, never rename or remove. Mention it in the commit message.
- Don't add npm packages without need. Already installed: `@anthropic-ai/sdk`, `recharts`, Tailwind v4.
  If you must add one, commit `package.json` and `package-lock.json` in their own commit and push immediately.
- Never commit `.env.local` or `.cache/`.

## Conventions

- Next.js 15 App Router, TypeScript, Tailwind v4. Work from the repo root (where `package.json` is).
- Env (`.env.local`): `CRUSTDATA_API_KEY`, `ANTHROPIC_API_KEY`, optional `CRUSTDATA_MOCK=1`.
- Claude model: `claude-opus-5-5` via `@anthropic-ai/sdk`. Use `output_config.effort` (`"low"` for extraction,
  `"medium"` for prediction). Don't send `temperature` or `thinking: {type: "disabled"}`: they return 400 on this model.
  Check `stop_reason === "refusal"` before reading content. Ask for JSON via `output_config.format` (structured outputs).
- Every prediction must cite evidence (job IDs, person IDs, URLs) that exists in the dossiers. No made-up facts.
- Fixture data uses **fictional** companies and people, and the UI shows a "Demo data" badge when `report.mock` is true.
- Respect rate limits (see ROADMAP §2). The client in `src/lib/crustdata` handles them; never call fetch to Crustdata elsewhere.

## Status board (update as you finish things)

- [x] M0: contract, fixture, mock stream route, intel stubs (A)
- [x] M1-A: Crustdata client + steps 1–4 real. Tested live: Razorpay vs Cashfree ≈ 14 credits first run, 0 on re-run (disk cache).
  - `/api/spy` runs the real pipeline when `CRUSTDATA_API_KEY` is set; `?mock=1` forces the fixture.
  - If `competitors` is empty, rivals are auto-picked from `you.knownCompetitors` (Crustdata SEO-overlap domains).
  - `GET /api/suggest?q=cashf` → `{ suggestions: string[] }` (Company Autocomplete, free) for the input typeahead.
  - Real data notes for B: `job_details.category` is often "Others"; use `topTitles` and job titles for signal.
    Hires carry `previousCompanies` + `skills`, which are the strongest signals (e.g. Cashfree's new
    "Senior Director - Cross Border payments" is ex-Fireblocks). `news[0].excerpt` has article text.
  - The predict step filters out predictions whose `competitorId` isn't in the dossiers, so the stub's fixture output is dropped on real runs.
- [x] M1-B: UI on fixture: input form, live agent log, competitor cards, hiring charts
- [x] M2-B: `predictLaunches` with Claude (one call per competitor in parallel; evidence refs validated
      against the dossier, predictions with <2 valid refs dropped; falls back to fixture without `ANTHROPIC_API_KEY`)
- [x] M2-A: predictions wired into the route (runs in parallel with customer discovery)
- [x] M3-A: customer discovery + buyers (`src/lib/pipeline/customers.ts`). Tested live, Razorpay vs Cashfree:
  4 verified accounts (e.g. Lokal: "Own routing logic across payment gateways (Razorpay, PayU, Cashfree…)"),
  7 founder/CXO buyers, ~4 credits.
  - Signal 1 `job_mention`: companies whose own job posts name the competitor in a vendor/payments context
    (case-sensitive, talent wish-lists filtered out). Signal 2 `case_study`: Web Search + Web Fetch of customer
    pages → **B's `extractCustomers`** → Company Identify.
  - New `RunEvent` `{type:"targets", competitorId, targets}` and `CompetitorDossier.targets`; `TargetAccount`
    now has optional `signal`, `quote`, `mentions`. Show the quote in the UI: it's the proof.
  - Plans: for each competitor's top prediction the route calls **B's `draftCounterAttack(you, prediction, targets)`**
    and emits a `plan` event. No predictions → no plans (targets are still emitted).
- [x] M3-B: `extractCustomers`, `draftCounterAttack`, plan + email UI (customer names must appear verbatim on
      the cited page; ≤8 emails, buyers picked round-robin across targets). Not yet run against the live API.
- [ ] **B, next:** handle the `targets` RunEvent (`useSpyRun` ignores it today) and show each competitor's
      target accounts even when there is no plan, e.g. a "Their customers" block on `CompetitorCard`.
      Show `quote` (the proof sentence, linked to `sourceUrl`), `signal`, `mentions`, headcount, and the buyers.
      Live example: Razorpay vs Cashfree gives Lokal, Zoomies, muun home and HV InfoTech, each with a founder/CXO buyer.
- [x] A: **rules engine** (`src/lib/pipeline/rules-intel.ts`), used automatically when `ANTHROPIC_API_KEY` is
      empty (the user has no Anthropic key tonight, so **this is what the demo runs on**). Scores jobs, hires
      (title, skills, previous employers, seniority) and news against themes: cross-border, crypto, lending, POS,
      AI agents, risk, banking, plus overseas hiring. Every evidence item comes from the dossier. Templated plans and
      emails. `SpyReport.engine` is `"rules"` or `"claude"`.
      Live, Razorpay vs Cashfree + PayU (~24 credits first run, 0 after): "Cashfree is building out cross-border
      payments" (3 senior cross-border hires, one ex-Fireblocks), "PayU is shipping AI agents" (Agent HQ news + hires).
- [ ] **B:** show a small "Rules engine" / "Claude" badge from `report.engine` (and the `predict` step label says
      "(rules engine)"). Don't call it AI-written when `engine === "rules"`.
- [x] M4-A: demo set cached (Razorpay vs Cashfree, PayU, Juspay, ~25 credits total), demo script in ROADMAP §5,
      cache works on Vercel (`/tmp`, best-effort writes). Fixed: ALL-CAPS names (JUSPAY) now match job-post mentions.
- [ ] M4: deploy to Vercel (user's account), final UI polish (B)
