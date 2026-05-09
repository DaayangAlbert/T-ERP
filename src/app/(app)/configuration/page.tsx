"use client";

import { Building2, Grid3x3, BookOpen, Calculator, GitBranch, Bell, Tag, Plug } from "lucide-react";
import { ConfigCard } from "@/components/config/ConfigCard";
import { CONFIG_SECTIONS } from "@/lib/tenant-settings";

const ICONS: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-4 w-4" />,
  Grid3x3: <Grid3x3 className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  Calculator: <Calculator className="h-4 w-4" />,
  GitBranch: <GitBranch className="h-4 w-4" />,
  Bell: <Bell className="h-4 w-4" />,
  Tag: <Tag className="h-4 w-4" />,
  Plug: <Plug className="h-4 w-4" />,
};

const DESCRIPTIONS: Record<string, string> = {
  entreprise: "Raison sociale, NIU, siège, représentants légaux, comptes bancaires, plan T-ERP.",
  modules: "Activer ou désactiver les 19 modules. Les modules essentiels sont protégés.",
  comptable: "Plan comptable SYSCOHADA, sous-comptes personnalisés, import/export.",
  paie: "Barèmes IRPP, taux CNPS/CFC/FNE/RAV/TC/CAC, codes paie, périodicité.",
  workflows: "Seuils par type de demande, niveaux de validation, simulation.",
  notifications: "Matrice destinataires × événements × canaux + templates emails.",
  referentiels: "Catégories, postes, départements, types de chantiers, tiers.",
  integrations: "Banques, CNPS, MoMo, Resend, stockage S3 — clés API chiffrées.",
};

export default function ConfigurationPage() {
  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink">Configuration entreprise</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Paramètres du tenant : identité, modules, paie, workflows, intégrations.
          Toutes les modifications sont tracées dans l'audit log.
        </p>
      </header>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-[12px] text-warning mb-5">
        <strong>V1 fonctionnelle :</strong> sections 1, 2, 4, 5 actives.
        Sections 3 (plan comptable), 6 (notifications), 7 (référentiels), 8 (intégrations) en V2.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CONFIG_SECTIONS.map((s) => (
          <ConfigCard
            key={s.key}
            href={`/configuration/${s.key}`}
            title={s.label}
            description={DESCRIPTIONS[s.key] ?? ""}
            icon={ICONS[s.icon] ?? <Building2 className="h-4 w-4" />}
            v1={s.v1}
          />
        ))}
      </div>
    </>
  );
}
