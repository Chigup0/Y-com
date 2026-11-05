// OWNER: Agent A. Step 4: recent news (Web Search) + read the top article (Web Fetch).
import { crustdata, htmlToText, type CreditMeter } from "@/lib/crustdata/client";
import type { CompanyRef, NewsItem } from "@/lib/types";

export async function collectNews(
  company: CompanyRef,
  lookbackDays: number,
  meter: CreditMeter,
  fetchTop = 1,
): Promise<NewsItem[]> {
  // Round to the day so the request body (and so the disk cache key) is stable within a day.
  const now = Math.floor(Date.now() / 86_400_000) * 86_400;
  const { data } = await crustdata<any>(
    "/web/search/live",
    {
      query: `"${company.name}" launch OR expands OR partnership OR hiring OR new product`,
      sources: ["news"],
      start_date: now - lookbackDays * 86_400,
      end_date: now,
    },
    { meter },
  );

  const items: NewsItem[] = (data.results ?? [])
    .filter((r: any) => r.url && r.title)
    .slice(0, 6)
    .map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet ?? null,
      source: r.source === "social" ? "social" : r.source === "web" ? "web" : "news",
      publishedAt: r.date ?? r.published_at ?? null,
    }));

  const toFetch = items.slice(0, fetchTop);
  if (toFetch.length) {
    try {
      const { data: pages } = await crustdata<any[]>("/web/enrich/live", { urls: toFetch.map((i) => i.url) }, { meter });
      for (const page of pages ?? []) {
        const item = items.find((i) => i.url === page.url);
        if (item && page.success && page.content) item.excerpt = htmlToText(page.content, 2500);
      }
    } catch {
      // Fetch is best-effort; snippets are enough.
    }
  }
  return items;
}
