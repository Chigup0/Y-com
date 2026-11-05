// OWNER: Agent A. Step 3: who just joined (People Search) + deep profiles for key hires (Person Enrichment).
import { and, cond, crustdata, CrustdataError, daysAgo, type CreditMeter } from "@/lib/crustdata/client";
import type { CompanyRef, Hire } from "@/lib/types";

const SENIOR = /(cxo|chief|vp|vice president|director|head|partner|owner|founder|senior|principal|lead|manager)/i;

function toHire(p: any, companyId: number): Hire {
  const current: any[] = p.experience?.employment_details?.current ?? [];
  const past: any[] = p.experience?.employment_details?.past ?? [];
  const role = current.find((r) => r.crustdata_company_id === companyId) ?? current[0] ?? {};
  const prev = [...past]
    .sort((a, b) => String(b.start_date ?? "").localeCompare(String(a.start_date ?? "")))
    .map((r) => r.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  return {
    personId: Number(p.crustdata_person_id),
    name: p.basic_profile?.name ?? "Unknown",
    title: role.title ?? p.basic_profile?.current_title ?? null,
    startDate: role.start_date ? String(role.start_date).slice(0, 10) : null,
    location: p.basic_profile?.location?.full_location ?? p.basic_profile?.location?.raw ?? role.location?.raw ?? null,
    seniority: role.seniority_level || null,
    function: role.function_category || p.basic_profile?.normalized_title?.department || null,
    profileUrl: p.social_handles?.professional_network_identifier?.profile_url ?? null,
    headline: p.basic_profile?.headline ?? null,
    skills: (p.skills?.professional_network_skills ?? []).slice(0, 25),
    previousCompanies: [...new Set(prev)].slice(0, 6),
    enriched: false,
  };
}

export async function collectHires(
  company: CompanyRef,
  lookbackDays: number,
  meter: CreditMeter,
  limit = 40,
): Promise<{ hires: Hire[]; total: number }> {
  const filters = and(
    cond("experience.employment_details.current.company_id", "=", company.crustdataCompanyId),
    cond("experience.employment_details.current.start_date", "=>", daysAgo(lookbackDays)),
  );
  const body = (fields: string[]) => ({ filters, limit, fields });
  let data: any;
  try {
    ({ data } = await crustdata<any>("/person/search", body(["crustdata_person_id", "basic_profile", "experience", "skills", "social_handles"]), { meter }));
  } catch (e) {
    // Skills is an account-gated field; retry without it.
    if (e instanceof CrustdataError && e.status === 403) {
      ({ data } = await crustdata<any>("/person/search", body(["crustdata_person_id", "basic_profile", "experience", "social_handles"]), { meter }));
    } else throw e;
  }
  const hires = (data.profiles ?? []).map((p: any) => toHire(p, company.crustdataCompanyId));
  // Most senior and most recent first.
  hires.sort((a: Hire, b: Hire) => {
    const s = Number(SENIOR.test(b.seniority ?? b.title ?? "")) - Number(SENIOR.test(a.seniority ?? a.title ?? ""));
    return s || String(b.startDate ?? "").localeCompare(String(a.startDate ?? ""));
  });
  return { hires, total: Number(data.total_count ?? hires.length) };
}

/** Person Enrichment on the top `n` senior hires that have a profile URL. Mutates and returns the list. */
export async function enrichKeyHires(hires: Hire[], companyId: number, meter: CreditMeter, n = 3): Promise<number> {
  const picks = hires.filter((h) => h.profileUrl && SENIOR.test(`${h.seniority ?? ""} ${h.title ?? ""}`)).slice(0, n);
  if (!picks.length) return 0;
  const { data } = await crustdata<any[]>(
    "/person/enrich",
    {
      professional_network_profile_urls: picks.map((h) => h.profileUrl),
      fields: ["basic_profile", "experience", "skills", "social_handles"],
    },
    { meter },
  );
  let count = 0;
  for (const item of data ?? []) {
    const person = item?.matches?.[0]?.person_data;
    if (!person) continue;
    const url = person.social_handles?.professional_network_identifier?.profile_url ?? item.matched_on;
    const target = picks.find((h) => h.profileUrl === url || h.profileUrl === item.matched_on);
    if (!target) continue;
    const full = toHire({ ...person, crustdata_person_id: target.personId }, companyId);
    target.skills = full.skills.length ? full.skills : target.skills;
    target.previousCompanies = full.previousCompanies.length ? full.previousCompanies : target.previousCompanies;
    target.headline = full.headline ?? target.headline;
    target.enriched = true;
    count++;
  }
  return count;
}
