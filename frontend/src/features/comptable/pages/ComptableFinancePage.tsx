import { ArrowDownCircle, ArrowUpCircle, FileText, LayoutDashboard, Paperclip, WalletCards } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComptableChartCard } from "@/features/comptable/components/ComptableChartCard";
import { ComptableDataTable } from "@/features/comptable/components/ComptableDataTable";
import { ComptableHero } from "@/features/comptable/components/ComptableHero";
import { ComptableMobileNav } from "@/features/comptable/components/ComptableMobileNav";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { FinanceComposer } from "@/features/comptable/components/FinanceComposer";
import { PayslipLibrary } from "@/features/comptable/components/PayslipLibrary";
import { comptableProjectPill, comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import { useComptableWorkspace } from "@/features/comptable/hooks/useComptableWorkspace";

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

const sectionItems = [
  { id: "dashboard", label: "Vue finance", icon: LayoutDashboard },
  { id: "expenses", label: "Depenses", icon: ArrowDownCircle },
  { id: "revenues", label: "Recettes", icon: ArrowUpCircle },
  { id: "payments", label: "Paiements", icon: WalletCards },
  { id: "payslips", label: "Bulletins", icon: FileText },
  { id: "proofs", label: "Justificatifs", icon: Paperclip },
] as const;

export function ComptableFinancePage() {
  const workspace = useComptableWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("section") || "dashboard";
  const scopedExpenses = workspace.scopedTransactions.filter((record) => record.type === "expense");
  const scopedRevenues = workspace.scopedTransactions.filter((record) => record.type === "revenue");
  const scopedPayments = workspace.scopedTransactions.filter((record) => record.type === "payment");

  const openSection = (nextSection: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("section", nextSection);
      return next;
    });
  };

  return (
    <div className={comptableTheme.page}>
      <ComptableHero
        eyebrow="Module finance"
        title="Finance restructuree pour le comptable"
        description="Le module est redecoupe en depenses, recettes, paiements, bulletins et justificatifs. Chaque saisie garde sa preuve et son lien projet."
        stats={[
          { label: "Depenses", value: String(scopedExpenses.length) },
          { label: "Recettes", value: String(scopedRevenues.length) },
          { label: "Paiements", value: String(scopedPayments.length) },
          { label: "Justificatifs", value: String(workspace.workspace.proofs.length) },
        ]}
        sideContent={
          <Card className={`${comptableTheme.insetPanel} space-y-3 shadow-none`}>
            <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>Projet actif</p>
            <p className={`text-xl font-semibold ${comptableTheme.primaryText}`}>{workspace.selectedProject?.name || "Tous les projets"}</p>
            <p className={`text-sm ${comptableTheme.secondaryText}`}>Les formulaires et historiques sont automatiquement limites au projet selectionne.</p>
          </Card>
        }
      />

      <div className="flex flex-wrap gap-2">
        {workspace.workspace.projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => workspace.actions.setSelectedProjectId(project.id)}
            className={comptableProjectPill(workspace.selectedProject?.id === project.id)}
          >
            {project.code} - {project.name}
          </button>
        ))}
      </div>

      <ComptableMobileNav
        items={sectionItems.map((item) => ({
          ...item,
          count:
            item.id === "expenses"
              ? scopedExpenses.length
              : item.id === "revenues"
                ? scopedRevenues.length
                : item.id === "payments"
                  ? scopedPayments.length
                  : item.id === "payslips"
                    ? workspace.scopedPayslips.length
                    : item.id === "proofs"
                      ? workspace.workspace.proofs.length
                      : undefined,
        }))}
        activeId={section}
        onChange={openSection}
      />

      {section === "dashboard" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className={`${comptableTonePanel("info")} space-y-2`}>
              <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Solde projet</p>
              <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.selectedProject?.availableCash || 0)}</p>
              <p className={`text-sm ${comptableTheme.secondaryText}`}>Tresorerie disponible sur le projet actif.</p>
            </Card>
            <Card className={`${comptableTonePanel("neutral")} space-y-2`}>
              <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Budget</p>
              <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.selectedProject?.budget || 0)}</p>
              <p className={`text-sm ${comptableTheme.secondaryText}`}>Budget global du chantier rattache.</p>
            </Card>
            <Card className={`${comptableTonePanel("warning")} space-y-2`}>
              <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Montant depense</p>
              <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.selectedProject?.spent || 0)}</p>
              <p className={`text-sm ${comptableTheme.secondaryText}`}>Flux sortants engages sur le projet.</p>
            </Card>
            <Card className={`${comptableTonePanel("success")} space-y-2`}>
              <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Montant recu</p>
              <p className={`text-2xl font-semibold ${comptableTheme.primaryText}`}>{formatMoney(workspace.selectedProject?.received || 0)}</p>
              <p className={`text-sm ${comptableTheme.secondaryText}`}>Recettes et paiements clients consolides.</p>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <ComptableChartCard
              eyebrow="Separations metier"
              title="Plan de lecture du module"
              description="Chaque zone a une fonction claire pour accelerer la saisie et les controles."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "Depenses", helper: "Sorties d'argent et charges projet", tone: "warning" },
                  { label: "Recettes", helper: "Encaissements et produits", tone: "success" },
                  { label: "Paiements", helper: "Salaires, avances et reglements", tone: "info" },
                  { label: "Bulletins", helper: "Acces par mois, projet et employe", tone: "neutral" },
                  { label: "Justificatifs", helper: "Preuves obligatoires et consultables", tone: "danger" },
                ].map((item) => (
                  <div key={item.label} className={comptableTonePanel(item.tone as "warning" | "success" | "neutral" | "danger" | "info")}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${comptableTheme.primaryText}`}>{item.label}</p>
                      <Badge variant={item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : item.tone === "danger" ? "danger" : item.tone === "info" ? "info" : "neutral"}>
                        Actif
                      </Badge>
                    </div>
                    <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>{item.helper}</p>
                  </div>
                ))}
              </div>
            </ComptableChartCard>

            <Card className={`${comptableTheme.strongPanel} space-y-4`}>
              <ComptableSection
                eyebrow="Activite recente"
                title="Derniers flux"
                description="Lecture instantanee des derniers mouvements financiers du projet."
              />
              <ComptableDataTable
                rows={workspace.scopedTransactions.slice(0, 5)}
                emptyText="Aucun flux sur ce projet."
                columns={[
                  {
                    key: "title",
                    header: "Operation",
                    render: (row) => (
                      <div>
                        <p className={`font-medium ${comptableTheme.primaryText}`}>{row.title}</p>
                        <p className={`text-xs ${comptableTheme.subtleText}`}>{row.counterparty}</p>
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    render: (row) => <Badge variant={row.type === "expense" ? "warning" : row.type === "revenue" ? "success" : "info"}>{row.type}</Badge>,
                  },
                  { key: "amount", header: "Montant", render: (row) => formatMoney(row.amount) },
                  { key: "proof", header: "Preuve", render: (row) => `${row.proofIds.length} fichier(s)` },
                ]}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {section === "expenses" ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className={comptableTheme.strongPanel}>
            <FinanceComposer type="expense" projects={workspace.workspace.projects} defaultProjectId={workspace.selectedProject?.id} onSubmit={workspace.actions.createTransaction} />
          </Card>
          <Card className={`${comptableTheme.strongPanel} space-y-4`}>
            <ComptableSection eyebrow="Historique" title="Depenses par projet" description="Chaque depense est rattachee a un projet et a son justificatif." badgeLabel={scopedExpenses.length} badgeVariant="warning" />
            <ComptableDataTable
              rows={scopedExpenses}
              emptyText="Aucune depense enregistree."
              columns={[
                {
                    key: "title",
                    header: "Depense",
                    render: (row) => (
                      <div>
                        <p className={`font-medium ${comptableTheme.primaryText}`}>{row.title}</p>
                        <p className={`text-xs ${comptableTheme.subtleText}`}>{row.category}</p>
                      </div>
                    ),
                  },
                { key: "counterparty", header: "Beneficiaire", render: (row) => row.counterparty },
                { key: "amount", header: "Montant", render: (row) => formatMoney(row.amount) },
                { key: "date", header: "Date", render: (row) => formatDate(row.date) },
                { key: "proofs", header: "Preuve", render: (row) => `${row.proofIds.length} justificatif(s)` },
              ]}
            />
          </Card>
        </div>
      ) : null}

      {section === "revenues" ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className={comptableTheme.strongPanel}>
            <FinanceComposer type="revenue" projects={workspace.workspace.projects} defaultProjectId={workspace.selectedProject?.id} onSubmit={workspace.actions.createTransaction} />
          </Card>
          <Card className={`${comptableTheme.strongPanel} space-y-4`}>
            <ComptableSection eyebrow="Historique" title="Recettes par projet" description="Recettes rattachees au projet actif et tracees avec preuve." badgeLabel={scopedRevenues.length} badgeVariant="success" />
            <ComptableDataTable
              rows={scopedRevenues}
              emptyText="Aucune recette enregistree."
              columns={[
                {
                    key: "title",
                    header: "Recette",
                    render: (row) => (
                      <div>
                        <p className={`font-medium ${comptableTheme.primaryText}`}>{row.title}</p>
                        <p className={`text-xs ${comptableTheme.subtleText}`}>{row.category}</p>
                      </div>
                    ),
                  },
                { key: "counterparty", header: "Client / source", render: (row) => row.counterparty },
                { key: "amount", header: "Montant", render: (row) => formatMoney(row.amount) },
                { key: "date", header: "Date", render: (row) => formatDate(row.date) },
                { key: "proofs", header: "Preuve", render: (row) => `${row.proofIds.length} justificatif(s)` },
              ]}
            />
          </Card>
        </div>
      ) : null}

      {section === "payments" ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className={comptableTheme.strongPanel}>
            <FinanceComposer type="payment" projects={workspace.workspace.projects} payslips={workspace.scopedPayslips} defaultProjectId={workspace.selectedProject?.id} onSubmit={workspace.actions.createTransaction} />
          </Card>
          <Card className={`${comptableTheme.strongPanel} space-y-4`}>
            <ComptableSection eyebrow="Historique" title="Paiements et avances" description="Suivi des paiements de salaires, avances et reglements rattaches au projet." badgeLabel={scopedPayments.length} badgeVariant="info" />
            <ComptableDataTable
              rows={scopedPayments}
              emptyText="Aucun paiement enregistre."
              columns={[
                {
                    key: "title",
                    header: "Paiement",
                    render: (row) => (
                      <div>
                        <p className={`font-medium ${comptableTheme.primaryText}`}>{row.title}</p>
                        <p className={`text-xs ${comptableTheme.subtleText}`}>{row.counterparty}</p>
                      </div>
                    ),
                  },
                { key: "category", header: "Categorie", render: (row) => row.category },
                { key: "amount", header: "Montant", render: (row) => formatMoney(row.amount) },
                { key: "link", header: "Bulletin", render: (row) => row.linkedPayslipId || "Non lie" },
                { key: "proofs", header: "Preuve", render: (row) => `${row.proofIds.length} justificatif(s)` },
              ]}
            />
          </Card>
        </div>
      ) : null}

      {section === "payslips" ? (
        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection eyebrow="Bulletins" title="Bibliotheque de bulletins dans la finance" description="Classement par mois, projet et employe avec acces rapide a l'historique." />
          <PayslipLibrary payslips={workspace.workspace.payslips} proofsById={workspace.proofsById} projects={workspace.workspace.projects} workers={workspace.workspace.workers} />
        </Card>
      ) : null}

      {section === "proofs" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.workspace.proofs.map((proof) => (
            <Card key={proof.id} className={`${comptableTonePanel(proof.kind === "invoice" ? "warning" : proof.kind === "receipt" ? "info" : proof.kind === "payslip" ? "success" : "neutral")} space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-semibold ${comptableTheme.primaryText}`}>{proof.name}</p>
                  <p className={`text-sm ${comptableTheme.secondaryText}`}>{proof.kind}</p>
                </div>
                <Badge variant="neutral">{proof.sizeLabel}</Badge>
              </div>
              <div className={`grid gap-2 text-sm ${comptableTheme.secondaryText}`}>
                <p>Ajoute le {formatDate(proof.uploadedAt)}</p>
                <p>Par {proof.uploadedBy}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
