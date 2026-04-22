import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { EditableFieldList, EditableFieldRow } from "@/components/ui/editable-field-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { CompanyComplianceWorkspace } from "@/features/companies/CompanyComplianceWorkspace";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { cn } from "@/shared/utils/cn";
import { getRoleWorkspaceFlags, getUserRoleCodes } from "@/shared/utils/operationalRoles";

const defaultCompanyForm = {
  legal_name: "",
  registration_number: "",
  email: "",
  country_code: "CM",
  city: "",
  activity_domain: "",
  admin_first_name: "",
  admin_last_name: "",
  admin_email: "",
  admin_password: "",
  subscription_plan_id: "",
};

const defaultPlanForm = {
  code: "",
  name: "",
  duration_days: 30,
  price_amount: "",
  currency: "XAF",
};

const SELECT_CLASS = LIST_SELECT_CLASS;

const pendingOnboardingStatuses = new Set(["pending", "under_review", "info_requested"]);
const companyViews = ["pending", "active", "suspended", "rejected", "all"];
const emptyReviewDraft = {
  note: "",
  requested_information: "",
  rejection_reason: "",
};

function SummaryCard({ label, value, hint, tone = "default" }) {
  const tones = {
    default: "border-white/15 bg-white/10 text-white",
    warning: "border-amber-200/40 bg-amber-100/10 text-white",
    success: "border-emerald-200/40 bg-emerald-100/10 text-white",
    muted: "border-slate-300/30 bg-slate-100/10 text-white",
    danger: "border-rose-200/40 bg-rose-100/10 text-white",
  };

  return (
    <div className={cn("rounded-2xl border px-4 py-4 backdrop-blur-sm", tones[tone] || tones.default)}>
      <p className="text-xs uppercase tracking-[0.2em] text-white/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-sm text-white/75">{hint}</p> : null}
    </div>
  );
}

function getStatusVariant(status) {
  const mapping = {
    approved: "success",
    active: "success",
    pending: "warning",
    under_review: "info",
    info_requested: "warning",
    suspended: "warning",
    expired: "warning",
    rejected: "danger",
    none: "neutral",
  };

  return mapping[status] || "neutral";
}

function formatStatus(status) {
  if (!status) {
    return "-";
  }

  return String(status).replaceAll("_", " ");
}

function formatDateTime(value, language) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function isPendingCompany(company) {
  return pendingOnboardingStatuses.has(company?.onboarding_status);
}

function matchesCompanyView(company, view) {
  if (view === "all") {
    return true;
  }

  if (view === "pending") {
    return isPendingCompany(company);
  }

  if (view === "active") {
    return company?.account_status === "active";
  }

  if (view === "suspended") {
    return company?.account_status === "suspended";
  }

  if (view === "rejected") {
    return company?.onboarding_status === "rejected" || company?.account_status === "rejected";
  }

  return true;
}

export function CompaniesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.user_type === "super_admin";
  const { isExternalController, canManageCompanies } = getRoleWorkspaceFlags(user);
  const roleCodes = getUserRoleCodes(user);
  const canEditComplianceWorkspace = canManageCompanies || roleCodes.includes("assistant_administratif") || roleCodes.includes("juriste");
  const { mutate, loading: saving, error: mutationError, setError } = useApiMutation();

  const {
    data: companiesData,
    loading: companiesLoading,
    error: companiesError,
    refetch: refetchCompanies,
  } = useApiQuery("/admin/companies", { enabled: isSuperAdmin });
  const {
    data: plansData,
    loading: plansLoading,
    refetch: refetchPlans,
  } = useApiQuery("/admin/subscription-plans", { enabled: isSuperAdmin });
  const {
    data: myCompanyData,
    loading: myCompanyLoading,
    error: myCompanyError,
    refetch: refetchMyCompany,
  } = useApiQuery("/companies/me", { enabled: !isSuperAdmin });

  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  const [companyView, setCompanyView] = useState("pending");
  const [reviewDrafts, setReviewDrafts] = useState({});

  const onCompanyChange = (key, value) => setCompanyForm((prev) => ({ ...prev, [key]: value }));
  const onPlanChange = (key, value) => setPlanForm((prev) => ({ ...prev, [key]: value }));
  const getReviewDraft = (companyId) => ({ ...emptyReviewDraft, ...(reviewDrafts[companyId] || {}) });
  const updateReviewDraft = (companyId, key, value) =>
    setReviewDrafts((prev) => ({
      ...prev,
      [companyId]: {
        ...emptyReviewDraft,
        ...(prev[companyId] || {}),
        [key]: value,
      },
    }));

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    setError(null);

    await mutate({
      method: "post",
      url: "/admin/subscription-plans",
      data: {
        ...planForm,
        duration_days: Number(planForm.duration_days),
      },
    });

    setPlanForm(defaultPlanForm);
    await refetchPlans();
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();
    setError(null);

    await mutate({
      method: "post",
      url: "/admin/companies",
      data: {
        ...companyForm,
        subscription_plan_id: companyForm.subscription_plan_id ? Number(companyForm.subscription_plan_id) : null,
        initial_review_decision: "approved",
      },
    });

    setCompanyForm(defaultCompanyForm);
    await refetchCompanies();
  };

  const handleReview = async (companyId, action) => {
    setError(null);
    const draft = getReviewDraft(companyId);
    await mutate({
      method: "patch",
      url: `/admin/companies/${companyId}/review`,
      data: {
        action,
        note: draft.note || null,
        requested_information: draft.requested_information || null,
        rejection_reason: draft.rejection_reason || null,
      },
    });
    setReviewDrafts((prev) => {
      const next = { ...prev };
      delete next[companyId];
      return next;
    });
    await refetchCompanies();
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm(t("pages.companies.deleteConfirm"))) {
      return;
    }

    setError(null);
    await mutate({
      method: "delete",
      url: `/admin/companies/${companyId}`,
    });
    await refetchCompanies();
  };

  if (isSuperAdmin) {
    const companies = companiesData?.items || [];
    const plans = plansData?.items || [];
    const reviewCounts = {
      all: companies.length,
      pending: companies.filter((item) => isPendingCompany(item)).length,
      active: companies.filter((item) => item.account_status === "active").length,
      suspended: companies.filter((item) => item.account_status === "suspended").length,
      rejected: companies.filter((item) => item.onboarding_status === "rejected" || item.account_status === "rejected").length,
    };
    const viewLabels = {
      pending: t("pages.companies.filterPending"),
      active: t("pages.companies.filterActive"),
      suspended: t("pages.companies.filterSuspended"),
      rejected: t("pages.companies.filterRejected"),
      all: t("pages.companies.filterAll"),
    };
    const visibleCompanies = [...companies]
      .sort((left, right) => {
        const leftPriority = isPendingCompany(left) ? 0 : 1;
        const rightPriority = isPendingCompany(right) ? 0 : 1;

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
      })
      .filter((item) => matchesCompanyView(item, companyView));

    return (
      <section className="space-y-5">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-primary p-0 text-white shadow-lg">
          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/65">{t("pages.companies.platformEyebrow")}</p>
                <h2 className="mt-2 text-2xl font-semibold">{t("pages.companies.platformTitle")}</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80">{t("pages.companies.platformSubtitle")}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">{t("pages.companies.reviewQueueTitle")}</p>
                <p className="mt-1 text-sm text-white/75">
                  {reviewCounts.pending
                    ? t("pages.companies.reviewQueueUrgent", { count: reviewCounts.pending })
                    : t("pages.companies.reviewQueueQuiet")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label={t("pages.companies.summaryPortfolio")} value={reviewCounts.all} hint={t("pages.companies.companyListTitle")} />
              <SummaryCard label={t("pages.companies.summaryPending")} value={reviewCounts.pending} hint={t("pages.companies.pendingSubtitle")} tone="warning" />
              <SummaryCard label={t("pages.companies.summaryActive")} value={reviewCounts.active} hint={t("pages.companies.filterActive")} tone="success" />
              <SummaryCard label={t("pages.companies.summarySuspended")} value={reviewCounts.suspended} hint={t("pages.companies.filterSuspended")} tone="muted" />
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <Card className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t("pages.companies.reviewQueueTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t("pages.companies.reviewQueueSubtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {companyViews.map((view) => (
                    <Button
                      key={view}
                      type="button"
                      variant={companyView === view ? "primary" : "outline"}
                      className="rounded-full"
                      onClick={() => setCompanyView(view)}
                    >
                      {viewLabels[view]} ({reviewCounts[view] ?? reviewCounts.all})
                    </Button>
                  ))}
                </div>
              </div>

              {(companiesLoading || companiesError) && (
                <p className={cn("text-sm", companiesError ? "text-rose-600" : "text-slate-500")}>
                  {companiesError || t("common.loading")}
                </p>
              )}
              {!!mutationError && <p className="text-sm text-rose-600">{mutationError}</p>}
              {!companiesLoading && !visibleCompanies.length && <p className="text-sm text-slate-500">{t("common.noData")}</p>}

              {!!visibleCompanies.length && (
                <div className="space-y-3">
                  {visibleCompanies.map((item) => {
                    const reviewDraft = getReviewDraft(item.id);
                    const canApprove = item.onboarding_status !== "approved" || item.account_status !== "active";
                    const canMarkUnderReview = item.onboarding_status !== "under_review";
                    const canRequestInfo = item.onboarding_status !== "info_requested";
                    const canSuspend = item.account_status !== "suspended";
                    const canReject = item.onboarding_status !== "rejected";

                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-slate-900">{item.legal_name}</p>
                                <Badge variant={getStatusVariant(item.onboarding_status)}>{formatStatus(item.onboarding_status)}</Badge>
                                <Badge variant={getStatusVariant(item.account_status)}>{formatStatus(item.account_status)}</Badge>
                                <Badge variant={getStatusVariant(item.subscription_status)}>{formatStatus(item.subscription_status)}</Badge>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">
                                {item.registration_number || "-"} | {item.city || "-"} | {item.country_code || "-"}
                              </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("pages.companies.primaryAdmin")}</p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{item.primary_admin?.email || "-"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("pages.companies.activityDomain")}</p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{item.activity_domain || "-"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("pages.companies.planName")}</p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{item.current_subscription?.plan?.name || "-"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("pages.companies.createdAt")}</p>
                                <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(item.created_at, i18n.language)}</p>
                              </div>
                            </div>

                            {(item.review_notes || item.reviewed_at) && (
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                <p className="font-medium text-slate-800">{t("pages.companies.latestReview")}</p>
                                <p className="mt-1">
                                  {t("pages.companies.createdAt")}: {formatDateTime(item.reviewed_at, i18n.language)}
                                </p>
                                {item.review_notes ? (
                                  <p className="mt-1">
                                    {t("pages.companies.reviewNotes")}: {item.review_notes}
                                  </p>
                                ) : null}
                                {item.requested_information ? (
                                  <p className="mt-1">
                                    {t("pages.companies.requestedInformationLabel")}: {item.requested_information}
                                  </p>
                                ) : null}
                                {item.rejection_reason ? (
                                  <p className="mt-1">
                                    {t("pages.companies.rejectionReasonLabel")}: {item.rejection_reason}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-sm font-medium text-slate-800">{t("pages.companies.reviewTitle")}</p>
                              <p className="mt-1 text-sm text-slate-500">{t("pages.companies.reviewGuidance")}</p>
                              <div className="mt-3 grid gap-3">
                                <Textarea
                                  value={reviewDraft.note}
                                  onChange={(event) => updateReviewDraft(item.id, "note", event.target.value)}
                                  placeholder={t("pages.companies.reviewNotes")}
                                  className="min-h-[72px] rounded-md border border-slate-200 px-3 py-2"
                                />
                                <div className="grid gap-3 xl:grid-cols-2">
                                  <Textarea
                                    value={reviewDraft.requested_information}
                                    onChange={(event) => updateReviewDraft(item.id, "requested_information", event.target.value)}
                                    placeholder={t("pages.companies.requestedInformation")}
                                    className="min-h-[72px] rounded-md border border-slate-200 px-3 py-2"
                                  />
                                  <Textarea
                                    value={reviewDraft.rejection_reason}
                                    onChange={(event) => updateReviewDraft(item.id, "rejection_reason", event.target.value)}
                                    placeholder={t("pages.companies.rejectionReason")}
                                    className="min-h-[72px] rounded-md border border-slate-200 px-3 py-2"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:max-w-[230px] xl:justify-end">
                            {canApprove ? (
                              <Button onClick={() => handleReview(item.id, "approve")} disabled={saving}>
                                {t("pages.companies.approve")}
                              </Button>
                            ) : null}
                            {canMarkUnderReview ? (
                              <Button variant="outline" onClick={() => handleReview(item.id, "under_review")} disabled={saving}>
                                {t("pages.companies.markUnderReview")}
                              </Button>
                            ) : null}
                            {canRequestInfo ? (
                              <Button variant="outline" onClick={() => handleReview(item.id, "info_requested")} disabled={saving}>
                                {t("pages.companies.requestInfo")}
                              </Button>
                            ) : null}
                            {canSuspend ? (
                              <Button variant="outline" onClick={() => handleReview(item.id, "suspend")} disabled={saving}>
                                {t("pages.companies.suspend")}
                              </Button>
                            ) : null}
                            {canReject ? (
                              <Button
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => handleReview(item.id, "reject")}
                                disabled={saving}
                              >
                                {t("pages.companies.reject")}
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-100"
                              onClick={() => handleDelete(item.id)}
                              disabled={saving}
                            >
                              {t("pages.companies.delete")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t("pages.companies.manualProvisioningTitle")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("pages.companies.manualProvisioningSubtitle")}</p>
              </div>
              <form className="grid gap-3" onSubmit={handleCreateCompany}>
                <EditableFieldList>
                  <EditableFieldRow label={t("pages.companies.legalName")} hint={t("pages.companies.registration")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={companyForm.legal_name} onChange={(e) => onCompanyChange("legal_name", e.target.value)} placeholder={t("pages.companies.legalName")} />
                      <Input value={companyForm.registration_number} onChange={(e) => onCompanyChange("registration_number", e.target.value)} placeholder={t("pages.companies.registration")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.email")} hint={t("pages.companies.countryCode")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={companyForm.email} onChange={(e) => onCompanyChange("email", e.target.value)} placeholder={t("pages.companies.email")} />
                      <Input value={companyForm.country_code} onChange={(e) => onCompanyChange("country_code", e.target.value)} placeholder={t("pages.companies.countryCode")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.city")} hint={t("pages.companies.activityDomain")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={companyForm.city} onChange={(e) => onCompanyChange("city", e.target.value)} placeholder={t("pages.companies.city")} />
                      <Input value={companyForm.activity_domain} onChange={(e) => onCompanyChange("activity_domain", e.target.value)} placeholder={t("pages.companies.activityDomain")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.adminFirstName")} hint={t("pages.companies.adminLastName")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={companyForm.admin_first_name} onChange={(e) => onCompanyChange("admin_first_name", e.target.value)} placeholder={t("pages.companies.adminFirstName")} />
                      <Input value={companyForm.admin_last_name} onChange={(e) => onCompanyChange("admin_last_name", e.target.value)} placeholder={t("pages.companies.adminLastName")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.adminEmail")} hint={t("pages.companies.adminPassword")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={companyForm.admin_email} onChange={(e) => onCompanyChange("admin_email", e.target.value)} placeholder={t("pages.companies.adminEmail")} />
                      <Input type="password" value={companyForm.admin_password} onChange={(e) => onCompanyChange("admin_password", e.target.value)} placeholder={t("pages.companies.adminPassword")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.planLibraryTitle")} hint={t("pages.companies.planOptional")}>
                    <select
                      className={SELECT_CLASS}
                      value={companyForm.subscription_plan_id}
                      onChange={(e) => onCompanyChange("subscription_plan_id", e.target.value)}
                    >
                      <option value="">{t("pages.companies.planOptional")}</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </EditableFieldRow>
                </EditableFieldList>
                <Button type="submit" disabled={saving}>{t("pages.companies.createTitle")}</Button>
              </form>
            </Card>

            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t("pages.companies.planLibraryTitle")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("pages.companies.planLibrarySubtitle")}</p>
              </div>
              <form className="grid gap-3" onSubmit={handleCreatePlan}>
                <EditableFieldList>
                  <EditableFieldRow label={t("pages.companies.planCode")} hint={t("pages.companies.planName")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={planForm.code} onChange={(e) => onPlanChange("code", e.target.value)} placeholder={t("pages.companies.planCode")} />
                      <Input value={planForm.name} onChange={(e) => onPlanChange("name", e.target.value)} placeholder={t("pages.companies.planName")} />
                    </div>
                  </EditableFieldRow>
                  <EditableFieldRow label={t("pages.companies.planDuration")} hint={t("pages.companies.planPrice")}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="number" value={planForm.duration_days} onChange={(e) => onPlanChange("duration_days", e.target.value)} placeholder={t("pages.companies.planDuration")} />
                      <Input value={planForm.price_amount} onChange={(e) => onPlanChange("price_amount", e.target.value)} placeholder={t("pages.companies.planPrice")} />
                    </div>
                  </EditableFieldRow>
                </EditableFieldList>
                <Button type="submit" disabled={saving}>{t("pages.companies.planCreateTitle")}</Button>
              </form>
              {plansLoading && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
              {!plansLoading && !plans.length && <p className="text-sm text-slate-500">{t("pages.companies.noPlans")}</p>}
              {!!plans.length && (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{plan.name}</p>
                          <p className="text-slate-500">{plan.code}</p>
                        </div>
                        <Badge variant="info">{plan.currency}</Badge>
                      </div>
                      <p className="mt-2 text-slate-700">{plan.duration_days} j | {plan.price_amount} {plan.currency}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <CompanyComplianceWorkspace
      companyData={myCompanyData}
      loading={myCompanyLoading}
      error={myCompanyError}
      canEdit={canEditComplianceWorkspace && !isExternalController}
      saving={saving}
      mutationError={mutationError}
      onSaveCompanyProfile={async (profilePayload) => {
        setError(null);
        await mutate({
          method: "put",
          url: "/companies/me/settings",
          data: profilePayload,
        });
        await refetchMyCompany();
      }}
      onSaveWorkspace={async (workspacePayload) => {
        setError(null);
        await mutate({
          method: "put",
          url: "/companies/me/settings",
          data: { administrative_documents: workspacePayload },
        });
        await refetchMyCompany();
      }}
    />
  );
}
