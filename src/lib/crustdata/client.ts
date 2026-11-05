// OWNER: Agent A. The only place that talks to api.crustdata.com.
// Handles auth, per-endpoint rate limiting, retry/backoff on 429/5xx, disk cache, and credit tracking.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.crustdata.com";
const API_VERSION = "2025-11-01";
// Serverless hosts (Vercel, AWS Lambda) only allow writes under /tmp, which is per-instance and short-lived.
// Locally the cache lives in the repo's .cache/ so demo runs stay free across restarts.
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const CACHE_DIR = process.env.CRUSTDATA_CACHE_DIR || (SERVERLESS ? path.join("/tmp", "crustdata-cache") : path.join(process.cwd(), ".cache", "crustdata"));

/** Requests per minute per path (docs.crustdata.com/general/rate-limits). */
const RPM: Record<string, number> = {
  "/company/search/autocomplete": 300,
  "/person/search/autocomplete": 300,
  "/account/credits": 300,
  "/company/identify": 30,
  "/company/search": 30,
  "/job/search": 30,
  "/person/search": 30,
  "/company/enrich": 15,
  "/person/enrich": 15,
  "/web/search/live": 10,
  "/web/enrich/live": 10,
};

export class CrustdataError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

// ---------- rate limiter: spaces calls to each path evenly across the minute ----------
const nextSlot = new Map<string, number>();
async function waitTurn(p: string) {
  const gap = 60_000 / (RPM[p] ?? 10);
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(p) ?? 0);
  nextSlot.set(p, at + gap);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

// ---------- credit tracking (per run) ----------
export class CreditMeter {
  total = 0;
  add(n: number) {
    this.total = Math.round((this.total + n) * 1000) / 1000;
  }
}

export interface CallResult<T> {
  data: T;
  credits: number;
  cached: boolean;
}

export function isMockEnv() {
  return process.env.CRUSTDATA_MOCK === "1" || !process.env.CRUSTDATA_API_KEY;
}

/**
 * POST to a Crustdata endpoint. Successful responses are cached on disk by (path, body),
 * so repeat runs are free. Set `noCache` for calls whose freshness matters.
 */
export async function crustdata<T = any>(
  p: string,
  body: unknown,
  opts: { meter?: CreditMeter; noCache?: boolean; method?: "POST" | "GET" } = {},
): Promise<CallResult<T>> {
  const apiKey = process.env.CRUSTDATA_API_KEY;
  if (!apiKey) throw new CrustdataError("CRUSTDATA_API_KEY is not set", 500);

  const key = createHash("sha256").update(p + JSON.stringify(body ?? null)).digest("hex").slice(0, 32);
  const cacheFile = path.join(CACHE_DIR, `${p.replace(/\W+/g, "_")}-${key}.json`);
  if (!opts.noCache) {
    try {
      const data = JSON.parse(await readFile(cacheFile, "utf8")) as T;
      return { data, credits: 0, cached: true };
    } catch {
      /* cache miss */
    }
  }

  const method = opts.method ?? "POST";
  for (let attempt = 0; ; attempt++) {
    await waitTurn(p);
    const res = await fetch(BASE_URL + p, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-version": API_VERSION,
      },
      body: method === "POST" ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const credits = Number(res.headers.get("x-credits-used") ?? 0) || 0;
    opts.meter?.add(credits);
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (res.ok) {
      if (!opts.noCache) {
        // Best-effort: a read-only filesystem must never break a successful API call.
        try {
          await mkdir(CACHE_DIR, { recursive: true });
          await writeFile(cacheFile, JSON.stringify(data));
        } catch {
          /* ignore */
        }
      }
      return { data: data as T, credits, cached: false };
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 3) {
      const hinted = Number(res.headers.get("retry-after") ?? res.headers.get("x-ratelimit-reset") ?? 0);
      const backoff = hinted > 0 ? hinted * 1000 : 1000 * 2 ** attempt + Math.random() * 500;
      await new Promise((r) => setTimeout(r, Math.min(backoff, 30_000)));
      continue;
    }

    const msg = data?.error?.message ?? (typeof data === "string" ? data : JSON.stringify(data));
    throw new CrustdataError(`Crustdata ${p} ${res.status}: ${String(msg).slice(0, 300)}`, res.status, data);
  }
}

// ---------- small helpers shared by pipeline steps ----------

export type Filter =
  | { field: string; type: string; value: unknown }
  | { op: "and" | "or" | "all_of"; conditions: Filter[] };

export const and = (...conditions: Filter[]): Filter => ({ op: "and", conditions });
export const cond = (field: string, type: string, value: unknown): Filter => ({ field, type, value });

/** ISO date (YYYY-MM-DD) `days` ago. */
export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Strip HTML to readable text for LLM input. */
export function htmlToText(html: string, max = 6000) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
