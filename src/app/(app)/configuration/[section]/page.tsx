"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTenantConfig } from "@/hooks/useConfig";
import { CONFIG_SECTIONS, type IdentitySettings, type ModulesSettings, type PayrollRatesSettings, type WorkflowSettings } from "@/lib/tenant-settings";
import { IdentityForm } from "@/components/config/IdentityForm";
import { ModulesGrid } from "@/components/config/ModulesGrid";
import { PayrollRatesEditor } from "@/components/config/PayrollRatesEditor";
import { WorkflowEditor } from "@/components/config/WorkflowEditor";

interface Props {
  params: { section: string };
}

export default function ConfigSectionPage({ params }: Props) {
  const { data, isLoading, isError, error } = useTenantConfig();
  const section = CONFIG_SECTIONS.find((s) => s.key === params.section);

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  if (!section) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 text-center text-[13px] text-ink-3">
        Section inconnue.
      </div>
    );
  }

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link
          href="/configuration"
          className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour configuration
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">{section.label}</h1>
      </header>

      {!section.v1 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center">
          <h2 className="text-base font-semibold text-ink">Section disponible en V2</h2>
          <p className="mt-2 text-[13px] text-ink-3">
            Cette section sera livrée dans une version ultérieure. Les paramètres par défaut sont déjà
            appliqués au runtime.
          </p>
        </div>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : params.section === "entreprise" ? (
        <IdentityForm initial={data.identity as IdentitySettings} />
      ) : params.section === "modules" ? (
        <ModulesGrid initial={data.modules as ModulesSettings} />
      ) : params.section === "paie" ? (
        <PayrollRatesEditor initial={data.payrollRates as PayrollRatesSettings} />
      ) : params.section === "workflows" ? (
        <WorkflowEditor initial={data.workflows as WorkflowSettings} />
      ) : null}
    </>
  );
}
