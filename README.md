# Secret Product Spy

Predict what your competitors will launch next from who they are hiring, then get a counter-attack plan:
which of their customers to pitch and ready-to-send emails. Built on [Crustdata](https://crustdata.com)
(Job Search, People Search, Person Enrichment, Company Identify/Enrich/Search, Autocomplete, Web Search, Web Fetch)
and Claude.

- Plan and API reference: [ROADMAP.md](ROADMAP.md)
- Team split and rules for the Claude agents: [CLAUDE.md](CLAUDE.md)
- Shared data contract: [src/lib/types.ts](src/lib/types.ts)

## Run

```bash
cp .env.example .env.local   # CRUSTDATA_API_KEY, ANTHROPIC_API_KEY (or CRUSTDATA_MOCK=1)
npm install
npm run dev
```

Open http://localhost:3000. Mock mode streams fictional demo data and needs no keys.
