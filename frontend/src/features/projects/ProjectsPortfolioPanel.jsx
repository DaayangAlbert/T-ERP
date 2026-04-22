import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ProjectsPortfolioPanel({
  t,
  projectItems,
  portfolioCounts,
  loading,
  error,
  selectedProjectId,
  onSelectProject,
  renderStatusBadge,
}) {
  const totalProjects = Math.max(Number(portfolioCounts.total || 0), 1);
  const signalRows = [
    { key: "active", label: t("pages.projects.activeProjects"), value: Number(portfolioCounts.active || 0), className: "bg-emerald-500" },
    { key: "delayed", label: t("pages.projects.delayedProjects"), value: Number(portfolioCounts.delayed || 0), className: "bg-amber-500" },
    { key: "completed", label: t("pages.projects.completedProjects"), value: Number(portfolioCounts.completed || 0), className: "bg-sky-500" },
  ];

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t("pages.projects.portfolio")}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("pages.projects.portfolioSubtitle")}</p>
        </div>
        <Badge variant="info">{projectItems.length}</Badge>
      </div>
      <div className="space-y-2 border-y border-slate-200 py-3">
        {signalRows.map((row) => {
          const percent = Math.round((row.value / totalProjects) * 100);

          return (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${row.className}`} style={{ width: `${Math.min(percent, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {loading && <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.loading")}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && !projectItems.length && <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.noData")}</p>}
      <div className="space-y-2">
        {projectItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectProject(item.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              selectedProjectId === item.id ? "border-primary bg-primary/5" : "border-slate-200 hover:border-secondary/40 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-900">{item.code}</p>
              {renderStatusBadge(item.status)}
            </div>
            <p className="mt-1 text-sm text-slate-700">{item.name}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.location || item.client_name || t("pages.projects.noDescription")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">{t(`enums.projectType.${item.project_type}`)}</p>
              {item.days_remaining != null ? (
                <Badge variant={Number(item.days_remaining) < 0 ? "danger" : "info"}>
                  {t("pages.projects.daysRemaining")}: {item.days_remaining}
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
              {t("pages.projects.openWorkspace")}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
