"use client";

import { Check, AlertCircle } from "lucide-react";
import { useClosure, useValidateClosureStep } from "@/hooks/useAccounting";
import { clsx } from "clsx";

interface Props {
  year: number;
}

const STEPS = [
  { key: "pnl" as const, label: "Revue P&L", description: "Examiner les grandes masses du compte de résultat" },
  { key: "balance" as const, label: "Revue Bilan", description: "Examiner actif / passif et ratios financiers" },
  { key: "adjustments" as const, label: "Ajustements expert-comptable", description: "Valider les écritures d'OD proposées" },
  { key: "draft" as const, label: "Projet d'états financiers", description: "Générer le projet pour relecture" },
  { key: "validate" as const, label: "Validation DG pour AG", description: "Approbation finale en vue de l'Assemblée Générale" },
  { key: "submit" as const, label: "Transmission DGI", description: "Dépôt de la liasse fiscale (DSF) à la DGI" },
];

export function AnnualClosureWizard({ year }: Props) {
  const { data, isLoading } = useClosure(year);
  const validate = useValidateClosureStep(year);

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const stepDone: Record<string, boolean> = {
    pnl: data.pnlValidated,
    balance: data.balanceValidated,
    adjustments: data.adjustmentsValidated,
    draft: data.draftGenerated,
    validate: data.status === "VALIDATED" || data.status === "SUBMITTED",
    submit: data.submittedToDgi,
  };

  const currentStepIdx = STEPS.findIndex((s) => !stepDone[s.key]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-primary-800">
          Clôture annuelle exercice {year}
        </h2>
        <p className="mt-1 text-[12.5px] text-primary-700">
          Workflow en {STEPS.length} étapes pour valider les comptes et transmettre la liasse DSF à la DGI.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11.5px]">
          <span className={clsx("rounded px-2 py-0.5 font-semibold", data.status === "VALIDATED" ? "bg-success/10 text-success" : data.status === "SUBMITTED" ? "bg-info/10 text-info" : "bg-warning/10 text-warning")}>
            {data.status}
          </span>
          {data.dgValidatedAt && (
            <span className="text-ink-3">Validé DG le {new Date(data.dgValidatedAt).toLocaleDateString("fr-FR")}</span>
          )}
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const done = stepDone[s.key];
          const active = !done && i === currentStepIdx;
          const blocked = !done && i > currentStepIdx;
          return (
            <li
              key={s.key}
              className={clsx(
                "rounded-xl border p-4 transition",
                done && "border-success/30 bg-success/5",
                active && "border-primary-300 bg-primary-50/40",
                blocked && "border-line bg-surface-alt opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold",
                    done && "bg-success text-white",
                    active && "bg-primary-500 text-white",
                    blocked && "bg-ink-3/15 text-ink-3"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-ink">{s.label}</h3>
                  <p className="mt-0.5 text-[12px] text-ink-3">{s.description}</p>
                </div>
                {!done && active && (
                  <button
                    type="button"
                    onClick={() => validate.mutate(s.key)}
                    disabled={validate.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
                  >
                    {validate.isPending ? "…" : "Valider l'étape"}
                  </button>
                )}
                {done && <span className="text-[11.5px] font-semibold text-success">✓ Validée</span>}
              </div>
            </li>
          );
        })}
      </ol>

      {data.status === "VALIDATED" && !data.submittedToDgi && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-[12.5px] text-info">
          <AlertCircle className="mr-1 inline h-4 w-4" />
          Comptes validés DG. Procédez à la transmission DGI via l'étape 6.
        </div>
      )}
    </div>
  );
}
