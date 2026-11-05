# Shell Company Detector

Enter a company domain, name, or LinkedIn company URL. The app pulls the company's footprint from
[Crustdata](https://crustdata.com) (headcount, web traffic, hiring, funding, location, social presence),
scores it against shell-company red flags, and has Claude write a short due-diligence memo.

## Red flags scored

| Signal | Points |
|---|---|
| No Crustdata record at all | 80 |
| Ghost headcount (0–2 employees) | 25 |
| Money without people (≥ $5M raised, < 10 staff) | 20 |
| Secrecy jurisdiction HQ (BVI, Cayman, Panama, …) | 18 |
| No real web traffic (< 500 visits / month) | 12 |
| Revenue without people (≥ $10M est., < 10 staff) | 12 |
| Recently incorporated (≤ 2 years) | 10 |
| Very small team (3–10) | 8 |
| Thin social presence | 8 |
| Dormant (no hiring, no growth) | 6 |
| No business description | 6 |
| No founding date | 5 |

Score is capped at 100. 0–24 Low, 25–49 Elevated, 50+ High.

## Run it

```bash
cp .env.example .env.local   # add CRUSTDATA_API_KEY and ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000.

## Code

- `src/lib/crustdata.ts`: Crustdata `POST /company/enrich` client
- `src/lib/score.ts`: red-flag rules and scoring
- `src/lib/summary.ts`: Claude memo (claude-opus-5-5)
- `src/app/api/analyze/route.ts`: API route tying it together
- `src/app/page.tsx`: UI
