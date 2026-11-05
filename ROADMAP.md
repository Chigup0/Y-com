# Secret Product Spy: Roadmap

**One line:** Enter your company and up to 3 competitors. An agent reads who they are hiring and who
they just hired, predicts what each will launch next (with evidence), then builds a counter-attack:
the competitor's customers to pitch now, the right buyer at each, and draft emails.

Handbook fit: Theme 9 (Revenue) and Theme 3 (Research), "Forecast a rival's next launch from who it is hiring."

---

## 1. The pipeline (and which Crustdata API powers each step)

```
 INPUT  you = "Razorpay", competitors = ["Cashfree", "PayU", "Juspay"], lookback = 90 days
   │
 1 RESOLVE        Company Autocomplete (typeahead, free)
   │              Company Identify      name/domain → crustdata_company_id (free)
   │              Company Enrichment    headcount, funding, competitors list (2 cr each)
   │
 2 HIRING INTENT  Job Search            open roles posted in lookback window, per competitor
   │                                    + aggregations: by category, country, title  (0.03 cr/row)
   │
 3 WHO JOINED     People Search         people whose current start_date at competitor ≥ lookback
   │              Person Autocomplete   normalise titles / skills for filters (free)
   │              Person Enrichment     top ~5 "signal" hires: skills + past employers (1 cr each)
   │                                    e.g. ex-Binance, ex-Coinbase → crypto signal
   │
 4 CONTEXT        Web Search            news / announcements per competitor, last 90 days (1 cr)
   │              Web Fetch             read 1–2 key pages (blog, careers, press) (1 cr each)
   │
 5 PREDICT        Claude                cluster signals → LaunchPrediction[] with evidence + confidence
   │
 6 COUNTER-ATTACK Web Search + Fetch    find competitor's customer pages / case studies
   │              Claude                extract customer names from those pages
   │              Company Identify      resolve customers → companies
   │              Company Search        (optional) look-alikes of those customers
   │              People Search         buyer at each target (VP Payments, CFO, CTO…)
   │              Claude                action plan + personalised email drafts
   ▼
 OUTPUT  SpyReport: dossiers, predictions, plans, emails (streamed live to the UI)
```

**APIs used: 11.** Company Autocomplete, Company Identify, Company Enrichment, Company Search, Job Search,
People Search, Person Autocomplete, Person Enrichment, Web Search, Web Fetch, plus account credits
(`GET /account/credits`) to show "credits spent" in the UI.

## 2. API facts (verified from docs.crustdata.com, API version `2025-11-01`)

All calls: `https://api.crustdata.com`, headers `authorization: Bearer $CRUSTDATA_API_KEY`,
`x-api-version: 2025-11-01`, `content-type: application/json`. Every response has an `X-Credits-Used` header.

| API | Method + path | Rate limit | Cost |
|---|---|---|---|
| Company Autocomplete | `POST /company/search/autocomplete` | 300/min | free |
| Company Identify | `POST /company/identify` `{names\|domains:[…]}` | 30/min | free |
| Company Enrichment | `POST /company/enrich` `{domains:[…], fields:[…]}` | 15/min | 2/record |
| Company Search | `POST /company/search` `{filters, limit}` | 30/min | 0.03/row |
| Job Search | `POST /job/search` `{filters, sorts, limit, fields, aggregations}` | 30/min | 0.03/row |
| People Search | `POST /person/search` `{filters, sorts, limit, fields}` | 30/min | 0.03/row + 0.1 per premium group |
| Person Autocomplete | `POST /person/search/autocomplete` `{field, query, limit}` | 300/min | free |
| Person Enrichment | `POST /person/enrich` `{professional_network_profile_urls:[≤25], fields}` | 15/min | 1+/record |
| Web Search | `POST /web/search/live` `{query, sources, start_date, end_date}` | 10/min | 1/query |
| Web Fetch | `POST /web/enrich/live` `{urls:[≤10]}` | 10/min | 1/page |

Key field paths:
- Job filters: `company.basic_info.company_id`, `metadata.date_added` (`=>` ISO date), `job_details.category`,
  `job_details.title`, `location.country`, `content.description` (`(.)` substring).
  Rows: `job_details.title|category|url|workplace_type`, `location.raw|country`, `content.description`, `metadata.date_added`.
- Person filters: `experience.employment_details.current.company_id`, `…current.start_date` (`=>`),
  `…current.title`, `…current.seniority_level`, `…current.function_category`, `skills.professional_network_skills`.
  Rows: `basic_profile.name|headline|current_title|location`, `experience.employment_details.current[]|past[]`,
  `skills.professional_network_skills`, `social_handles.professional_network_identifier.profile_url`.
- Operators: `=`, `!=`, `<`, `=<`, `>`, `=>`, `in`, `not_in`, `(.)` substring, `[.]` phrase. Groups: `{op:"and"|"or", conditions:[…]}`.
- Enrich/identify responses are arrays: `[{matched_on, matches:[{confidence_score, company_data|person_data}]}]`.

## 3. Credit budget per run (3 competitors)

| Step | Approx credits |
|---|---|
| Identify ×4 | 0 |
| Enrich ×4 | 8 |
| Job Search: 100 rows ×3 | 9 |
| People Search: 30 rows ×3 (with experience + skills) | ~12 |
| Person Enrich: 5 ×3 | 15 |
| Web Search: 2 ×3 + 2 for customers | 8 |
| Web Fetch: ~6 pages | 6 |
| Buyer People Search: ~10 rows ×5 targets | ~7 |
| **Total** | **≈ 65 credits / run** |

Every Crustdata response is cached to `.cache/crustdata/` (keyed by request body), so re-running
the demo costs 0. Mock mode (`CRUSTDATA_MOCK=1`) costs 0 and needs no key.

## 4. Milestones for tonight

| # | Target | Done when |
|---|---|---|
| M0 | Contract + mock stream | `npm run dev`, `/api/spy` streams the demo fixture, both agents unblocked ✅ (this commit) |
| M1 | Real data in | Steps 1–4 hit Crustdata for real (A); UI renders fixture: live agent log, competitor cards, hiring charts (B) |
| M2 | Predictions | `predictLaunches` returns evidence-backed predictions from real dossiers (B); route wires it in (A) |
| M3 | Counter-attack | Customer discovery + buyers (A); action plan + email drafts + copy buttons (B) |
| M4 | Demo-ready | Razorpay vs Cashfree / PayU / Juspay cached end to end, error states, deploy to Vercel, 2-min demo script |

## 5. Demo script (2 minutes), real data, cached

**Before going on stage:** run `Razorpay` vs `Cashfree`, `PayU`, `Juspay` once with **Demo data unticked**.
Everything is then cached in `.cache/crustdata/`, so the live run is fast and costs 0 credits.
Don't clear `.cache/`. If the Wi-Fi dies, tick **Demo data** (fictional, fully offline).

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page | "Strategy firms charge $50K to tell you what a rival is building next. Every launch starts with hiring, 3–6 months before, and that hiring is public. We read it." |
| 0:15 | Type **Razorpay**; competitors **Cashfree, PayU, Juspay**; untick Demo data; **Run the spy** | "I'm Razorpay. These are my three biggest rivals." |
| 0:20 | Point at the agent log as it ticks | "It's an agent chaining 10 Crustdata APIs: Company Identify and Enrichment, Job Search, People Search, Person Enrichment, Web Search and Web Fetch, Company Search, Autocomplete. You can see the credits per step." |
| 0:40 | Top prediction: **Cashfree is building out cross-border payments** | "Cashfree just hired a Senior Director of Cross-Border Payments who came from Fireblocks, a crypto custody firm, plus an Associate Director and a Manager for cross-border, all in 60 days. Every claim links to the actual hire. Bonus: 5 of their recent hires came from Razorpay." |
| 1:00 | Scroll to PayU and Juspay | "PayU and Juspay are both going after AI agents for merchants: the news plus their hiring agree." |
| 1:15 | **Counter-attack on Cashfree** | "Knowing is half of it. Who do we call? These companies' *own job posts* say they run on Cashfree. Lokal, 1,260 people: 'Own routing logic across payment gateways (Razorpay, PayU, Cashfree…)'. Here's their CEO and CTO." |
| 1:35 | Open an email, hit **Copy** | "And a ready-to-send email, pitched at the exact launch Cashfree is about to make." |
| 1:50 | Close | "Any company, any market, under a minute, about 25 credits. Secret Product Spy." |

**Likely questions:**
- *Isn't this just guessing?* Every prediction shows its evidence (job posts, hires, articles) and is dropped if it has fewer than 2 pieces. Confidence goes up with senior hires whose title matches the theme.
- *Without an LLM?* Tonight it runs on a transparent rules engine; set `ANTHROPIC_API_KEY` and Claude writes the predictions and emails instead (same UI).
- *How do you know they're customers?* Their own job ads name the competitor in a payments context (gateway, integration, settlement), checked case-sensitively; mentions like "candidates from Cashfree" are filtered out.

## 5b. Deploying (Vercel)

- Import the GitHub repo in Vercel (framework: Next.js, root: repo root, no build settings to change).
- Environment variables:
  - `CRUSTDATA_API_KEY`: required for live data (without it the site serves demo data only).
  - `SPY_ACCESS_CODE`: **set this on any public deploy.** Visitors without the code get demo data, so
    strangers can't spend your credits. You get live data by opening `https://<app>.vercel.app/?key=<code>`.
  - `ANTHROPIC_API_KEY`: optional; switches predictions and emails from the rules engine to Claude.
- On Vercel the cache lives in `/tmp` (per instance, short-lived), so the first runs there spend credits.
  **Demo from localhost** for a guaranteed 0-credit, instant run; use the Vercel URL as the shareable link.
- `/api/spy` streams for up to ~60 s on a cold run; `maxDuration` is 300 (needs Vercel Pro; Hobby caps at 60 s).

## 6. Stretch (only after M4)

- Watch mode: re-run weekly, diff predictions ("new signal since last week").
- Compare "you vs them" hiring mix radar chart.
- Export the report as PDF / share link.
