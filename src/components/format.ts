// OWNER: Agent B. Display helpers.

export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function compactUsd(n: number | null | undefined): string | null {
  if (n == null) return null;
  return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function compactNum(n: number | null | undefined): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pct(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `${n > 0 ? "+" : ""}${Math.round(n)}%`;
}

export function credits(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

/** Stable accent per competitor index. */
export const ACCENTS = [
  { text: "text-sky-300", bg: "bg-sky-400", fill: "#38bdf8", ring: "ring-sky-400/40", soft: "bg-sky-400/10" },
  { text: "text-fuchsia-300", bg: "bg-fuchsia-400", fill: "#e879f9", ring: "ring-fuchsia-400/40", soft: "bg-fuchsia-400/10" },
  { text: "text-amber-300", bg: "bg-amber-400", fill: "#fbbf24", ring: "ring-amber-400/40", soft: "bg-amber-400/10" },
] as const;

export const evidenceKey = (kind: string, ref: string | number) => `${kind}:${ref}`;
export const evidenceDomId = (kind: string, ref: string | number) =>
  `ev-${kind}-${String(ref).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
