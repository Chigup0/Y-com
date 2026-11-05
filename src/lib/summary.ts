// One Claude call that turns the scored signals into a short analyst memo.
import Anthropic from "@anthropic-ai/sdk";
import type { ScoreResult } from "./score";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export async function summarize(query: string, result: ScoreResult): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const payload = {
    query,
    risk_score: result.score,
    risk_band: result.band,
    flagged: result.signals.filter((s) => s.flagged).map(({ label, detail }) => ({ label, detail })),
    clear: result.signals.filter((s) => !s.flagged).map((s) => s.label),
    facts: result.facts,
  };

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    // Routes refusals to a fallback model automatically.
    fallbacks: "default",
    system:
      "You are a KYC / due-diligence analyst. Given company data and rule-based shell-company risk signals, " +
      "write a brief memo: one-sentence verdict, then 2-4 bullet points on the strongest evidence for and against " +
      "the company being a shell, then one recommended next step. Use plain markdown, under 150 words. " +
      "Only use the data provided; say when data is missing rather than guessing.",
    messages: [{ role: "user", content: JSON.stringify(payload, null, 2) }],
  } as any);

  if (response.stop_reason === "refusal") return null;
  return response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}
