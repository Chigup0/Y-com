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
- [x] **Done by A while B was unavailable (commit `[B-by-A]`). B: pull before editing these files:**
      `useSpyRun.ts` (handles `targets`), new `ProofQuote.tsx`, `CompetitorCard.tsx` ("Their customers" block),
      `PlanSection.tsx` (quote under "Why now"), `AgentLog.tsx` (`rules` → "Rules engine" label), `page.tsx`
      (engine badge). `CrustdataApi` gained `"rules"` (additive).
- [x] ~~B, next: handle the `targets` RunEvent~~ (`useSpyRun` ignores it today) and show each competitor's
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
- [x] ~~B: show a small "Rules engine" / "Claude" badge~~ (done, see above) from `report.engine` (and the `predict` step label says
      "(rules engine)"). Don't call it AI-written when `engine === "rules"`.
- [x] M4-A: demo set cached (Razorpay vs Cashfree, PayU, Juspay, ~25 credits total), demo script in ROADMAP §5,
      cache works on Vercel (`/tmp`, best-effort writes). Fixed: ALL-CAPS names (JUSPAY) now match job-post mentions.
- [x] B (after A's [B-by-A] UI): kept A's ProofQuote / targets block / engine labels. Added: `extractCustomers`
      without a key uses regex extraction (`src/lib/intel/rules.ts`), so case-study pages still yield customers;
      Claude failures fall back to A's `rulesPredict` / `rulesCounterAttack`; "Rules engine" tag on prediction cards;
      fixture NovaPay has a fictional target so the customers block shows in demo mode.
- [x] A: case-study customers now come **only from the competitor's own website**, and the quote must name the
      competitor and the customer must appear on that page. Before this, B's regex extractor produced junk on live
      data: "Your Cookie Rookie" (from an AWS cookie banner, AWS page where Cashfree is the *customer*) and
      HubSpot/Slack/Salesforce as "PayU customers" (from a generic blog post). Live demo set now: only verified accounts.
- [x] A: `SPY_ACCESS_CODE` env: when set, `/api/spy` serves demo data unless the request carries the code
      (`body.accessCode`, header `x-spy-key`, or `?key=` on the API URL). `SpyRequest.accessCode` added (additive).
- [x] B: **precision check on the real demo run** (Razorpay vs Cashfree, PayU, Juspay; run on B's machine, which had no
      cache, so it cost **67.1 credits**, not ~25; the re-run was 1.8 s and 0.69 credits). Case-study path: 1 account
      before the fix, "Your Cookie Rookie" (from the AWS case study), wrong. `ruleCustomers` now only reads pages on
      the competitor's own domain and ignores "Case Study |" title separators; on the cached pages it returns 0
      accounts (PayU's own success-stories page is just a list of post titles). Of the 12 pages fetched, 11 were not on a
      competitor's own site. Job-mention path, after the fix: Lokal, Zoomies, muun home (Cashfree) and hoichoi (Juspay)
      are real usage; **HV InfoTech and E Software Solutions are web agencies listing gateways as skills** (see Requests for A).
- [x] B: demo polish. Plan accounts are stacked cards (no sideways scroll at 375 px) sorted biggest first, so
      **Lokal leads Cashfree's counter-attack**; "Jump to" links in the sidebar (top prediction, each counter-attack);
      stronger "See the counter-attack" button; the agent log folds after the run on phones and is shorter on desktop
      so the jump links stay visible; empty state when a competitor has no verified customers.
      Done the Requests-for-B item: `useSpyRun` sends `?key=` from the page URL as `accessCode`.
- [x] B: **demo safety net.** A live run that sends an `error` event, or no event for 25 s, shows a sticky banner
      "Live data hiccup: show the cached demo instead?" with **Show the demo** (re-runs the same inputs with `?mock=1`)
      and, for a stall, **Keep waiting**. Unfinished steps turn into "interrupted" so nothing keeps spinning.
      Tested with a faked failing stream and a faked silent stream.
- [x] B: **export.** After a run: **Copy as Markdown** (predictions + linked evidence, actions, accounts with buyers and
      proof quotes, emails, other competitor customers; ~250 lines for the demo set) and **Print / PDF** (print
      stylesheet: black on white, form, sidebar and buttons hidden, email bodies expanded).
- [x] B: **README.md rewritten for judges** (pitch, two screenshots of the real cached run in `docs/`, pipeline, the 9
      Crustdata APIs and what each does, run locally, demo / rules / Claude modes, access code). A: edit freely.
- [ ] B: test the Vercel URL once the user shares it (loads, demo works, `?key=` gives live data, 375 px).
- [ ] M4: deploy to Vercel (user's account)

## Requests for B

- ~~**useSpyRun:** read `key` from the page URL~~ (done by B) (`new URLSearchParams(location.search).get("key")`) and send it as
  `accessCode` in the `/api/spy` request body. Without this, the deployed site with `SPY_ACCESS_CODE` set can only
  show demo data, even for us.

## Requests for A

- **API count:** the code calls 9 Crustdata endpoints (Company Autocomplete, Identify, Enrich, Search; Job Search; People
  Search; Person Enrich; Web Search; Web Fetch). Person Autocomplete and `/account/credits` are only in the rate-limit
  table. ROADMAP §5 says "chaining 10 Crustdata APIs"; README now says 9. Either call one of them or change the script.

- **Job-mention precision:** HV InfoTech ("Payment gateway integrations popular in India (Razorpay, PayU, Cashfree)")
  and E Software Solutions ("Experience with payment gateway integration such as Razorpay, Stripe, or PayU") are web
  agencies whose job ads list gateways as *skills*, not gateways they use. They show up under Cashfree and PayU. Suggest
  dropping mentions that sit next to "experience with", "integration(s) such as/popular", "knowledge of", or that list
  3+ gateways including Razorpay itself (a skills list), and/or requiring a usage verb (settlement, reconciliation,
  routing, "our gateway").
- **Case-study search:** 11 of 12 Web Fetch pages were generic blogs ("customer case study examples"), news, or
  google.com/goto redirects. A `site:<competitor domain>` query (or a filter before Web Fetch) would save ~6 credits
  per run and not change results.
- **Credit estimate:** the README/ROADMAP say ~25 credits per demo run; a cold run here was 67.1
  (customers 21.4, hires 18.2, news 9, enrich 9, resolve 8). Worth updating the number people see.
