"use client";
// OWNER: Agent B.
import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        copied ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" : "border-white/15 text-zinc-300 hover:bg-white/5"
      } ${className}`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
