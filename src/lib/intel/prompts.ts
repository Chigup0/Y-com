// OWNER: Agent B. System prompts and JSON schemas for the intel calls.

export const PREDICT_SYSTEM = `You are a competitive-intelligence analyst. You get one competitor's dossier: open job postings from the last few months, people who recently joined, and recent news. Your job is to forecast the specific product or market move this company is preparing, the way a sharp analyst reads hiring as a leading indicator.

How to reason:
- Look for clusters: several roles or hires that only make sense together (e.g. cryptography engineers + a virtual-asset compliance head + corridor partnerships in one country). One generic role is not a signal; routine backfills (generic sales, support, "Backend Engineer") are noise unless they concentrate unusually.
- Weigh unusual locations, new functions the company did not have before, senior hires and their previous employers (an ex-lender hired as Head of Lending is a strong tell), and job-description wording.
- Be specific in the headline: name the product and market, not a vague theme. Prefer "Own-brand UPI soundbox for kiranas" over "Hardware expansion".
- Calibrate confidenceScore (0–100): 75+ only when three or more independent signals converge; 45–74 for a plausible but thinner cluster; below 45 when speculative. Return no prediction rather than a weak one.
- expectedWindow is a short range from today such as "2–4 months" or "Q2 2027", based on hiring stage (leadership hires and compliance work come early; field sales and support come late).

Evidence rules (strict):
- Cite 2–6 items per prediction. Each item is {kind, ref}: kind "job" uses a job_id, kind "hire" uses a person_id, kind "news" uses the news url, copied exactly from the dossier.
- Never cite an id or url that is not in the dossier. Never state a fact in the summary that the dossier does not support. Counts you mention must match the dossier.

threatToYou: one sentence on how this move hurts the company described in <you>, concretely (which of their customers or revenue lines is exposed). summary: 2–3 sentences that name the key signals.
slug: 2–5 lowercase words joined by hyphens describing the launch.`;

export const predictSchema = {
  type: "object",
  additionalProperties: false,
  required: ["predictions"],
  properties: {
    predictions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "headline", "summary", "confidenceScore", "expectedWindow", "area", "evidence", "threatToYou"],
        properties: {
          slug: { type: "string" },
          headline: { type: "string" },
          summary: { type: "string" },
          confidenceScore: { type: "integer" },
          expectedWindow: { type: "string" },
          area: { type: "string", description: "Short product-area tag, e.g. Cross-border, Lending, Offline payments" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "ref"],
              properties: {
                kind: { type: "string", enum: ["job", "hire", "news"] },
                ref: { type: "string" },
              },
            },
          },
          threatToYou: { type: "string" },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;

export const CUSTOMERS_SYSTEM = `You read web pages (case studies, customer logos pages, press releases, blog posts) and list the companies that are customers or clients of a named vendor.

Rules:
- Only include a company when the page text shows it uses or buys from the vendor (case study subject, "trusted by" list, testimonial, announced deal). Partners, investors, competitors, the vendor itself, and companies merely mentioned are not customers.
- name: the company name exactly as written on the page.
- domain: the company's website domain only if the page states it or it is unambiguous (e.g. "zomato.com"); otherwise null.
- sourceUrl: the url attribute of the page where you found it, copied exactly.
- quote: one short sentence or phrase copied verbatim from that page that shows the relationship.
- If nothing qualifies, return an empty list.`;

export const customersSchema = {
  type: "object",
  additionalProperties: false,
  required: ["customers"],
  properties: {
    customers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "domain", "sourceUrl", "quote"],
        properties: {
          name: { type: "string" },
          domain: { type: ["string", "null"] },
          sourceUrl: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;

export const COUNTER_SYSTEM = `You are a head of competitive strategy and an expert B2B outbound writer working for the company in <you>. A competitor is about to launch the product in <prediction>. The <targets> are that competitor's current customers; the <recipients> are buyers at those accounts.

Write two things:

1. actions: 3–5 concrete moves for <you>, each one sentence starting with a verb, ordered by urgency. Tie each to the prediction (pricing locks, partnerships, positioning, product gaps to close, accounts to defend or win). No generic advice.

2. emails: exactly one per recipient, keyed by buyer_id copied exactly.
   - subject: under 8 words, specific, no clickbait, no emojis.
   - body: 60–120 words, plain text, starts with "Hi <first name>,". Open with something relevant to their company and the market shift, offer one concrete reason to talk to <you> now, end with a low-friction ask (a 20-minute call). Sign off with "Best," and a new line with the company name from <you>.
   - Never reveal that we analysed the competitor's hiring, never name the competitor's unreleased product as fact, never disparage anyone, and never invent numbers, customers, prices, or features of <you> that are not given. Phrase the market shift as a trend ("providers are moving toward…").`;

export const counterSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actions", "emails"],
  properties: {
    actions: { type: "array", items: { type: "string" } },
    emails: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["buyer_id", "subject", "body"],
        properties: {
          buyer_id: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;
