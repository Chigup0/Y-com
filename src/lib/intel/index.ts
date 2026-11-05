// OWNER: Agent B. Claude-powered intelligence.
// Signatures are the integration contract with Agent A's route. Keep them stable.
// Current bodies are STUBS returning fixture data so the pipeline runs end to end.
import type {
  CompanyRef,
  CompetitorDossier,
  CounterAttackPlan,
  CustomerMention,
  LaunchPrediction,
  TargetAccount,
} from "@/lib/types";
import { demoPlans, demoPredictions } from "@/fixtures/demo-report";

/**
 * Step 5: predict each competitor's next launch from its dossier.
 * Must only cite evidence refs (job id / person id / url) present in `dossiers`.
 * Target: 1–2 predictions per competitor, sorted by confidenceScore desc.
 */
export async function predictLaunches(
  you: CompanyRef,
  dossiers: CompetitorDossier[],
): Promise<LaunchPrediction[]> {
  void you;
  void dossiers;
  return demoPredictions; // TODO(B): Claude call with structured output
}

/**
 * Step 6a: from fetched web pages (case studies, customer pages, press), list companies
 * that are customers of `competitor`. `pages[].text` is visible text (Agent A strips the HTML).
 */
export async function extractCustomers(
  competitor: CompanyRef,
  pages: { url: string; title: string | null; text: string }[],
): Promise<CustomerMention[]> {
  void competitor;
  void pages;
  return []; // TODO(B)
}

/**
 * Step 6b: given a prediction and resolved target accounts (with buyers), write
 * 3–5 actions for `you` and one email per buyer (max ~8 emails).
 */
export async function draftCounterAttack(
  you: CompanyRef,
  prediction: LaunchPrediction,
  targets: TargetAccount[],
): Promise<Pick<CounterAttackPlan, "actions" | "emails">> {
  void you;
  void targets;
  const plan = demoPlans.find((p) => p.predictionId === prediction.id);
  return { actions: plan?.actions ?? [], emails: plan?.emails ?? [] }; // TODO(B)
}
