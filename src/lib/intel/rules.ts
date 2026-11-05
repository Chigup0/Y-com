// OWNER: Agent B. No-LLM customer extraction, used by extractCustomers when there is no
// ANTHROPIC_API_KEY or the Claude call fails. (Predictions and plans without Claude come from
// Agent A's rules engine in src/lib/pipeline/rules-intel.ts.)
import type { CompanyRef, CustomerMention } from "@/lib/types";

const CUSTOMER_VERBS = String.raw`(?:uses|use|chose|chooses|picked|selected|switched to|moved to|migrated to|runs on|run on|relies on|rely on|trusts|went live (?:on|with)|is powered by|are powered by|powered by)`;
const NAME = String.raw`([A-Z][A-Za-z0-9&.'’-]*(?:\s+(?:[A-Z][A-Za-z0-9&.'’-]*|of|and|&)){0,4})`;
const STOP = new Set([
  "We", "Our", "The", "This", "That", "These", "It", "They", "You", "Your", "Today", "Now", "Customers",
  "Businesses", "Companies", "Merchants", "Brands", "Here", "Learn", "See", "Why", "How", "Meanwhile", "Thousands", "Millions",
]);

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?"”])\s+(?=[A-Z"“])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ruleCustomers(
  competitor: CompanyRef,
  pages: { url: string; title: string | null; text: string }[],
): CustomerMention[] {
  const comp = competitor.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Optional appositive: "Kitekart, a D2C grocery brand, switched to NovaPay".
  const reUses = new RegExp(`${NAME}(?:,[^,]{1,60},)?\\s+${CUSTOMER_VERBS}\\s+(?:the\\s+)?${comp}`, "g");
  const reCaseStudy = new RegExp(String.raw`(?:case study|customer story|success story)\s*[:|–-]\s*${NAME}`, "gi");
  const reHow = new RegExp(String.raw`^How\s+${NAME}\s+(?:uses|used|scaled|cut|grew|built|moved|saved|reduced)`);
  const out: CustomerMention[] = [];
  const seen = new Set<string>([competitor.name.toLowerCase()]);

  const add = (rawName: string, url: string, quote: string) => {
    const name = rawName
      .replace(/^(?:and|&)\s+/i, "")
      .replace(/[.,;:!?]+$/, "")
      .replace(/['’]s$/, "")
      .trim();
    if (name.length < 2 || STOP.has(name.split(/\s+/)[0]) || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    out.push({ name, domain: null, sourceUrl: url, quote: quote.length > 240 ? quote.slice(0, 237) + "…" : quote });
  };

  for (const p of pages) {
    const m = p.title ? reHow.exec(p.title) : null;
    if (m && p.title) add(m[1], p.url, p.title);
    for (const s of sentences(p.text)) {
      if (/invest|investor|backed by|funded by|competitor/i.test(s)) continue; // not customers
      for (const x of s.matchAll(reUses)) add(x[1], p.url, s);
      for (const x of s.matchAll(reCaseStudy)) add(x[1], p.url, s);
    }
  }
  return out.slice(0, 15);
}
