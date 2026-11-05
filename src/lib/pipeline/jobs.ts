// OWNER: Agent A. Step 2: hiring intent via Job Search (+ aggregations).
import { and, cond, crustdata, daysAgo, type CreditMeter } from "@/lib/crustdata/client";
import type { Bucket, CompanyRef, HiringStats, JobPosting } from "@/lib/types";

/** Skip company boilerplate: start the snippet where the role itself is described. */
function roleSnippet(desc: string | null | undefined, max = 600): string | null {
  if (!desc) return null;
  const text = desc.replace(/\s+/g, " ").trim();
  const m = text.search(/(about the role|the role|role overview|responsibilit|you will|you'll|what you.ll do|we are looking|we're looking|job description|key result)/i);
  const start = m > 0 ? m : 0;
  return text.slice(start, start + max);
}

const buckets = (aggs: any[] | undefined, field: string): Bucket[] =>
  (aggs?.find((a) => a.type === "group_by" && a.field === field)?.buckets ?? [])
    .filter((b: any) => b.key)
    .map((b: any) => ({ key: String(b.key), count: Number(b.count) || 0 }));

export async function collectJobs(
  company: CompanyRef,
  lookbackDays: number,
  meter: CreditMeter,
  limit = 100,
): Promise<{ jobs: JobPosting[]; hiring: HiringStats }> {
  const filters = and(
    cond("company.basic_info.company_id", "=", company.crustdataCompanyId),
    cond("metadata.date_added", "=>", daysAgo(lookbackDays)),
  );
  const { data } = await crustdata<any>(
    "/job/search",
    {
      filters,
      sorts: [{ field: "metadata.date_added", order: "desc" }],
      limit,
      fields: ["crustdata_job_id", "job_details", "location", "metadata", "content.description"],
      aggregations: [
        { type: "count" },
        { type: "group_by", field: "job_details.category", agg: "count", size: 12 },
        { type: "group_by", field: "location.country", agg: "count", size: 10 },
        { type: "group_by", field: "job_details.title", agg: "count", size: 15 },
      ],
    },
    { meter },
  );

  const jobs: JobPosting[] = (data.job_listings ?? []).map((j: any) => ({
    id: Number(j.crustdata_job_id ?? j.job_details?.job_id),
    title: j.job_details?.title ?? "Untitled role",
    category: j.job_details?.category ?? null,
    location: j.location?.raw ?? null,
    country: j.location?.country ?? null,
    workplaceType: j.job_details?.workplace_type ?? null,
    postedAt: String(j.metadata?.date_added ?? "").slice(0, 10),
    url: j.job_details?.url ?? null,
    descriptionSnippet: roleSnippet(j.content?.description),
  }));

  const countAgg = data.aggregations?.find((a: any) => a.type === "count")?.value;
  return {
    jobs,
    hiring: {
      totalOpenings: Number(countAgg ?? data.total_count ?? jobs.length) || jobs.length,
      byCategory: buckets(data.aggregations, "job_details.category"),
      byCountry: buckets(data.aggregations, "location.country"),
      topTitles: buckets(data.aggregations, "job_details.title"),
    },
  };
}
