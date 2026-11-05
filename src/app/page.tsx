"use client";
// OWNER: Agent B. M0 placeholder: proves the /api/spy stream works. Replace with the real UI.
import { useState } from "react";
import type { RunEvent } from "@/lib/types";

export default function Home() {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [running, setRunning] = useState(false);

  async function run() {
    setEvents([]);
    setRunning(true);
    const res = await fetch("/api/spy?mock=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ you: "Acme Payments", competitors: ["NovaPay", "Zentra", "PayLoom"] }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) setEvents((e) => [...e, JSON.parse(line) as RunEvent]);
    }
    setRunning(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Secret Product Spy</h1>
      <p className="mt-2 text-zinc-500">Placeholder: streams the demo fixture from /api/spy.</p>
      <button onClick={run} disabled={running} className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
        {running ? "Running…" : "Run demo"}
      </button>
      <ul className="mt-6 space-y-1 font-mono text-xs">
        {events.map((e, i) => (
          <li key={i}>
            {e.type === "step" ? `${e.status === "done" ? "✓" : "…"} ${e.label}${e.detail ? ` (${e.detail})` : ""}` : `[${e.type}]`}
          </li>
        ))}
      </ul>
    </main>
  );
}
