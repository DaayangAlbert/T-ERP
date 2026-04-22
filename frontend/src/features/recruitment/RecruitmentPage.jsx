import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { getRoleWorkspaceFlags } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const OFFER_STATUSES = ["draft", "published", "closed"];
const APPLICATION_STATUSES = ["submitted", "screening", "interview", "shortlisted", "hired", "rejected"];
const AVAILABILITY_STATUSES = ["immediate", "short_notice", "not_available"];

const emptyOffer = { title: "", description: "", contract_type: "CDI", location: "", salary_min: "", salary_max: "", status: "draft" };

function summary(label, value, hint, tone = "text-slate-900 dark:text-white") {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/55">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function offerVariant(status) {
  if (status === "published") return "success";
  if (status === "closed") return "warning";
  return "neutral";
}

function applicationVariant(status) {
  if (status === "hired" || status === "shortlisted") return "success";
  if (status === "rejected") return "danger";
  if (status === "interview" || status === "screening") return "info";
  return "neutral";
}

function availabilityVariant(status) {
  if (status === "immediate") return "success";
  if (status === "short_notice") return "warning";
  return "neutral";
}

function candidateName(candidate, fallbackId) {
  const fullName = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ").trim();
  return fullName || candidate?.email || (fallbackId ? `#${fallbackId}` : "--");
}

function salaryLabel(offer, language, fallback) {
  if (!offer || (offer.salary_min == null && offer.salary_max == null)) return fallback;
  const formatter = new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "fr-FR", { maximumFractionDigits: 0 });
  if (offer.salary_min != null && offer.salary_max != null) return `${formatter.format(offer.salary_min)} - ${formatter.format(offer.salary_max)}`;
  return formatter.format(offer.salary_min ?? offer.salary_max ?? 0);
}

function candidateFormFrom(user, candidate) {
  return {
    email: candidate?.email || user?.email || "",
    first_name: candidate?.first_name || user?.first_name || "",
    last_name: candidate?.last_name || user?.last_name || "",
    phone: candidate?.phone || "",
    city: candidate?.city || "",
    years_experience: candidate?.years_experience == null ? "" : String(candidate.years_experience),
    desired_position: candidate?.desired_position || "",
    availability_status: candidate?.availability_status || "immediate",
    cv_url: candidate?.cv_url || "",
    skills_summary: candidate?.skills_summary || "",
  };
}

function offerFormFrom(offer) {
  return offer
    ? {
        title: offer.title || "",
        description: offer.description || "",
        contract_type: offer.contract_type || "CDI",
        location: offer.location || "",
        salary_min: offer.salary_min == null ? "" : String(offer.salary_min),
        salary_max: offer.salary_max == null ? "" : String(offer.salary_max),
        status: offer.status || "draft",
      }
    : emptyOffer;
}

function nullable(value) {
  return value == null || value === "" ? null : value;
}

export function RecruitmentPage() {
  const { t, i18n } = useTranslation();
  const { tenantId, user } = useAuth();
  const { isCandidate, canManageRecruitment } = getRoleWorkspaceFlags(user);
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const isCandidateWorkspace = isCandidate && !canManageRecruitment;

  const [offerForm, setOfferForm] = useState(emptyOffer);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [candidateForm, setCandidateForm] = useState(() => candidateFormFrom(user, null));
  const [candidateSearch, setCandidateSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");
  const [applicationDrafts, setApplicationDrafts] = useState({});

  const mutation = useApiMutation();
  const offersQuery = useApiQuery("/recruitment/job-offers", { enabled: canLoadTenantData, params: isCandidateWorkspace ? { status: "published" } : undefined });
  const myProfileQuery = useApiQuery("/recruitment/candidate-profiles/me", { enabled: canLoadTenantData && isCandidateWorkspace });
  const candidatesQuery = useApiQuery("/recruitment/candidate-profiles", {
    enabled: canLoadTenantData && !isCandidateWorkspace,
    params: candidateSearch ? { search: candidateSearch } : undefined,
  });
  const applicationsQuery = useApiQuery(isCandidateWorkspace ? "/recruitment/applications/me" : "/recruitment/applications", {
    enabled: canLoadTenantData,
    params: isCandidateWorkspace ? undefined : { ...(selectedOfferId ? { job_offer_id: selectedOfferId } : {}), ...(applicationStatusFilter ? { status: applicationStatusFilter } : {}) },
  });
  const matchesQuery = useApiQuery("/recruitment/matches", { enabled: canLoadTenantData && !isCandidateWorkspace, params: selectedOfferId ? { offer_id: selectedOfferId } : undefined });

  const offers = offersQuery.data?.items || [];
  const myProfile = myProfileQuery.data?.candidate || null;
  const candidates = candidatesQuery.data?.items || [];
  const applications = applicationsQuery.data?.items || [];
  const matches = matchesQuery.data?.items || [];
  const selectedOffer = useMemo(() => offers.find((item) => item.id === selectedOfferId) || null, [offers, selectedOfferId]);
  const appliedOfferIds = useMemo(() => new Set(applications.map((item) => item.job_offer_id)), [applications]);

  useEffect(() => setCandidateForm(candidateFormFrom(user, myProfile)), [user, myProfile]);
  useEffect(() => {
    if (!offers.length) {
      setSelectedOfferId(null);
      return;
    }
    setSelectedOfferId((current) => (current && offers.some((offer) => offer.id === current) ? current : offers[0].id));
  }, [offers]);
  useEffect(() => setOfferForm(offerFormFrom(selectedOffer)), [selectedOffer]);
  useEffect(() => {
    if (isCandidateWorkspace) return;
    setApplicationDrafts((previous) =>
      Object.fromEntries(
        applications.map((application) => [
          application.id,
          previous[application.id] || {
            status: application.status || "submitted",
            score: application.score == null ? "" : String(application.score),
            notes: application.notes || "",
          },
        ])
      )
    );
  }, [applications, isCandidateWorkspace]);

  if (!canLoadTenantData) return <TenantScopeNotice moduleLabelKey="navigation.recruitment" />;

  const saveProfile = async (event) => {
    event.preventDefault();
    await mutation.mutate({ method: "put", url: "/recruitment/candidate-profiles/me", data: candidateForm });
    await myProfileQuery.refetch();
  };

  const createOffer = async (event) => {
    event.preventDefault();
    const response = await mutation.mutate({
      method: "post",
      url: "/recruitment/job-offers",
      data: { ...offerForm, salary_min: nullable(offerForm.salary_min), salary_max: nullable(offerForm.salary_max) },
    });
    setOfferForm(emptyOffer);
    await offersQuery.refetch();
    if (response?.job_offer?.id) setSelectedOfferId(response.job_offer.id);
  };

  const saveSelectedOffer = async (event) => {
    event.preventDefault();
    if (!selectedOfferId) return;
    await mutation.mutate({
      method: "patch",
      url: `/recruitment/job-offers/${selectedOfferId}`,
      data: { ...offerForm, salary_min: nullable(offerForm.salary_min), salary_max: nullable(offerForm.salary_max) },
    });
    await offersQuery.refetch();
  };

  const setOfferStatus = async (status) => {
    if (!selectedOfferId) return;
    await mutation.mutate({ method: "patch", url: `/recruitment/job-offers/${selectedOfferId}`, data: { status } });
    await offersQuery.refetch();
  };

  const applyToOffer = async (offerId) => {
    await mutation.mutate({ method: "post", url: `/recruitment/job-offers/${offerId}/apply`, data: {} });
    await applicationsQuery.refetch();
  };

  const generateMatches = async () => {
    if (!selectedOfferId) return;
    await mutation.mutate({ method: "post", url: `/recruitment/job-offers/${selectedOfferId}/matches/generate`, data: { limit: 10 } });
    await matchesQuery.refetch();
  };

  const updateApplication = async (applicationId) => {
    const draft = applicationDrafts[applicationId];
    if (!draft) return;
    await mutation.mutate({
      method: "patch",
      url: `/recruitment/applications/${applicationId}`,
      data: { status: draft.status, score: nullable(draft.score), notes: draft.notes || "" },
    });
    await applicationsQuery.refetch();
  };

  const workspaceTitle = t(isCandidateWorkspace ? "pages.recruitment.candidateWorkspaceTitle" : "pages.recruitment.workspaceTitle");
  const workspaceSubtitle = t(isCandidateWorkspace ? "pages.recruitment.candidateWorkspaceSubtitle" : "pages.recruitment.workspaceSubtitle");

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-950 via-sky-950 to-cyan-900 text-white">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <Badge className="w-fit bg-white/10 text-white" variant="neutral">{t("pages.recruitment.title")}</Badge>
            <div>
              <h2 className="text-2xl font-semibold">{t("pages.recruitment.title")}</h2>
              <p className="max-w-2xl text-sm text-slate-200">{t("pages.recruitment.subtitle")}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-white">{workspaceTitle}</h3>
            <p className="mt-2 text-sm text-slate-200">{workspaceSubtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(isCandidateWorkspace
                ? [t("workspaceProfiles.candidat_job_seeker.focusProfile"), t("workspaceProfiles.candidat_job_seeker.focusOffers"), t("workspaceProfiles.candidat_job_seeker.focusApplications")]
                : [t("pages.recruitment.flowOffers"), t("pages.recruitment.flowApplications"), t("pages.recruitment.flowIntegration")]
              ).map((badge) => (
                <Badge key={badge} className="bg-white/10 text-white" variant="neutral">{badge}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          {summary(t("pages.recruitment.openOffers"), offers.length, t("pages.recruitment.offersList"))}
          {summary(t("pages.recruitment.applications"), applicationsQuery.data?.pagination?.total ?? applications.length, isCandidateWorkspace ? t("pages.recruitment.myApplicationsTitle") : t("pages.recruitment.applicationsTitle"))}
          {summary(t("pages.recruitment.matches"), isCandidateWorkspace ? myProfile?.profile_score ?? 0 : matches.length, isCandidateWorkspace ? t("pages.recruitment.profileScore") : t("pages.recruitment.matchesPanel"), isCandidateWorkspace ? "text-sky-700 dark:text-sky-300" : "text-slate-900 dark:text-white")}
          {summary(t("pages.recruitment.candidateProfiles"), isCandidateWorkspace ? (myProfile ? 1 : 0) : candidates.length, isCandidateWorkspace ? candidateName(myProfile, user?.id) : t("pages.recruitment.candidatesTitle"))}
        </div>
      </Card>

      {mutation.error ? (
        <Card className="border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/40">
          <p className="text-sm text-rose-700 dark:text-rose-200">{mutation.error}</p>
        </Card>
      ) : null}

      {!isCandidateWorkspace && !canManageRecruitment ? (
        <Card>
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("pages.recruitment.readOnlyHint")}</p>
        </Card>
      ) : null}

      {isCandidateWorkspace ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.myProfileTitle")}</h3>
              <p className="text-sm text-slate-500">{t("pages.recruitment.myProfileSubtitle")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={availabilityVariant(myProfile?.availability_status || candidateForm.availability_status)}>
                  {t(`enums.availabilityStatus.${myProfile?.availability_status || candidateForm.availability_status}`)}
                </Badge>
                <Badge variant="info">{t("pages.recruitment.profileScore")}: {myProfile?.profile_score ?? 0}</Badge>
              </div>
            </div>
            <form className="mt-5 grid gap-3" onSubmit={saveProfile}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder={t("register.firstName")} value={candidateForm.first_name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, first_name: event.target.value }))} />
                <Input placeholder={t("register.lastName")} value={candidateForm.last_name} onChange={(event) => setCandidateForm((prev) => ({ ...prev, last_name: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder={t("register.email")} value={candidateForm.email} onChange={(event) => setCandidateForm((prev) => ({ ...prev, email: event.target.value }))} />
                <Input placeholder={t("pages.recruitment.phone")} value={candidateForm.phone} onChange={(event) => setCandidateForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder={t("pages.recruitment.desiredPosition")} value={candidateForm.desired_position} onChange={(event) => setCandidateForm((prev) => ({ ...prev, desired_position: event.target.value }))} />
                <Input placeholder={t("pages.recruitment.yearsExperience")} type="number" min="0" value={candidateForm.years_experience} onChange={(event) => setCandidateForm((prev) => ({ ...prev, years_experience: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder={t("pages.recruitment.location")} value={candidateForm.city} onChange={(event) => setCandidateForm((prev) => ({ ...prev, city: event.target.value }))} />
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-white" value={candidateForm.availability_status} onChange={(event) => setCandidateForm((prev) => ({ ...prev, availability_status: event.target.value }))}>
                  {AVAILABILITY_STATUSES.map((status) => <option key={status} value={status}>{t(`enums.availabilityStatus.${status}`)}</option>)}
                </select>
              </div>
              <Input placeholder={t("pages.recruitment.cvUrl")} value={candidateForm.cv_url} onChange={(event) => setCandidateForm((prev) => ({ ...prev, cv_url: event.target.value }))} />
              <Textarea placeholder={t("pages.recruitment.skillsSummary")} rows={4} value={candidateForm.skills_summary} onChange={(event) => setCandidateForm((prev) => ({ ...prev, skills_summary: event.target.value }))} />
              <Button type="submit" disabled={mutation.loading}>{t("pages.recruitment.saveProfile")}</Button>
            </form>
          </Card>

          <div className="space-y-5">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.offersList")}</h3>
                <Badge variant="neutral">{offers.length}</Badge>
              </div>
              <div className="space-y-3">
                {!offers.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noOffers")}</p> : null}
                {offers.map((offer) => {
                  const alreadyApplied = appliedOfferIds.has(offer.id);
                  return (
                    <div key={offer.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-slate-900 dark:text-white">{offer.title}</h4>
                            <Badge variant={offerVariant(offer.status)}>{t(`enums.offerStatus.${offer.status}`)}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{offer.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{offer.contract_type || "--"}</span>
                            <span>{offer.location || t("pages.recruitment.locationNotSet")}</span>
                            <span>{salaryLabel(offer, i18n.resolvedLanguage, t("pages.recruitment.salaryNotSet"))}</span>
                          </div>
                        </div>
                        <Button type="button" disabled={!myProfile || alreadyApplied || mutation.loading} onClick={() => applyToOffer(offer.id)}>
                          {alreadyApplied ? t("pages.recruitment.alreadyApplied") : t("pages.recruitment.applyNow")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!myProfile ? <p className="text-sm text-amber-700 dark:text-amber-300">{t("pages.recruitment.profileRequired")}</p> : null}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.myApplicationsTitle")}</h3>
                <Badge variant="neutral">{applications.length}</Badge>
              </div>
              <div className="space-y-3">
                {!applications.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noApplications")}</p> : null}
                {applications.map((application) => (
                  <div key={application.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{application.job_offer?.title || `#${application.job_offer_id}`}</h4>
                        <p className="text-sm text-slate-500">{application.job_offer?.location || t("pages.recruitment.locationNotSet")} · {application.job_offer?.contract_type || "--"}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={applicationVariant(application.status)}>{t(`enums.applicationStatus.${application.status}`)}</Badge>
                        <p className="mt-2 text-sm text-slate-500">{t("pages.recruitment.applicationScore")}: {application.score ?? "--"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
          {canManageRecruitment ? (
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.createOffer")}</h3>
                <p className="mb-4 text-sm text-slate-500">{t("pages.recruitment.createOfferHint")}</p>
                <form className="grid gap-3" onSubmit={createOffer}>
                  <Input placeholder={t("pages.recruitment.offerTitle")} value={offerForm.title} onChange={(event) => setOfferForm((prev) => ({ ...prev, title: event.target.value }))} />
                  <Textarea placeholder={t("pages.recruitment.offerDescription")} rows={4} value={offerForm.description} onChange={(event) => setOfferForm((prev) => ({ ...prev, description: event.target.value }))} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input placeholder={t("pages.recruitment.contractType")} value={offerForm.contract_type} onChange={(event) => setOfferForm((prev) => ({ ...prev, contract_type: event.target.value }))} />
                    <Input placeholder={t("pages.recruitment.location")} value={offerForm.location} onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))} />
                    <select className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-white" value={offerForm.status} onChange={(event) => setOfferForm((prev) => ({ ...prev, status: event.target.value }))}>
                      {OFFER_STATUSES.map((status) => <option key={status} value={status}>{t(`enums.offerStatus.${status}`)}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder={t("pages.recruitment.salaryMin")} type="number" min="0" value={offerForm.salary_min} onChange={(event) => setOfferForm((prev) => ({ ...prev, salary_min: event.target.value }))} />
                    <Input placeholder={t("pages.recruitment.salaryMax")} type="number" min="0" value={offerForm.salary_max} onChange={(event) => setOfferForm((prev) => ({ ...prev, salary_max: event.target.value }))} />
                  </div>
                  <Button type="submit" disabled={mutation.loading}>{t("common.create")}</Button>
                </form>
              </Card>

              <Card>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.selectedOfferTitle")}</h3>
                    <p className="text-sm text-slate-500">{t("pages.recruitment.selectedOfferSubtitle")}</p>
                  </div>
                  {selectedOffer ? <Badge variant={offerVariant(selectedOffer.status)}>{t(`enums.offerStatus.${selectedOffer.status}`)}</Badge> : null}
                </div>
                {!selectedOffer ? (
                  <p className="text-sm text-slate-500">{t("pages.recruitment.emptySelectedOffer")}</p>
                ) : (
                  <form className="grid gap-3" onSubmit={saveSelectedOffer}>
                    <Input aria-label="selected-offer-title" placeholder={t("pages.recruitment.offerTitle")} value={offerForm.title} onChange={(event) => setOfferForm((prev) => ({ ...prev, title: event.target.value }))} disabled={!canManageRecruitment} />
                    <Textarea placeholder={t("pages.recruitment.offerDescription")} rows={4} value={offerForm.description} onChange={(event) => setOfferForm((prev) => ({ ...prev, description: event.target.value }))} disabled={!canManageRecruitment} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input placeholder={t("pages.recruitment.contractType")} value={offerForm.contract_type} onChange={(event) => setOfferForm((prev) => ({ ...prev, contract_type: event.target.value }))} disabled={!canManageRecruitment} />
                      <Input placeholder={t("pages.recruitment.location")} value={offerForm.location} onChange={(event) => setOfferForm((prev) => ({ ...prev, location: event.target.value }))} disabled={!canManageRecruitment} />
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-white" value={offerForm.status} onChange={(event) => setOfferForm((prev) => ({ ...prev, status: event.target.value }))} disabled={!canManageRecruitment}>
                        {OFFER_STATUSES.map((status) => <option key={status} value={status}>{t(`enums.offerStatus.${status}`)}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder={t("pages.recruitment.salaryMin")} type="number" min="0" value={offerForm.salary_min} onChange={(event) => setOfferForm((prev) => ({ ...prev, salary_min: event.target.value }))} disabled={!canManageRecruitment} />
                      <Input placeholder={t("pages.recruitment.salaryMax")} type="number" min="0" value={offerForm.salary_max} onChange={(event) => setOfferForm((prev) => ({ ...prev, salary_max: event.target.value }))} disabled={!canManageRecruitment} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {OFFER_STATUSES.map((status) => (
                        <Button key={status} type="button" variant={status === selectedOffer.status ? "primary" : "outline"} disabled={!canManageRecruitment || mutation.loading} onClick={() => setOfferStatus(status)}>
                          {t(`enums.offerStatus.${status}`)}
                        </Button>
                      ))}
                    </div>
                    <Button type="submit" disabled={!canManageRecruitment || mutation.loading}>{t("pages.recruitment.saveOffer")}</Button>
                  </form>
                )}
              </Card>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.offersList")}</h3>
                <Badge variant="neutral">{offers.length}</Badge>
              </div>
              <div className="space-y-3">
                {!offers.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noOffers")}</p> : null}
                {offers.map((offer) => {
                  const active = selectedOfferId === offer.id;
                  return (
                    <button key={offer.id} type="button" onClick={() => setSelectedOfferId(offer.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-sky-400 bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/40"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-slate-900 dark:text-white">{offer.title}</h4>
                            <Badge variant={offerVariant(offer.status)}>{t(`enums.offerStatus.${offer.status}`)}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{offer.description}</p>
                        </div>
                        {active ? <Badge variant="info">{t("pages.recruitment.activeOffer")}</Badge> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{offer.contract_type || "--"}</span>
                        <span>{offer.location || t("pages.recruitment.locationNotSet")}</span>
                        <span>{salaryLabel(offer, i18n.resolvedLanguage, t("pages.recruitment.salaryNotSet"))}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.applicationsForOfferTitle")}</h3>
                  <p className="text-sm text-slate-500">{selectedOffer ? selectedOffer.title : t("pages.recruitment.applicationsForOfferHint")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-white" value={applicationStatusFilter} onChange={(event) => setApplicationStatusFilter(event.target.value)}>
                    <option value="">{t("pages.recruitment.allApplicationStatuses")}</option>
                    {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{t(`enums.applicationStatus.${status}`)}</option>)}
                  </select>
                  {canManageRecruitment ? <Button type="button" onClick={generateMatches} disabled={!selectedOfferId || mutation.loading}>{t("pages.recruitment.generateMatches")}</Button> : null}
                </div>
              </div>
              <div className="space-y-3">
                {!applications.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noApplicationsForOffer")}</p> : null}
                {applications.map((application) => {
                  const draft = applicationDrafts[application.id] || { status: application.status || "submitted", score: application.score == null ? "" : String(application.score), notes: application.notes || "" };
                  return (
                    <div key={application.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-slate-900 dark:text-white">{candidateName(application.candidate, application.candidate_id)}</h4>
                          <p className="text-sm text-slate-500">{application.candidate?.desired_position || t("pages.recruitment.positionNotSet")} · {application.candidate?.city || t("pages.recruitment.locationNotSet")}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={availabilityVariant(application.candidate?.availability_status)}>{t(`enums.availabilityStatus.${application.candidate?.availability_status || "immediate"}`)}</Badge>
                            <Badge variant="neutral">{t("pages.recruitment.profileScore")}: {application.candidate?.profile_score ?? "--"}</Badge>
                          </div>
                        </div>
                        <Badge variant={applicationVariant(application.status)}>{t(`enums.applicationStatus.${application.status}`)}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-[180px_140px_1fr_auto]">
                        <select aria-label={`application-status-${application.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-white" value={draft.status} onChange={(event) => setApplicationDrafts((prev) => ({ ...prev, [application.id]: { ...draft, status: event.target.value } }))} disabled={!canManageRecruitment}>
                          {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{t(`enums.applicationStatus.${status}`)}</option>)}
                        </select>
                        <Input aria-label={`application-score-${application.id}`} placeholder={t("pages.recruitment.applicationScore")} type="number" min="0" max="100" value={draft.score} onChange={(event) => setApplicationDrafts((prev) => ({ ...prev, [application.id]: { ...draft, score: event.target.value } }))} disabled={!canManageRecruitment} />
                        <Textarea aria-label={`application-notes-${application.id}`} placeholder={t("pages.recruitment.applicationNotes")} rows={2} value={draft.notes} onChange={(event) => setApplicationDrafts((prev) => ({ ...prev, [application.id]: { ...draft, notes: event.target.value } }))} disabled={!canManageRecruitment} />
                        {canManageRecruitment ? <Button type="button" onClick={() => updateApplication(application.id)} disabled={mutation.loading}>{t("pages.recruitment.updateApplication")}</Button> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.candidatesTitle")}</h3>
                  <p className="text-sm text-slate-500">{t("pages.recruitment.candidateSearchHint")}</p>
                </div>
                <Badge variant="neutral">{candidates.length}</Badge>
              </div>
              <div className="mb-4">
                <Input placeholder={t("pages.recruitment.candidateSearch")} value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} />
              </div>
              <div className="space-y-3">
                {!candidates.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noCandidates")}</p> : null}
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{candidateName(candidate, candidate.id)}</h4>
                        <p className="text-sm text-slate-500">{candidate.desired_position || t("pages.recruitment.positionNotSet")} · {candidate.city || t("pages.recruitment.locationNotSet")}</p>
                      </div>
                      <Badge variant={availabilityVariant(candidate.availability_status)}>{t(`enums.availabilityStatus.${candidate.availability_status}`)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{t("pages.recruitment.profileScore")}: {candidate.profile_score ?? "--"}</span>
                      <span>{t("pages.recruitment.yearsExperience")}: {candidate.years_experience ?? "--"}</span>
                      <span>{candidate.email || "--"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("pages.recruitment.matchesPanel")}</h3>
                  <p className="text-sm text-slate-500">{t("pages.recruitment.matchesPanelHint")}</p>
                </div>
                <Badge variant="neutral">{matches.length}</Badge>
              </div>
              <div className="space-y-3">
                {!matches.length ? <p className="text-sm text-slate-500">{t("pages.recruitment.noMatches")}</p> : null}
                {matches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{candidateName(match.candidate, match.candidate_id)}</h4>
                        <p className="text-sm text-slate-500">{match.candidate?.desired_position || t("pages.recruitment.positionNotSet")} · {match.job_offer?.title || `#${match.job_offer_id}`}</p>
                      </div>
                      <Badge variant="info">{match.match_score}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{match.rationale || t("pages.recruitment.noRationale")}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
