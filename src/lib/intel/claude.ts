// OWNER: Agent B. Thin wrapper around the Anthropic SDK for JSON-only calls.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class RefusalError extends Error {}

/**
 * One Claude call that must return JSON matching `schema` (structured outputs).
 * Throws on refusal, truncation, or unparseable output.
 */
export async function callJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  // Beta path only for server-side refusal fallback: a declined request is re-run on a
  // fallback model inside the same call. stop_reason "refusal" below means the whole chain declined.
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    max_tokens: opts.maxTokens ?? 32000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: {
      effort: opts.effort,
      format: { type: "json_schema", schema: opts.schema },
    },
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") throw new RefusalError("Claude declined this request");
  if (msg.stop_reason === "max_tokens") throw new Error("Claude response was cut off (max_tokens)");

  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Claude returned invalid JSON");
  }
}
