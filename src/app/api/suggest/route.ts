// OWNER: Agent A. GET /api/suggest?q=cashf → { suggestions: string[] } via Company Autocomplete (free).
import { isMockEnv } from "@/lib/crustdata/client";
import { suggestCompanies } from "@/lib/pipeline/resolve";

export const runtime = "nodejs";

const MOCK = ["Acme Payments", "NovaPay", "Zentra", "PayLoom"];

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ suggestions: [] });
  if (isMockEnv()) return Response.json({ suggestions: MOCK.filter((n) => n.toLowerCase().includes(q.toLowerCase())) });
  try {
    return Response.json({ suggestions: await suggestCompanies(q) });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
