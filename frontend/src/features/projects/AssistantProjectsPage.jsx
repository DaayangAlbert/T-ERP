import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatAmount(value, language) {
  return new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatProjectDate(value, language) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function SummaryMetric({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function PortfolioList({ items, selectedProjectId, onSelect, language, text }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
            item.id === selectedProjectId
              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-slate-100 dark:text-slate-950"
              : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">{item.code}</p>
              <p className="mt-1 font-semibold">{item.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{Math.round(Number(item.progress_percent || 0))}%</Badge>
              <Badge variant={Number(item.days_remaining) < 0 ? "danger" : "neutral"}>
                {item.days_remaining == null ? text.noEnd : `${item.days_remaining} j`}
              </Badge>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.status}</p>
              <p className="mt-1 text-sm">{String(item.status || "").replaceAll("_", " ") || "--"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.location}</p>
              <p className="mt-1 text-sm">{item.location || "--"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.end}</p>
              <p className="mt-1 text-sm">{formatProjectDate(item.end_date, language)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

const COPY = {
  fr: {
    eyebrow: "Vue administrative projet",
    title: "Projets en lecture utile",
    description:
      "Cette vue est volontairement limitee a l'ensemble du portefeuille, aux depenses, entrees, factures non payees, dettes fournisseurs et coordonnees terrain. Aucun bloc de pilotage projet ou de marche n'est affiche ici.",
    activeProjects: "Projets actifs",
    delayedProjects: "Projets en retard",
    overdueTasks: "Taches en retard",
    consumedBudget: "Budget consomme",
    readOnlyNotice:
      "Espace en lecture seule pour l'assistant administratif: suivi d'ensemble, finance projet, dettes et contacts des travailleurs par chantier.",
    portfolioTitle: "Portefeuille projets",
    portfolioHint: "Classement en liste, sans vues marches ni edition de chantier.",
    loading: "Chargement du portefeuille...",
    noProjectVisible: "Aucun projet visible pour ce profil.",
    alertsTitle: "Alertes portefeuille",
    budgetLabel: "budget",
    overdueTasksLabel: "tache(s) en retard",
    openRisksLabel: "risque(s) ouvert(s)",
    noDescription: "Sans description detaillee.",
    expenses: "Depenses",
    revenues: "Entrees",
    unpaidInvoices: "Factures non payees",
    margin: "Marge",
    workersTitle: "Travailleurs et contacts",
    workersHint: "Liste des affectations visibles sur le chantier, avec le telephone quand il est renseigne.",
    noJobTitle: "Sans poste",
    noPhone: "Telephone non renseigne",
    noResponsibility: "Sans responsabilite detaillee",
    teamFallback: "Equipe",
    noWorker: "Aucun travailleur visible sur ce projet.",
    entriesTitle: "Depenses et entrees deja saisies",
    entriesHint: "Vision administrative recente des flux deja enregistres.",
    noPartner: "Sans partenaire",
    noRecentEntry: "Aucune ecriture recente n'est remontee pour ce projet.",
    debtsTitle: "Factures non payees et dettes",
    debtsHint: "Regroupe les factures client encore ouvertes et les dettes fournisseurs avec coordonnees utiles.",
    issueDate: "Emission",
    dueDate: "Echeance",
    noContact: "Sans contact",
    noDebt: "Aucune facture ouverte ni dette partenaire n'est remontee pour ce projet.",
    selectProject: "Selectionnez un projet pour afficher sa vue d'ensemble administrative.",
    noEnd: "Sans fin",
    status: "Statut",
    location: "Lieu",
    end: "Fin",
  },
  en: {
    eyebrow: "Administrative project view",
    title: "Projects in useful read-only mode",
    description:
      "This view is intentionally limited to the portfolio overview, expenses, revenues, unpaid invoices, supplier debt, and field contact details. No project steering or tender management block is shown here.",
    activeProjects: "Active projects",
    delayedProjects: "Delayed projects",
    overdueTasks: "Overdue tasks",
    consumedBudget: "Budget consumed",
    readOnlyNotice:
      "Read-only space for the administrative assistant: portfolio follow-up, project finance, debt, and worker contacts by site.",
    portfolioTitle: "Project portfolio",
    portfolioHint: "List-based view only, with no tender view and no project editing.",
    loading: "Loading portfolio...",
    noProjectVisible: "No project is visible for this profile.",
    alertsTitle: "Portfolio alerts",
    budgetLabel: "budget",
    overdueTasksLabel: "overdue task(s)",
    openRisksLabel: "open risk(s)",
    noDescription: "No detailed description.",
    expenses: "Expenses",
    revenues: "Revenue",
    unpaidInvoices: "Unpaid invoices",
    margin: "Margin",
    workersTitle: "Workers and contacts",
    workersHint: "Visible project assignments, including phone numbers when available.",
    noJobTitle: "No job title",
    noPhone: "Phone not provided",
    noResponsibility: "No detailed responsibility",
    teamFallback: "Team",
    noWorker: "No worker is visible on this project.",
    entriesTitle: "Recorded expenses and revenue",
    entriesHint: "Recent administrative view of flows already recorded.",
    noPartner: "No partner",
    noRecentEntry: "No recent entry is available for this project.",
    debtsTitle: "Unpaid invoices and debt",
    debtsHint: "Groups open client invoices and supplier debt with useful contact details.",
    issueDate: "Issued",
    dueDate: "Due",
    noContact: "No contact",
    noDebt: "No open invoice or partner debt is available for this project.",
    selectProject: "Select a project to display its administrative overview.",
    noEnd: "No end",
    status: "Status",
    location: "Location",
    end: "End",
  },
};

export function AssistantProjectsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const { data: dashboardData, loading: loadingDashboard } = useApiQuery("/projects/dashboard");
  const { data: projectsData, loading: loadingProjects, error: projectsError } = useApiQuery("/projects");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const workspaceQuery = useApiQuery(selectedProjectId ? `/projects/${selectedProjectId}/workspace` : "/projects/0/workspace", {
    enabled: Boolean(selectedProjectId),
  });

  const projectItems = projectsData?.items || [];
  const selectedWorkspace = workspaceQuery.data;
  const assignmentItems = selectedWorkspace?.assignments?.items || [];
  const finance = selectedWorkspace?.finance || {};

  const dashboardItems = useMemo(() => dashboardData?.items || [], [dashboardData?.items]);

  useEffect(() => {
    if (!projectItems.length) {
      setSelectedProjectId(null);
      return;
    }
    if (!selectedProjectId || !projectItems.some((item) => item.id === selectedProjectId)) {
      setSelectedProjectId(projectItems[0].id);
    }
  }, [projectItems, selectedProjectId]);

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(226,232,240,0.95))] text-slate-950 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:text-white">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">{text.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{text.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{text.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryMetric label={text.activeProjects} value={dashboardData?.counts?.active_projects ?? 0} tone="text-sky-700 dark:text-sky-300" />
            <SummaryMetric label={text.delayedProjects} value={dashboardData?.counts?.delayed_projects ?? 0} tone="text-amber-700 dark:text-amber-300" />
            <SummaryMetric label={text.overdueTasks} value={dashboardData?.counts?.overdue_tasks ?? 0} tone="text-rose-700 dark:text-rose-300" />
            <SummaryMetric label={text.consumedBudget} value={`${Math.round(Number(dashboardData?.financials?.budget_consumed_percent || 0))}%`} tone="text-slate-900 dark:text-white" />
          </div>
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">{text.readOnlyNotice}</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.portfolioTitle}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{text.portfolioHint}</p>
          </div>
          {(loadingProjects || loadingDashboard) && <p className="text-sm text-slate-500">{text.loading}</p>}
          {projectsError && <p className="text-sm text-rose-600">{projectsError}</p>}
          {!loadingProjects && !projectItems.length && <p className="text-sm text-slate-500">{text.noProjectVisible}</p>}
          {!!projectItems.length && (
            <PortfolioList items={projectItems} selectedProjectId={selectedProjectId} onSelect={setSelectedProjectId} language={i18n.language} text={text} />
          )}

          {!!dashboardItems.length && (
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{text.alertsTitle}</h4>
              {dashboardItems.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                    <Badge variant={item.budget_consumed_percent > 100 ? "danger" : "neutral"}>
                      {Math.round(Number(item.budget_consumed_percent || 0))}% {text.budgetLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {item.overdue_tasks || 0} {text.overdueTasksLabel}, {item.open_risks || 0} {text.openRisksLabel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {selectedWorkspace?.project ? (
            <>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{selectedWorkspace.project.code}</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{selectedWorkspace.project.name}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{selectedWorkspace.project.description || text.noDescription}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{Math.round(Number(selectedWorkspace.project.progress_percent || 0))}%</Badge>
                    <Badge variant="neutral">{String(selectedWorkspace.project.status || "").replaceAll("_", " ")}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryMetric label={text.expenses} value={formatAmount(finance.expenses, i18n.language)} tone="text-rose-700 dark:text-rose-300" />
                  <SummaryMetric label={text.revenues} value={formatAmount(finance.revenues, i18n.language)} tone="text-emerald-700 dark:text-emerald-300" />
                  <SummaryMetric label={text.unpaidInvoices} value={formatAmount(finance.outstanding, i18n.language)} tone="text-amber-700 dark:text-amber-300" />
                  <SummaryMetric label={text.margin} value={formatAmount(finance.margin, i18n.language)} tone="text-sky-700 dark:text-sky-300" />
                </div>
              </Card>

              <Card className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.workersTitle}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{text.workersHint}</p>
                </div>
                <div className="space-y-3">
                  {assignmentItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 dark:text-white">{item.user?.full_name || `#${item.user_id}`}</p>
                        <Badge variant={item.is_active ? "success" : "neutral"}>{item.project_role || text.teamFallback}</Badge>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{item.user?.job_title || text.noJobTitle}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{item.user?.phone || text.noPhone}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{item.responsibility || text.noResponsibility}</p>
                      </div>
                    </div>
                  ))}
                  {!assignmentItems.length && <p className="text-sm text-slate-500">{text.noWorker}</p>}
                </div>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.entriesTitle}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{text.entriesHint}</p>
                  </div>
                  <div className="space-y-3">
                    {(finance.expense_items || []).map((item) => (
                      <div key={`expense-${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{item.expense_number}</p>
                          <Badge variant={item.outstanding_amount > 0 ? "warning" : "success"}>{formatAmount(item.amount, i18n.language)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.category} - {formatProjectDate(item.expense_date, i18n.language)}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.partner_name || text.noPartner}{item.partner_phone ? ` - ${item.partner_phone}` : ""}</p>
                      </div>
                    ))}
                    {(finance.revenue_items || []).map((item) => (
                      <div key={`revenue-${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{item.revenue_number}</p>
                          <Badge variant="info">{formatAmount(item.amount, i18n.language)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.revenue_type} - {formatProjectDate(item.revenue_date, i18n.language)}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.partner_name || text.noPartner}{item.partner_phone ? ` - ${item.partner_phone}` : ""}</p>
                      </div>
                    ))}
                    {!(finance.expense_items || []).length && !(finance.revenue_items || []).length && (
                      <p className="text-sm text-slate-500">{text.noRecentEntry}</p>
                    )}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.debtsTitle}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{text.debtsHint}</p>
                  </div>
                  <div className="space-y-3">
                    {(finance.unpaid_invoice_items || []).map((item) => (
                      <div key={`invoice-${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{item.invoice_number}</p>
                          <Badge variant="warning">{formatAmount(item.balance_amount, i18n.language)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.customer_name}</p>
                        <p className="mt-1 text-sm text-slate-500">{text.issueDate} {formatProjectDate(item.issued_on, i18n.language)} - {text.dueDate} {formatProjectDate(item.due_on, i18n.language)}</p>
                      </div>
                    ))}
                    {(finance.debt_items || []).map((item) => (
                      <div key={`debt-${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{item.partner_name || item.expense_number}</p>
                          <Badge variant="danger">{formatAmount(item.outstanding_amount, i18n.language)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.expense_number} - {item.category}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.partner_contact_name || text.noContact}{item.partner_phone ? ` - ${item.partner_phone}` : ""}</p>
                      </div>
                    ))}
                    {!(finance.unpaid_invoice_items || []).length && !(finance.debt_items || []).length && (
                      <p className="text-sm text-slate-500">{text.noDebt}</p>
                    )}
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <p className="text-sm text-slate-500">{text.selectProject}</p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
