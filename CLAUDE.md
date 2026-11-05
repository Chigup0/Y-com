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
- [ ] M1-B: UI on fixture: input form, live agent log, competitor cards, hiring charts
- [ ] M2-B: `predictLaunches` with Claude
- [ ] M2-A: wire predictions into the route
- [ ] M3-A: customer discovery + buyers
- [ ] M3-B: `extractCustomers`, `draftCounterAttack`, plan + email UI
- [ ] M4: end-to-end cached demo, deploy
