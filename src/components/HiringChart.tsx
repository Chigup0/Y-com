"use client";
// OWNER: Agent B. Horizontal bar chart for hiring buckets (by category / country).
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bucket } from "@/lib/types";

export function HiringChart({ title, data, color, max = 6 }: { title: string; data: Bucket[]; color: string; max?: number }) {
  const rows = [...data].sort((a, b) => b.count - a.count).slice(0, max);
  if (rows.length === 0) return null;
  const height = rows.length * 26 + 8;

  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={5}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="key"
              width={118}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#e4e4e7" }}
              itemStyle={{ color: "#e4e4e7" }}
              formatter={(v: number) => [v, "openings"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#a1a1aa", fontSize: 11 }} isAnimationActive={false}>
              {rows.map((r, i) => (
                <Cell key={r.key} fill={color} fillOpacity={1 - i * 0.12} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
