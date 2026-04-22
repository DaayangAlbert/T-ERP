import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { getRoleWorkspaceFlags } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

function getTenderVariant(status) {
  if (status === "awarded") {
    return "success";
  }

  if (status === "lost" || status === "cancelled") {
    return "danger";
  }

  if (status === "submitted" || status === "preparing") {
    return "warning";
  }

  return "neutral";
}

function getSubmissionVariant(status) {
  if (status === "awarded") {
    return "success";
  }

  if (status === "lost" || status === "cancelled") {
    return "danger";
  }

  if (status === "submitted" || status === "under_review") {
    return "warning";
  }

  return "neutral";
}

export function ProcurementPage() {
  const { t } = useTranslation();
  const { tenantId, user } = useAuth();
  const { isJuriste, canManageProcurement } = getRoleWorkspaceFlags(user);
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const isLegalWorkspace = isJuriste && !canManageProcurement;
  const workspaceTitle = t(isLegalWorkspace ? "pages.procurement.legalWorkspaceTitle" : "pages.procurement.workspaceTitle");
  const workspaceSubtitle = t(isLegalWorkspace ? "pages.procurement.legalWorkspaceSubtitle" : "pages.procurement.workspaceSubtitle");
  const workspaceBadges = isLegalWorkspace
    ? [
        t("workspaceProfiles.juriste.focusCompliance"),
        t("workspaceProfiles.juriste.focusContracts"),
        t("workspaceProfiles.juriste.focusEvidence"),
      ]
    : [
        t("pages.procurement.workflowMonitoring"),
        t("pages.procurement.workflowChecklist"),
        t("pages.procurement.workflowSubmissions"),
      ];

  const { data: summary } = useApiQuery("/procurement/summary", { enabled: canLoadTenantData });
  const { data: tenders, loading, error, refetch } = useApiQuery("/procurement/tenders", { enabled: canLoadTenantData });
  const { data: submissions, refetch: refetchSubmissions } = useApiQuery("/procurement/submissions", { enabled: canLoadTenantData });
  const { mutate, loading: saving } = useApiMutation();

  const [tenderForm, setTenderForm] = useState({
    reference: "",
    title: "",
    contracting_authority: "",
    location: "",
    submission_deadline: "",
    status: "monitoring",
    dao_url: "",
  });
  const [submissionForm, setSubmissionForm] = useState({
    tender_id: "",
    status: "draft",
    submission_amount: "",
    dao_package_url: "",
    notes: "",
  });
  const [checklistForm, setChecklistForm] = useState({
    tender_id: "",
    label: "",
  });

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.procurement" />;
  }

  const updateTender = (key, value) => setTenderForm((prev) => ({ ...prev, [key]: value }));
  const updateSubmission = (key, value) => setSubmissionForm((prev) => ({ ...prev, [key]: value }));
  const updateChecklist = (key, value) => setChecklistForm((prev) => ({ ...prev, [key]: value }));

  const createTender = async (event) => {
    event.preventDefault();
    await mutate({ method: "post", url: "/procurement/tenders", data: tenderForm });
    setTenderForm({ reference: "", title: "", contracting_authority: "", location: "", submission_deadline: "", status: "monitoring", dao_url: "" });
    await refetch();
  };

  const createSubmission = async (event) => {
    event.preventDefault();
    if (!submissionForm.tender_id) {
      return;
    }
    await mutate({
      method: "post",
      url: `/procurement/tenders/${submissionForm.tender_id}/submissions`,
      data: submissionForm,
    });
    setSubmissionForm({ tender_id: "", status: "draft", submission_amount: "", dao_package_url: "", notes: "" });
    await refetchSubmissions();
  };

  const createChecklistItem = async (event) => {
    event.preventDefault();
    if (!checklistForm.tender_id) {
      return;
    }
    await mutate({
      method: "post",
      url: `/procurement/tenders/${checklistForm.tender_id}/checklist`,
      data: { label: checklistForm.label, is_required: true },
    });
    setChecklistForm({ tender_id: "", label: "" });
  };

  const tenderItems = tenders?.items || [];
  const submissionItems = submissions?.items || [];

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <Badge className="w-fit bg-white/10 text-white" variant="neutral">
              {t(isLegalWorkspace ? "workspaceProfiles.juriste.title" : "workspaceProfiles.acheteur.title")}
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold">{t("pages.procurement.title")}</h2>
              <p className="max-w-2xl text-sm text-slate-200">{t("pages.procurement.subtitle")}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-white">{workspaceTitle}</h3>
            <p className="mt-2 text-sm text-slate-200">{workspaceSubtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workspaceBadges.map((badge) => (
                <Badge key={badge} className="bg-white/10 text-white" variant="neutral">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-slate-600 dark:text-slate-300">{t("pages.procurement.tenders")}</p>
            <p className="text-lg font-semibold text-slate-900">{summary?.counts?.tenders ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-slate-600 dark:text-slate-300">{t("pages.procurement.submissions")}</p>
            <p className="text-lg font-semibold text-slate-900">{summary?.counts?.submissions ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-slate-600 dark:text-slate-300">{t("pages.procurement.awarded")}</p>
            <p className="text-lg font-semibold text-emerald-600">{summary?.counts?.awarded ?? 0}</p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="text-slate-600 dark:text-slate-300">{t("pages.procurement.lost")}</p>
            <p className="text-lg font-semibold text-rose-600">{summary?.counts?.lost ?? 0}</p>
          </div>
        </div>
      </Card>

      {!canManageProcurement && (
        <Card>
          <p className="text-sm text-amber-700">{t("pages.procurement.readOnlyHint")}</p>
        </Card>
      )}

      {canManageProcurement && (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("pages.procurement.createTender")}</h3>
            <form className="grid gap-2" onSubmit={createTender}>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder={t("pages.procurement.reference")} value={tenderForm.reference} onChange={(e) => updateTender("reference", e.target.value)} />
                <Input placeholder={t("pages.procurement.titleField")} value={tenderForm.title} onChange={(e) => updateTender("title", e.target.value)} />
              </div>
              <Input placeholder={t("pages.procurement.authority")} value={tenderForm.contracting_authority} onChange={(e) => updateTender("contracting_authority", e.target.value)} />
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder={t("pages.procurement.location")} value={tenderForm.location} onChange={(e) => updateTender("location", e.target.value)} />
                <Input type="date" placeholder={t("pages.procurement.deadline")} value={tenderForm.submission_deadline} onChange={(e) => updateTender("submission_deadline", e.target.value)} />
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={tenderForm.status} onChange={(e) => updateTender("status", e.target.value)}>
                  <option value="draft">{t("enums.procurementStatus.draft")}</option>
                  <option value="monitoring">{t("enums.procurementStatus.monitoring")}</option>
                  <option value="preparing">{t("enums.procurementStatus.preparing")}</option>
                  <option value="submitted">{t("enums.procurementStatus.submitted")}</option>
                  <option value="awarded">{t("enums.procurementStatus.awarded")}</option>
                  <option value="lost">{t("enums.procurementStatus.lost")}</option>
                  <option value="cancelled">{t("enums.procurementStatus.cancelled")}</option>
                </select>
              </div>
              <Input placeholder={t("pages.procurement.daoUrl")} value={tenderForm.dao_url} onChange={(e) => updateTender("dao_url", e.target.value)} />
              <Button type="submit" disabled={saving}>{t("common.create")}</Button>
            </form>
          </Card>

          <div className="space-y-5">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("pages.procurement.createSubmission")}</h3>
              <form className="grid gap-2" onSubmit={createSubmission}>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input placeholder={t("pages.procurement.tenderId")} value={submissionForm.tender_id} onChange={(e) => updateSubmission("tender_id", e.target.value)} />
                  <Input type="number" placeholder={t("pages.procurement.amount")} value={submissionForm.submission_amount} onChange={(e) => updateSubmission("submission_amount", e.target.value)} />
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={submissionForm.status} onChange={(e) => updateSubmission("status", e.target.value)}>
                    <option value="draft">{t("enums.procurementSubmissionStatus.draft")}</option>
                    <option value="submitted">{t("enums.procurementSubmissionStatus.submitted")}</option>
                    <option value="under_review">{t("enums.procurementSubmissionStatus.under_review")}</option>
                    <option value="awarded">{t("enums.procurementSubmissionStatus.awarded")}</option>
                    <option value="lost">{t("enums.procurementSubmissionStatus.lost")}</option>
                    <option value="cancelled">{t("enums.procurementSubmissionStatus.cancelled")}</option>
                  </select>
                </div>
                <Input placeholder={t("pages.procurement.daoPackageUrl")} value={submissionForm.dao_package_url} onChange={(e) => updateSubmission("dao_package_url", e.target.value)} />
                <Textarea placeholder={t("pages.procurement.notes")} value={submissionForm.notes} onChange={(e) => updateSubmission("notes", e.target.value)} rows={2} />
                <Button type="submit" disabled={saving}>{t("common.create")}</Button>
              </form>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("pages.procurement.createChecklist")}</h3>
              <form className="grid gap-2 md:grid-cols-[160px_1fr_auto]" onSubmit={createChecklistItem}>
                <Input placeholder={t("pages.procurement.tenderId")} value={checklistForm.tender_id} onChange={(e) => updateChecklist("tender_id", e.target.value)} />
                <Input placeholder={t("pages.procurement.checklistLabel")} value={checklistForm.label} onChange={(e) => updateChecklist("label", e.target.value)} />
                <Button type="submit" disabled={saving}>{t("common.create")}</Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("pages.procurement.tenders")}</h3>
            <Badge variant="neutral">{tenderItems.length}</Badge>
          </div>
          {loading && <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.loading")}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !tenderItems.length && <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.noData")}</p>}
          {!!tenderItems.length && (
            <ul className="space-y-2 text-sm">
              {tenderItems.map((item) => (
                <li key={item.id} className="rounded-md border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-800">{item.reference} - {item.title}</p>
                    <Badge variant={getTenderVariant(item.status)}>{t(`enums.procurementStatus.${item.status}`)}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{item.contracting_authority || "-"} - {item.location || "-"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("pages.procurement.submissions")}</h3>
            <Badge variant="neutral">{submissionItems.length}</Badge>
          </div>
          {!submissionItems.length && <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.noData")}</p>}
          {!!submissionItems.length && (
            <ul className="space-y-2 text-sm">
              {submissionItems.map((item) => (
                <li key={item.id} className="rounded-md border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-800">#{item.tender_id} - {item.submission_amount ?? "-"}</p>
                    <Badge variant={getSubmissionVariant(item.status)}>{t(`enums.procurementSubmissionStatus.${item.status}`)}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{item.dao_package_url || item.notes || "-"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}


