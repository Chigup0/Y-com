import { NextResponse } from "next/server";
import { CrustdataError, enrichCompany } from "@/lib/crustdata";
import { scoreCompany } from "@/lib/score";
import { summarize } from "@/lib/summary";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Enter a company domain, name, or LinkedIn URL." }, { status: 400 });
  }

  try {
    const enrich = await enrichCompany(query);
    const result = scoreCompany(enrich.company);

    let memo: string | null = null;
    let memoError: string | null = null;
    try {
      memo = await summarize(query, result);
    } catch (e) {
      memoError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      query,
      matched: enrich.matched,
      confidence: enrich.confidence,
      ...result,
      memo,
      memoError,
      raw: enrich.raw,
    });
  } catch (e) {
    const status = e instanceof CrustdataError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}
