"use client";
// OWNER: Agent B. Counter-attack plan: actions, target accounts with buyers, email drafts with copy.
import { useState } from "react";
import type { CounterAttackPlan, EmailDraft, LaunchPrediction } from "@/lib/types";
import { ACCENTS, byHeadcountDesc, compactNum } from "./format";
import { CopyButton } from "./CopyButton";
import { ProofQuote } from "./ProofQuote";

function EmailCard({ email }: { email: EmailDraft }) {
  const [open, setOpen] = useState(false);
  const full = `Subject: ${email.subject}\n\n${email.body}`;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm text-zinc-100">
            <span className="font-medium">{email.to.name}</span>
            <span className="text-zinc-400">
              {email.to.title ? ` · ${email.to.title}` : ""} · {email.to.company}
            </span>
          </div>
          <div className="truncate text-xs text-zinc-400">
            <span className="text-zinc-500">Subject:</span> {email.subject}
          </div>
        </button>
        <div className="flex shrink-0 gap-1.5 print:hidden">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">
            {open ? "Hide" : "Read"}
          </button>
          <CopyButton text={full} />
        </div>
      </div>
      {(
        <div className={`border-t border-white/10 px-3 py-3 ${open ? "" : "hidden print:block"}`}>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200">{email.body}</pre>
          {email.to.profileUrl && (
            <a href={email.to.profileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-zinc-400 hover:text-zinc-200">
              View {email.to.name.split(" ")[0]}&apos;s profile ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function PlanSection({
  plan,
  prediction,
  accentIndex,
}: {
  plan: CounterAttackPlan;
  prediction: LaunchPrediction | undefined;
  accentIndex: number;
}) {
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  const allEmails = plan.emails.map((e) => `To: ${e.to.name} (${e.to.company})\nSubject: ${e.subject}\n\n${e.body}`).join("\n\n---\n\n");

  return (
    <article id={`plan-${plan.predictionId}`} className="scroll-mt-6 rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.05] to-zinc-900/60 p-4 sm:p-5">
      <div className="text-xs">
        <span className="font-semibold uppercase tracking-wider text-emerald-300">Counter-attack</span>
        {prediction && (
          <>
            <span className="text-zinc-600"> · </span>
            <span className={accent.text}>{prediction.competitorName}</span>
          </>
        )}
      </div>
      <h3 className="mt-1 text-lg font-semibold text-zinc-50">{prediction?.headline ?? plan.predictionId}</h3>

      {plan.actions.length > 0 && (
        <ol className="mt-4 space-y-2">
          {plan.actions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-zinc-200">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[11px] font-bold text-emerald-300">
                {i + 1}
              </span>
              <span className="leading-relaxed">{a}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Accounts to pitch now <span className="text-zinc-600">({plan.targets.length})</span>
        </div>
        {plan.targets.length === 0 ? (
          <p className="text-sm text-zinc-500">No customer accounts found for this competitor yet.</p>
        ) : (
          // Stacked cards instead of a table: no sideways scrolling at phone width.
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {byHeadcountDesc(plan.targets).map((t) => (
              <li key={t.company.crustdataCompanyId} id={`target-${plan.predictionId}-${t.company.crustdataCompanyId}`} className="scroll-mt-24 px-3 py-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-100">{t.company.name}</div>
                    <div className="text-xs text-zinc-500">
                      {[t.company.domain, t.company.headcount ? `${compactNum(t.company.headcount)} people` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    {t.buyers.length === 0 && <span className="text-xs text-zinc-500">Buyer not found</span>}
                    {t.buyers.slice(0, 2).map((b) => (
                      <div key={b.personId} className="text-zinc-200">
                        {b.profileUrl ? (
                          <a href={b.profileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {b.name}
                          </a>
                        ) : (
                          b.name
                        )}
                        {b.title && <span className="text-xs text-zinc-500"> · {b.title}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 text-zinc-300">{t.whyNow}</div>
                <ProofQuote target={t} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {plan.emails.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Ready-to-send emails <span className="text-zinc-600">({plan.emails.length})</span>
            </div>
            {plan.emails.length > 1 && <CopyButton text={allEmails} label="Copy all" className="print:hidden" />}
          </div>
          <div className="space-y-2">
            {plan.emails.map((e, i) => (
              <EmailCard key={`${e.to.name}-${i}`} email={e} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
