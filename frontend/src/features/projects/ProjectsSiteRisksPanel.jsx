import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectActionDialog } from "@/features/projects/ProjectActionDialog";

function submitAndClose(handler, close) {
  return async (event) => {
    await handler(event);
    close();
  };
}

export function ProjectsSiteRisksPanel({
  t,
  reportItems,
  riskItems,
  collaboratorOptions,
  reportForm,
  riskForm,
  saving,
  createReport,
  createRisk,
  updateReport,
  updateRisk,
  getCollaboratorLabel,
  reportTypes,
  riskSeverities,
  riskStatuses,
  renderSectionHeader,
  renderRiskStatusBadge,
  sectionMode = "both",
}) {
  const showReports = sectionMode === "both" || sectionMode === "reports";
  const showRisks = sectionMode === "both" || sectionMode === "risks";

  return (
    <>
      {showReports && (
      <Card className="space-y-4">
        {renderSectionHeader({
          eyebrow: t("pages.projects.siteEyebrow"),
          title: t("pages.projects.siteSection"),
          description: t("pages.projects.siteSectionHint"),
          meta: (
            <>
              <Badge variant="info">{reportItems.length}</Badge>
              <ProjectActionDialog
                triggerLabel={t("pages.projects.addReport")}
                title={t("pages.projects.addReport")}
                description={t("pages.projects.siteSectionHint")}
                closeLabel={t("common.close")}
              >
                {({ close }) => (
                  <form className="grid gap-3" onSubmit={submitAndClose(createReport, close)}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input type="date" value={reportForm.report_date} onChange={(e) => updateReport("report_date", e.target.value)} />
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={reportForm.report_type} onChange={(e) => updateReport("report_type", e.target.value)}>
                        {reportTypes.map((value) => <option key={value} value={value}>{t(`enums.reportType.${value}`)}</option>)}
                      </select>
                      <Input type="number" placeholder={t("pages.projects.personnelPresent")} value={reportForm.personnel_present} onChange={(e) => updateReport("personnel_present", e.target.value)} />
                    </div>
                    <Textarea rows={2} placeholder={t("pages.projects.summary")} value={reportForm.summary} onChange={(e) => updateReport("summary", e.target.value)} />
                    <Textarea rows={2} placeholder={t("pages.projects.activitiesSummary")} value={reportForm.activities_summary} onChange={(e) => updateReport("activities_summary", e.target.value)} />
                    <Textarea rows={2} placeholder={t("pages.projects.incidents")} value={reportForm.incidents} onChange={(e) => updateReport("incidents", e.target.value)} />
                    <Textarea rows={2} placeholder={t("pages.projects.observations")} value={reportForm.observations} onChange={(e) => updateReport("observations", e.target.value)} />
                    <Button type="submit" disabled={saving}>{t("pages.projects.addReport")}</Button>
                  </form>
                )}
              </ProjectActionDialog>
            </>
          ),
        })}
        <div className="space-y-2">
          {reportItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{item.report_date}</p>
                <Badge variant="info">{t(`enums.reportType.${item.report_type}`)}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("pages.projects.reportAuthor")}: {item.author?.full_name || t("pages.projects.notAssigned")}
              </p>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
            </div>
          ))}
        </div>
      </Card>
      )}

      {showRisks && (
      <Card className="space-y-4">
        {renderSectionHeader({
          eyebrow: t("pages.projects.riskEyebrow"),
          title: t("pages.projects.riskSection"),
          description: t("pages.projects.riskSectionHint"),
          meta: (
            <>
              <Badge variant={riskItems.some((item) => item.severity === "critical") ? "danger" : "info"}>{riskItems.length}</Badge>
              <ProjectActionDialog
                triggerLabel={t("pages.projects.addRisk")}
                title={t("pages.projects.addRisk")}
                description={t("pages.projects.riskSectionHint")}
                closeLabel={t("common.close")}
              >
                {({ close }) => (
                  <form className="grid gap-3" onSubmit={submitAndClose(createRisk, close)}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder={t("pages.projects.riskTitle")} value={riskForm.title} onChange={(e) => updateRisk("title", e.target.value)} />
                      {collaboratorOptions.length ? (
                        <select
                          aria-label="project-risk-owner"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={riskForm.owner_user_id}
                          onChange={(e) => updateRisk("owner_user_id", e.target.value)}
                        >
                          <option value="">{t("pages.projects.riskOwner")}</option>
                          {collaboratorOptions.map((item) => (
                            <option key={`risk-owner-${item.id}`} value={item.id}>
                              {getCollaboratorLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input placeholder={t("pages.projects.userId")} value={riskForm.owner_user_id} onChange={(e) => updateRisk("owner_user_id", e.target.value)} />
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={riskForm.severity} onChange={(e) => updateRisk("severity", e.target.value)}>
                        {riskSeverities.map((value) => <option key={value} value={value}>{t(`enums.riskSeverity.${value}`)}</option>)}
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={riskForm.status} onChange={(e) => updateRisk("status", e.target.value)}>
                        {riskStatuses.map((value) => <option key={value} value={value}>{t(`enums.riskStatus.${value}`)}</option>)}
                      </select>
                      <Input type="date" value={riskForm.due_date} onChange={(e) => updateRisk("due_date", e.target.value)} />
                    </div>
                    <Textarea rows={2} placeholder={t("pages.projects.description")} value={riskForm.description} onChange={(e) => updateRisk("description", e.target.value)} />
                    <Textarea rows={2} placeholder={t("pages.projects.mitigationPlan")} value={riskForm.mitigation_plan} onChange={(e) => updateRisk("mitigation_plan", e.target.value)} />
                    <Button type="submit" disabled={saving}>{t("pages.projects.addRisk")}</Button>
                  </form>
                )}
              </ProjectActionDialog>
            </>
          ),
        })}
        <div className="space-y-2">
          {riskItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{item.title}</p>
                {renderRiskStatusBadge(item.status)}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("pages.projects.riskOwner")}: {item.owner?.full_name || t("pages.projects.notAssigned")}
              </p>
              <p className="mt-2 text-sm text-slate-600">{t(`enums.riskSeverity.${item.severity}`)} | {item.mitigation_plan || t("pages.projects.noMitigationPlan")}</p>
            </div>
          ))}
        </div>
      </Card>
      )}
    </>
  );
}
