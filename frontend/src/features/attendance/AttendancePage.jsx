import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";


function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function compactParams(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

function badgeVariantForStatus(status) {
  if (status === "present") return "success";
  if (status === "late") return "warning";
  if (status === "absent") return "danger";
  if (status === "overtime") return "info";
  return "neutral";
}

function formatHoursFromMinutes(value) {
  const minutes = Number(value || 0);
  return (minutes / 60).toFixed(1);
}

function buildEmptyRecordForm() {
  return {
    id: null,
    user_id: "",
    project_id: "",
    attendance_date: todayIso(),
    status: "",
    arrival_time: "07:30",
    departure_time: "17:15",
    notes: "",
  };
}

function buildPolicyForm(policy) {
  return {
    default_start_time: policy?.default_start_time || "07:30",
    default_end_time: policy?.default_end_time || "17:15",
    grace_minutes: String(policy?.grace_minutes ?? 10),
    overtime_threshold_minutes: String(policy?.overtime_threshold_minutes ?? 60),
    timezone: policy?.timezone || "",
  };
}

function buildRecordFormFromRow(row) {
  return {
    id: row.id,
    user_id: row.user_id ? String(row.user_id) : "",
    project_id: row.project_id ? String(row.project_id) : "",
    attendance_date: row.attendance_date || todayIso(),
    status: row.status === "absent" ? "absent" : "",
    arrival_time: row.arrival_time || "07:30",
    departure_time: row.departure_time || "17:15",
    notes: row.notes || "",
  };
}

export function AttendancePage() {
  const { t } = useTranslation();
  const { user, tenantId } = useAuth();
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const canManageAttendance = user?.user_type === "super_admin" || user?.permissions?.includes("attendance.manage");

  const [filters, setFilters] = useState(() => ({
    date_from: monthStartIso(),
    date_to: todayIso(),
    user_id: "",
    project_id: "",
    status: "",
  }));
  const [recordForm, setRecordForm] = useState(() => buildEmptyRecordForm());
  const [policyForm, setPolicyForm] = useState(() => buildPolicyForm());
  const [feedback, setFeedback] = useState(null);

  const supportQuery = useApiQuery("/attendance/support-data", { enabled: canLoadTenantData });
  const recordsQuery = useApiQuery("/attendance", {
    enabled: canLoadTenantData,
    params: compactParams(filters),
  });
  const summaryQuery = useApiQuery("/attendance/summary", {
    enabled: canLoadTenantData,
    params: compactParams(filters),
  });
  const recordMutation = useApiMutation();
  const policyMutation = useApiMutation();

  const employees = supportQuery.data?.employees || [];
  const projects = supportQuery.data?.projects || [];
  const summary = summaryQuery.data?.summary || {};
  const trend = summaryQuery.data?.trend || [];
  const byProject = summaryQuery.data?.by_project || [];
  const records = recordsQuery.data?.items || [];

  const highlightedProject = useMemo(() => {
    if (filters.project_id) {
      return byProject.find((item) => String(item.project_id || "") === String(filters.project_id)) || null;
    }
    return byProject[0] || null;
  }, [byProject, filters.project_id]);

  useEffect(() => {
    if (!supportQuery.data?.policy) {
      return;
    }
    setPolicyForm(buildPolicyForm(supportQuery.data.policy));
  }, [supportQuery.data?.policy]);

  useEffect(() => {
    if (!employees.length) {
      return;
    }
    setRecordForm((current) => (
      current.user_id
        ? current
        : {
            ...current,
            user_id: String(employees[0].id),
          }
    ));
  }, [employees]);

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("pages.attendance.filters.allStatuses") },
      { value: "present", label: t("pages.attendance.statuses.present") },
      { value: "late", label: t("pages.attendance.statuses.late") },
      { value: "absent", label: t("pages.attendance.statuses.absent") },
      { value: "overtime", label: t("pages.attendance.statuses.overtime") },
    ],
    [t],
  );

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.attendance" />;
  }

  async function refreshAttendanceViews() {
    await Promise.all([recordsQuery.refetch(), summaryQuery.refetch(), supportQuery.refetch()]);
  }

  async function submitRecord(event) {
    event.preventDefault();
    setFeedback(null);

    const isAbsent = recordForm.status === "absent";
    const payload = compactParams({
      user_id: Number(recordForm.user_id),
      project_id: recordForm.project_id ? Number(recordForm.project_id) : undefined,
      attendance_date: recordForm.attendance_date,
      status: isAbsent ? "absent" : undefined,
      arrival_time: isAbsent ? undefined : recordForm.arrival_time,
      departure_time: isAbsent ? undefined : recordForm.departure_time,
      notes: recordForm.notes,
    });

    try {
      if (recordForm.id) {
        await recordMutation.mutate({
          method: "patch",
          url: `/attendance/${recordForm.id}`,
          data: payload,
        });
      } else {
        await recordMutation.mutate({
          method: "post",
          url: "/attendance",
          data: payload,
        });
      }

      setFeedback({ tone: "success", message: t("pages.attendance.messages.saved") });
      setRecordForm({
        ...buildEmptyRecordForm(),
        user_id: employees[0] ? String(employees[0].id) : "",
      });
      await refreshAttendanceViews();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error.response?.data?.message || t("pages.attendance.messages.saveFailed"),
      });
    }
  }

  async function submitPolicy(event) {
    event.preventDefault();
    setFeedback(null);

    try {
      await policyMutation.mutate({
        method: "patch",
        url: "/attendance/policy",
        data: {
          default_start_time: policyForm.default_start_time,
          default_end_time: policyForm.default_end_time,
          grace_minutes: Number(policyForm.grace_minutes || 0),
          overtime_threshold_minutes: Number(policyForm.overtime_threshold_minutes || 0),
          timezone: policyForm.timezone || undefined,
        },
      });
      setFeedback({ tone: "success", message: t("pages.attendance.messages.policySaved") });
      await refreshAttendanceViews();
    } catch (error) {
      setFeedback({
        tone: "danger",
        message: error.response?.data?.message || t("pages.attendance.messages.policySaveFailed"),
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-3 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t("pages.attendance.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("pages.attendance.title")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{t("pages.attendance.subtitle")}</p>
          </div>
          {feedback ? (
            <Badge variant={feedback.tone === "success" ? "success" : "danger"}>{feedback.message}</Badge>
          ) : null}
          {(supportQuery.error || recordsQuery.error || summaryQuery.error) ? (
            <p className="text-sm text-rose-600">
              {supportQuery.error || recordsQuery.error || summaryQuery.error}
            </p>
          ) : null}
        </Card>

        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("pages.attendance.summary.tracked")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.employees_tracked ?? 0}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("pages.attendance.summary.totalRecords")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_records ?? 0}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("pages.attendance.summary.lateHours")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatHoursFromMinutes(summary.late_minutes_total)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("pages.attendance.summary.overtimeHours")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatHoursFromMinutes(summary.overtime_minutes_total)}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["present", summary.present_count ?? 0],
          ["late", summary.late_count ?? 0],
          ["absent", summary.absent_count ?? 0],
          ["overtime", summary.overtime_count ?? 0],
        ].map(([status, count]) => (
          <Card key={status} className="space-y-2 p-4">
            <Badge variant={badgeVariantForStatus(status)}>{t(`pages.attendance.statuses.${status}`)}</Badge>
            <p className="text-2xl font-semibold text-slate-900">{count}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.filters.title")}</h2>
              <p className="text-sm text-slate-600">{t("pages.attendance.filters.subtitle")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFilters({
                  date_from: monthStartIso(),
                  date_to: todayIso(),
                  user_id: "",
                  project_id: "",
                  status: "",
                })
              }
            >
              {t("pages.attendance.filters.reset")}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <label htmlFor="attendance-filter-date-from" className="text-sm font-medium text-slate-700">
                {t("pages.attendance.filters.dateFrom")}
              </label>
              <Input
                id="attendance-filter-date-from"
                type="date"
                value={filters.date_from}
                onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="attendance-filter-date-to" className="text-sm font-medium text-slate-700">
                {t("pages.attendance.filters.dateTo")}
              </label>
              <Input
                id="attendance-filter-date-to"
                type="date"
                value={filters.date_to}
                onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="attendance-filter-user" className="text-sm font-medium text-slate-700">
                {t("pages.attendance.filters.employee")}
              </label>
              <select
                id="attendance-filter-user"
                className={LIST_SELECT_CLASS}
                value={filters.user_id}
                onChange={(event) => setFilters((current) => ({ ...current, user_id: event.target.value }))}
              >
                <option value="">{t("pages.attendance.filters.allEmployees")}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="attendance-filter-project" className="text-sm font-medium text-slate-700">
                {t("pages.attendance.filters.project")}
              </label>
              <select
                id="attendance-filter-project"
                className={LIST_SELECT_CLASS}
                value={filters.project_id}
                onChange={(event) => setFilters((current) => ({ ...current, project_id: event.target.value }))}
              >
                <option value="">{t("pages.attendance.filters.allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="attendance-filter-status" className="text-sm font-medium text-slate-700">
                {t("pages.attendance.filters.status")}
              </label>
              <select
                id="attendance-filter-status"
                className={LIST_SELECT_CLASS}
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.trend.title")}</h2>
            <p className="text-sm text-slate-600">{t("pages.attendance.trend.subtitle")}</p>
          </div>
          <div className="space-y-2">
            {trend.length ? trend.map((point) => (
              <div key={point.date} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{point.label}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{t("pages.attendance.statuses.present")}: {point.present}</span>
                    <span>{t("pages.attendance.statuses.late")}: {point.late}</span>
                    <span>{t("pages.attendance.statuses.absent")}: {point.absent}</span>
                    <span>{t("pages.attendance.statuses.overtime")}: {point.overtime}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">{t("pages.attendance.trend.empty")}</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.fieldOps.title")}</h2>
              <p className="text-sm text-slate-600">{t("pages.attendance.fieldOps.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline">
                <Link to="/app/planning">{t("pages.attendance.fieldOps.openPlanning")}</Link>
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link to="/app/projects">{t("pages.attendance.fieldOps.openProjects")}</Link>
              </Button>
            </div>
          </div>

          {byProject.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {byProject.map((bucket) => (
                <div key={bucket.project_id || "no-project"} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {bucket.project?.name || t("pages.attendance.fieldOps.noProject")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bucket.employees_tracked} {t("pages.attendance.fieldOps.tracked")}
                      </p>
                    </div>
                    <Badge variant={bucket.absent_count > 0 ? "warning" : "info"}>
                      {bucket.total_records} {t("pages.attendance.summary.totalRecords")}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {t("pages.attendance.fieldOps.lateHours")}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatHoursFromMinutes(bucket.late_minutes_total)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {t("pages.attendance.fieldOps.overtimeHours")}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatHoursFromMinutes(bucket.overtime_minutes_total)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{t("pages.attendance.statuses.present")}: {bucket.present_count || 0}</span>
                    <span>{t("pages.attendance.statuses.late")}: {bucket.late_count || 0}</span>
                    <span>{t("pages.attendance.statuses.absent")}: {bucket.absent_count || 0}</span>
                    <span>{t("pages.attendance.statuses.overtime")}: {bucket.overtime_count || 0}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {t("pages.attendance.fieldOps.latestDate")} {bucket.latest_attendance_date || "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("pages.attendance.fieldOps.empty")}</p>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.team.title")}</h2>
            <p className="text-sm text-slate-600">
              {filters.project_id
                ? t("pages.attendance.team.filteredSubtitle")
                : t("pages.attendance.team.subtitle")}
            </p>
          </div>
          {highlightedProject?.recent_records?.length ? (
            <div className="space-y-3">
              {highlightedProject.recent_records.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.user?.full_name || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {item.user?.job_title || "-"} · {item.attendance_date || "-"}
                      </p>
                    </div>
                    <Badge variant={badgeVariantForStatus(item.status)}>
                      {t(`pages.attendance.statuses.${item.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{t("pages.attendance.records.arrival")}: {item.arrival_time || "-"}</span>
                    <span>{t("pages.attendance.records.departure")}: {item.departure_time || "-"}</span>
                    <span>{t("pages.attendance.records.late")}: {item.minutes_late || 0} min</span>
                    <span>{t("pages.attendance.records.overtime")}: {item.overtime_minutes || 0} min</span>
                  </div>
                  {item.notes ? <p className="mt-2 text-sm text-slate-600">{item.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("pages.attendance.team.empty")}</p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {canManageAttendance ? (
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {recordForm.id ? t("pages.attendance.form.editTitle") : t("pages.attendance.form.createTitle")}
                </h2>
                <p className="text-sm text-slate-600">{t("pages.attendance.form.subtitle")}</p>
              </div>
              {recordForm.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecordForm({ ...buildEmptyRecordForm(), user_id: employees[0] ? String(employees[0].id) : "" })}
                >
                  {t("pages.attendance.form.cancelEdit")}
                </Button>
              ) : null}
            </div>

            <form className="space-y-4" onSubmit={submitRecord}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="attendance-form-user" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.form.employee")}
                  </label>
                  <select
                    id="attendance-form-user"
                    className={LIST_SELECT_CLASS}
                    value={recordForm.user_id}
                    onChange={(event) => setRecordForm((current) => ({ ...current, user_id: event.target.value }))}
                  >
                    <option value="">{t("pages.attendance.form.selectEmployee")}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-form-project" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.form.project")}
                  </label>
                  <select
                    id="attendance-form-project"
                    className={LIST_SELECT_CLASS}
                    value={recordForm.project_id}
                    onChange={(event) => setRecordForm((current) => ({ ...current, project_id: event.target.value }))}
                  >
                    <option value="">{t("pages.attendance.form.noProject")}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-form-date" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.form.date")}
                  </label>
                  <Input
                    id="attendance-form-date"
                    type="date"
                    value={recordForm.attendance_date}
                    onChange={(event) => setRecordForm((current) => ({ ...current, attendance_date: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-form-status" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.form.captureMode")}
                  </label>
                  <select
                    id="attendance-form-status"
                    className={LIST_SELECT_CLASS}
                    value={recordForm.status}
                    onChange={(event) => setRecordForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="">{t("pages.attendance.form.autoMode")}</option>
                    <option value="absent">{t("pages.attendance.form.absentMode")}</option>
                  </select>
                </div>
              </div>

              {recordForm.status !== "absent" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="attendance-form-arrival" className="text-sm font-medium text-slate-700">
                      {t("pages.attendance.form.arrivalTime")}
                    </label>
                    <Input
                      id="attendance-form-arrival"
                      type="time"
                      value={recordForm.arrival_time}
                      onChange={(event) => setRecordForm((current) => ({ ...current, arrival_time: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="attendance-form-departure" className="text-sm font-medium text-slate-700">
                      {t("pages.attendance.form.departureTime")}
                    </label>
                    <Input
                      id="attendance-form-departure"
                      type="time"
                      value={recordForm.departure_time}
                      onChange={(event) => setRecordForm((current) => ({ ...current, departure_time: event.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <label htmlFor="attendance-form-notes" className="text-sm font-medium text-slate-700">
                  {t("pages.attendance.form.notes")}
                </label>
                <Textarea
                  id="attendance-form-notes"
                  rows={4}
                  value={recordForm.notes}
                  onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>

              <Button type="submit" disabled={recordMutation.loading || !recordForm.user_id}>
                {recordForm.id ? t("pages.attendance.form.update") : t("pages.attendance.form.create")}
              </Button>
            </form>
          </Card>
        ) : null}

        {canManageAttendance ? (
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.policy.title")}</h2>
              <p className="text-sm text-slate-600">{t("pages.attendance.policy.subtitle")}</p>
            </div>
            <form className="space-y-4" onSubmit={submitPolicy}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="attendance-policy-start" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.policy.startTime")}
                  </label>
                  <Input
                    id="attendance-policy-start"
                    type="time"
                    value={policyForm.default_start_time}
                    onChange={(event) => setPolicyForm((current) => ({ ...current, default_start_time: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-policy-end" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.policy.endTime")}
                  </label>
                  <Input
                    id="attendance-policy-end"
                    type="time"
                    value={policyForm.default_end_time}
                    onChange={(event) => setPolicyForm((current) => ({ ...current, default_end_time: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-policy-grace" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.policy.graceMinutes")}
                  </label>
                  <Input
                    id="attendance-policy-grace"
                    type="number"
                    min="0"
                    value={policyForm.grace_minutes}
                    onChange={(event) => setPolicyForm((current) => ({ ...current, grace_minutes: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="attendance-policy-overtime" className="text-sm font-medium text-slate-700">
                    {t("pages.attendance.policy.overtimeThreshold")}
                  </label>
                  <Input
                    id="attendance-policy-overtime"
                    type="number"
                    min="0"
                    value={policyForm.overtime_threshold_minutes}
                    onChange={(event) => setPolicyForm((current) => ({ ...current, overtime_threshold_minutes: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="attendance-policy-timezone" className="text-sm font-medium text-slate-700">
                  {t("pages.attendance.policy.timezone")}
                </label>
                <Input
                  id="attendance-policy-timezone"
                  value={policyForm.timezone}
                  onChange={(event) => setPolicyForm((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="Africa/Douala"
                />
              </div>
              <Button type="submit" variant="outline" disabled={policyMutation.loading}>
                {t("pages.attendance.policy.save")}
              </Button>
            </form>
          </Card>
        ) : null}
      </section>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t("pages.attendance.records.title")}</h2>
          <p className="text-sm text-slate-600">{t("pages.attendance.records.subtitle")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">{t("pages.attendance.records.date")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.employee")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.project")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.status")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.arrival")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.departure")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.late")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.overtime")}</th>
                <th className="px-3 py-2">{t("pages.attendance.records.notes")}</th>
                {canManageAttendance ? <th className="px-3 py-2">{t("pages.attendance.records.actions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.length ? records.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">{item.attendance_date}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">{item.user?.full_name || "-"}</div>
                    <div className="text-xs text-slate-500">{item.user?.job_title || "-"}</div>
                  </td>
                  <td className="px-3 py-3">{item.project?.name || t("pages.attendance.records.noProject")}</td>
                  <td className="px-3 py-3">
                    <Badge variant={badgeVariantForStatus(item.status)}>
                      {t(`pages.attendance.statuses.${item.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{item.arrival_time || "-"}</td>
                  <td className="px-3 py-3">{item.departure_time || "-"}</td>
                  <td className="px-3 py-3">{item.minutes_late || 0} min</td>
                  <td className="px-3 py-3">{item.overtime_minutes || 0} min</td>
                  <td className="px-3 py-3 text-slate-600">{item.notes || "-"}</td>
                  {canManageAttendance ? (
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setRecordForm(buildRecordFormFromRow(item))}
                      >
                        {t("pages.attendance.records.edit")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              )) : (
                <tr>
                  <td
                    colSpan={canManageAttendance ? 10 : 9}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    {t("pages.attendance.records.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
