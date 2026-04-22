import { useEffect, useMemo, useState } from "react";
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
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const EMPTY_FORM = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
  login_identifier: "",
  employee_number: "",
  user_type: "employee",
  preferred_language: "fr",
  operational_profile_code: "",
  job_title: "",
  department: "",
  contract_type: "",
  hire_date: "",
  hierarchy_level: 3,
  organization_unit_id: "",
  role_ids: [],
};

const EMPTY_UNIT_FORM = { code: "", name: "", unit_type: "service", parent_unit_id: "" };
const EMPTY_FILTERS = {
  search: "",
  department: "",
  contract_type: "",
  account_status: "",
  user_type: "",
  organization_unit_id: "",
  include_inactive: true,
};
const EMPTY_SECURITY_FORM = {
  new_password: "",
  must_change_password: true,
};
const EMPTY_HR_FILE_FORM = {
  hire_date: "",
  contract_type: "",
  base_salary: "",
  hierarchy_level: "",
  employment_end_date: "",
  exit_reason: "",
  identity_document_type: "",
  identity_document_number: "",
  identity_issue_date: "",
  identity_document_url: "",
  taxpayer_number: "",
  cv_url: "",
  category: "",
  echelon: "",
  cnps_number: "",
  convention_collective: "",
  employment_label: "",
  hours_schedule: "",
  family_status: "",
  bank_account_number: "",
  bank_domiciliation: "",
  payment_method: "bank_transfer",
  transport_allowance: "",
  other_fixed_gains: "",
  payroll_notes: "",
  is_payroll_enabled: true,
};

const ACCOUNT_STATUS_OPTIONS = ["active", "inactive", "suspended", "locked", "exited"];
const USER_TYPE_OPTIONS = ["employee", "company_admin", "external_controller", "job_seeker"];
const CONTRACT_TYPE_OPTIONS = ["CDI", "CDD", "Interim", "Stage", "Consultant"];
const HR_IDENTITY_DOCUMENT_TYPES = ["cni", "passport", "other"];
const HR_PAYMENT_METHOD_OPTIONS = ["cash", "bank_transfer", "mobile_money", "check", "other"];

function getProfileDefaults(profile) {
  const assignment = profile?.default_assignment || {};
  return {
    operational_profile_code: profile?.code || "",
    user_type: assignment.user_type || "employee",
    job_title: assignment.job_title || "",
    department: assignment.department || "",
    hierarchy_level: assignment.hierarchy_level ?? 3,
    organization_unit_id: assignment.organization_unit_id ?? profile?.default_organization_unit_id ?? "",
    role_ids: profile?.default_role_ids || [],
  };
}

function buildCreateForm(profile, previous = EMPTY_FORM) {
  return {
    ...EMPTY_FORM,
    preferred_language: previous.preferred_language || "fr",
    ...getProfileDefaults(profile),
  };
}

function buildEditForm(userRecord) {
  return {
    ...EMPTY_FORM,
    email: userRecord.email || "",
    first_name: userRecord.first_name || "",
    last_name: userRecord.last_name || "",
    phone: userRecord.phone || "",
    login_identifier: userRecord.login_identifier || "",
    employee_number: userRecord.employee_number || "",
    user_type: userRecord.user_type || "employee",
    preferred_language: userRecord.preferred_language || "fr",
    operational_profile_code: userRecord.operational_profile_code || "",
    job_title: userRecord.job_title || "",
    department: userRecord.department || "",
    contract_type: userRecord.contract_type || "",
    hire_date: userRecord.hire_date || "",
    hierarchy_level: userRecord.hierarchy_level ?? 3,
    organization_unit_id: userRecord.organization_unit_id ?? "",
    role_ids: (userRecord.roles || []).map((role) => role.id).filter(Boolean),
  };
}

function toEditableValue(value) {
  return value == null ? "" : String(value);
}

function buildHrFileForm(userRecord, payrollPayload) {
  const payrollProfile = payrollPayload?.profile || {};
  const payrollEmployee = payrollPayload?.employee || {};
  return {
    ...EMPTY_HR_FILE_FORM,
    hire_date: toEditableValue(userRecord?.hire_date),
    contract_type: toEditableValue(userRecord?.contract_type),
    base_salary: toEditableValue(userRecord?.base_salary ?? payrollEmployee.base_salary),
    hierarchy_level: toEditableValue(userRecord?.hierarchy_level),
    employment_end_date: toEditableValue(userRecord?.employment_end_date),
    exit_reason: toEditableValue(userRecord?.exit_reason),
    identity_document_type: toEditableValue(userRecord?.identity_document_type),
    identity_document_number: toEditableValue(userRecord?.identity_document_number),
    identity_issue_date: toEditableValue(userRecord?.identity_issue_date),
    identity_document_url: toEditableValue(userRecord?.identity_document_url),
    taxpayer_number: toEditableValue(userRecord?.taxpayer_number),
    cv_url: toEditableValue(userRecord?.cv_url),
    category: toEditableValue(payrollProfile.category),
    echelon: toEditableValue(payrollProfile.echelon),
    cnps_number: toEditableValue(payrollProfile.cnps_number),
    convention_collective: toEditableValue(payrollProfile.convention_collective),
    employment_label: toEditableValue(payrollProfile.employment_label),
    hours_schedule: toEditableValue(payrollProfile.hours_schedule),
    family_status: toEditableValue(payrollProfile.family_status),
    bank_account_number: toEditableValue(payrollProfile.bank_account_number),
    bank_domiciliation: toEditableValue(payrollProfile.bank_domiciliation),
    payment_method: toEditableValue(payrollProfile.payment_method || "bank_transfer"),
    transport_allowance: toEditableValue(payrollProfile.transport_allowance),
    other_fixed_gains: toEditableValue(payrollProfile.other_fixed_gains),
    payroll_notes: toEditableValue(payrollProfile.payroll_notes),
    is_payroll_enabled: payrollProfile.is_payroll_enabled ?? true,
  };
}

function toNullableString(value) {
  return String(value || "").trim() || null;
}

function toNullableNumber(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveManagedAssetUrl(userRecord, assetKind) {
  const rawValue = assetKind === "identity_document" ? userRecord?.identity_document_url : userRecord?.cv_url;
  const normalized = String(rawValue || "").trim();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  return `/api/v1/users/${userRecord.id}/profile-assets/${assetKind}`;
}

function matrixColumns(t) {
  return [
    { key: "role", label: t("pages.users.matrix.role") },
    { key: "projects", label: t("pages.users.matrix.projects") },
    { key: "inventory", label: t("pages.users.matrix.inventory") },
    { key: "finance", label: t("pages.users.matrix.finance") },
    { key: "hr", label: t("pages.users.matrix.hr") },
  ];
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function profileMatchesCode(profile, profileCode) {
  const normalizedProfileCode = String(profileCode || "").trim();
  if (!profile || !normalizedProfileCode) {
    return false;
  }

  if (profile.code === normalizedProfileCode) {
    return true;
  }

  return (profile.linked_roles || []).some((role) => role?.code === normalizedProfileCode);
}

function isProfileComplete(userRecord) {
  return Boolean(
    (userRecord?.job_title || "").trim() &&
      (userRecord?.department || "").trim() &&
      (userRecord?.employee_number || "").trim()
  );
}

function normalizeCount(value) {
  return Number(value || 0);
}

function getStatusVariant(status) {
  if (status === "active") {
    return "success";
  }
  if (status === "locked" || status === "suspended") {
    return "warning";
  }
  if (status === "exited" || status === "archived") {
    return "danger";
  }
  return "neutral";
}

function formatDateTime(value, locale) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function SummaryMetric({ label, value, hint, variant = "neutral" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <Badge variant={variant}>{value}</Badge>
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

function UsersPageContent({ user }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const canManage = user?.user_type === "super_admin" || user?.permissions?.includes("users.manage");
  const canReadPayrollProfiles = user?.user_type === "super_admin" || user?.permissions?.includes("payroll.read");
  const canManagePayrollProfiles = user?.user_type === "super_admin" || user?.permissions?.includes("payroll.manage");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [form, setForm] = useState(() => buildCreateForm(null));
  const [editingUserId, setEditingUserId] = useState(null);
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT_FORM);
  const [securityTargetId, setSecurityTargetId] = useState(null);
  const [securityForm, setSecurityForm] = useState(EMPTY_SECURITY_FORM);
  const [hrFileTargetId, setHrFileTargetId] = useState(null);
  const [hrFileForm, setHrFileForm] = useState(EMPTY_HR_FILE_FORM);
  const [hrFileDirty, setHrFileDirty] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const { mutate, loading: saving, error: mutationError, setError } = useApiMutation();

  const userQueryParams = useMemo(
    () => ({
      include_inactive: filters.include_inactive,
      search: filters.search || undefined,
      department: filters.department || undefined,
      contract_type: filters.contract_type || undefined,
      account_status: filters.account_status || undefined,
      user_type: filters.user_type || undefined,
      organization_unit_id: filters.organization_unit_id ? Number(filters.organization_unit_id) : undefined,
    }),
    [filters]
  );

  const { data: usersData, loading, error, refetch } = useApiQuery("/users", {
    enabled: true,
    params: userQueryParams,
  });
  const { data: profilesData, loading: profilesLoading, error: profilesError } = useApiQuery("/users/operational-profiles", {
    enabled: true,
  });
  const {
    data: organizationData,
    loading: organizationLoading,
    error: organizationError,
    refetch: refetchOrganization,
  } = useApiQuery("/users/organization-units", { enabled: true });
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useApiQuery("/users/dashboard", { enabled: true });
  const hrPayrollProfileUrl = hrFileTargetId ? `/payroll/employees/${hrFileTargetId}/profile` : null;
  const {
    data: hrPayrollProfileData,
    loading: hrPayrollProfileLoading,
    error: hrPayrollProfileError,
    refetch: refetchHrPayrollProfile,
  } = useApiQuery(hrPayrollProfileUrl, {
    enabled: Boolean(hrFileTargetId) && Boolean(canReadPayrollProfiles),
  });
  const {
    data: hrActivityData,
    loading: hrActivityLoading,
    error: hrActivityError,
    refetch: refetchHrActivity,
  } = useApiQuery("/users/activity-logs", {
    enabled: Boolean(hrFileTargetId),
    params: hrFileTargetId ? { user_id: hrFileTargetId, limit: 8 } : undefined,
  });

  const isEditing = editingUserId !== null;
  const profiles = profilesData?.items || [];
  const interactions = profilesData?.interactions || [];
  const accessMatrix = profilesData?.access_matrix || [];
  const users = usersData?.items || [];
  const units = organizationData?.items || [];
  const dashboard = dashboardData || {};
  const dashboardUsers = dashboard.users || {};
  const personnel = dashboard.personnel || {};
  const attendance = dashboard.attendance || {};
  const leaveRequests = dashboard.leave_requests || {};
  const alerts = dashboard.alerts || [];
  const activityRows = dashboard.latest_activity || [];
  const byDepartment = dashboardUsers.by_department || {};
  const byContractType = dashboardUsers.by_contract_type || {};
  const byAccountStatus = dashboardUsers.by_account_status || {};
  const leaveRequestsByType = leaveRequests.pending_by_type || {};
  const hrTargetUser = useMemo(
    () => users.find((item) => item.id === hrFileTargetId) || null,
    [hrFileTargetId, users]
  );
  const hrActivityRows = hrActivityData?.items || [];

  const selectedProfile = useMemo(() => {
    const match = profiles.find((profile) => profileMatchesCode(profile, form.operational_profile_code)) || null;
    if (match) {
      return match;
    }

    if (isEditing) {
      return null;
    }

    return profiles.length === 1 ? profiles[0] : null;
  }, [form.operational_profile_code, isEditing, profiles]);

  const selectedProfilePermissions = useMemo(
    () => uniqueStrings((selectedProfile?.linked_roles || []).flatMap((role) => role.permissions || [])),
    [selectedProfile]
  );

  const departmentOptions = useMemo(
    () => uniqueStrings([...Object.keys(byDepartment), ...users.map((item) => item.department)]),
    [byDepartment, users]
  );
  const contractOptions = useMemo(
    () => uniqueStrings([...CONTRACT_TYPE_OPTIONS, ...Object.keys(byContractType), ...users.map((item) => item.contract_type)]),
    [byContractType, users]
  );

  useEffect(() => {
    if (
      profiles.length !== 1 ||
      isEditing ||
      profiles.some((profile) => profileMatchesCode(profile, form.operational_profile_code))
    ) {
      return;
    }

    setForm((previous) => ({ ...previous, ...getProfileDefaults(profiles[0]) }));
  }, [form.operational_profile_code, isEditing, profiles]);

  useEffect(() => {
    if (!hrTargetUser) {
      setHrFileForm(EMPTY_HR_FILE_FORM);
      setHrFileDirty(false);
      return;
    }

    if (hrFileDirty) {
      return;
    }

    setHrFileForm(buildHrFileForm(hrTargetUser, hrPayrollProfileData));
  }, [hrTargetUser, hrPayrollProfileData, hrFileDirty]);

  const onChange = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const onUnitChange = (key, value) => setUnitForm((previous) => ({ ...previous, [key]: value }));
  const onFilterChange = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  const applyProfile = (profile) => {
    setForm((previous) => ({ ...previous, ...getProfileDefaults(profile) }));
    setError(null);
    setActionMessage(null);
  };
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const resetSecurityPanel = () => {
    setSecurityTargetId(null);
    setSecurityForm(EMPTY_SECURITY_FORM);
  };
  const resetHrFilePanel = () => {
    setHrFileTargetId(null);
    setHrFileForm(EMPTY_HR_FILE_FORM);
    setHrFileDirty(false);
  };
  const resetForm = () => {
    setEditingUserId(null);
    setForm(buildCreateForm(selectedProfile || profiles[0] || null, form));
    setError(null);
    setActionMessage(null);
  };

  const refreshPersonnelWorkspace = async () => {
    await refetch();
    await refetchDashboard();
    await refetchOrganization();
  };

  const updateHrFileField = (key, value) => {
    setHrFileDirty(true);
    setHrFileForm((previous) => ({ ...previous, [key]: value }));
  };

  const submitUser = async (event) => {
    event.preventDefault();
    const organizationUnitId = form.organization_unit_id === "" ? null : Number(form.organization_unit_id);
    const payload = {
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || undefined,
      login_identifier: form.login_identifier || undefined,
      employee_number: form.employee_number || undefined,
      user_type: form.user_type,
      preferred_language: form.preferred_language,
      operational_profile_code: form.operational_profile_code || undefined,
      job_title: form.job_title || undefined,
      department: form.department || undefined,
      contract_type: form.contract_type || undefined,
      hire_date: form.hire_date || undefined,
      hierarchy_level: form.hierarchy_level || undefined,
      organization_unit_id: isEditing ? organizationUnitId : organizationUnitId ?? undefined,
      role_ids: form.role_ids,
    };

    if (!isEditing) {
      payload.password = form.password;
    }

    try {
      const result = await mutate({
        method: isEditing ? "patch" : "post",
        url: isEditing ? `/users/${editingUserId}` : "/users",
        data: payload,
      });
      resetForm();
      setActionMessage(result?.message || null);
      await refreshPersonnelWorkspace();
    } catch {}
  };

  const submitUnit = async (event) => {
    event.preventDefault();
    try {
      const result = await mutate({
        method: "post",
        url: "/users/organization-units",
        data: {
          code: unitForm.code,
          name: unitForm.name,
          unit_type: unitForm.unit_type,
          parent_unit_id: unitForm.parent_unit_id ? Number(unitForm.parent_unit_id) : undefined,
        },
      });
      setUnitForm(EMPTY_UNIT_FORM);
      setActionMessage(result?.message || null);
      await refetchOrganization();
    } catch {}
  };

  const updateUserStatus = async (item, nextStatus) => {
    try {
      const result = await mutate({
        method: "patch",
        url: `/users/${item.id}/status`,
        data: {
          account_status: nextStatus,
          reason: nextStatus === "suspended" ? "Suspended from personnel workspace" : undefined,
        },
      });
      setActionMessage(result?.message || null);
      await refreshPersonnelWorkspace();
    } catch {}
  };

  const submitPasswordReset = async (userId) => {
    if ((securityForm.new_password || "").trim().length < 8) {
      setError(t("pages.users.passwordLengthError"));
      return;
    }

    try {
      const result = await mutate({
        method: "post",
        url: `/users/${userId}/reset-password`,
        data: {
          new_password: securityForm.new_password.trim(),
          must_change_password: securityForm.must_change_password,
        },
      });
      setActionMessage(result?.message || null);
      resetSecurityPanel();
      await refreshPersonnelWorkspace();
    } catch {}
  };

  const forceLogout = async (userId) => {
    try {
      const result = await mutate({
        method: "post",
        url: `/users/${userId}/force-logout`,
        data: {},
      });
      setActionMessage(result?.message || null);
      await refreshPersonnelWorkspace();
    } catch {}
  };

  const submitHrFile = async (userId) => {
    const userPayload = {
      hire_date: hrFileForm.hire_date || null,
      contract_type: hrFileForm.contract_type || null,
      base_salary: toNullableNumber(hrFileForm.base_salary),
      hierarchy_level: toNullableNumber(hrFileForm.hierarchy_level),
      employment_end_date: hrFileForm.employment_end_date || null,
      exit_reason: toNullableString(hrFileForm.exit_reason),
      identity_document_type: hrFileForm.identity_document_type || null,
      identity_document_number: toNullableString(hrFileForm.identity_document_number),
      identity_issue_date: hrFileForm.identity_issue_date || null,
      identity_document_url: toNullableString(hrFileForm.identity_document_url),
      taxpayer_number: toNullableString(hrFileForm.taxpayer_number),
      cv_url: toNullableString(hrFileForm.cv_url),
    };

    const payrollPayload = {
      category: toNullableString(hrFileForm.category),
      echelon: toNullableString(hrFileForm.echelon),
      cnps_number: toNullableString(hrFileForm.cnps_number),
      convention_collective: toNullableString(hrFileForm.convention_collective),
      employment_label: toNullableString(hrFileForm.employment_label),
      hours_schedule: toNullableString(hrFileForm.hours_schedule),
      family_status: toNullableString(hrFileForm.family_status),
      bank_account_number: toNullableString(hrFileForm.bank_account_number),
      bank_domiciliation: toNullableString(hrFileForm.bank_domiciliation),
      payment_method: hrFileForm.payment_method || null,
      transport_allowance: toNullableNumber(hrFileForm.transport_allowance),
      other_fixed_gains: toNullableNumber(hrFileForm.other_fixed_gains),
      payroll_notes: toNullableString(hrFileForm.payroll_notes),
      is_payroll_enabled: Boolean(hrFileForm.is_payroll_enabled),
    };

    try {
      if (canManage) {
        await mutate({
          method: "patch",
          url: `/users/${userId}`,
          data: userPayload,
        });
      }

      if (canManagePayrollProfiles) {
        await mutate({
          method: "patch",
          url: `/payroll/employees/${userId}/profile`,
          data: payrollPayload,
        });
      }

      setHrFileDirty(false);
      setActionMessage(t("pages.users.hrFile.saved"));
      await refreshPersonnelWorkspace();
      if (canReadPayrollProfiles) {
        await refetchHrPayrollProfile();
      }
      await refetchHrActivity();
    } catch {}
  };

  const translateAlert = (alert) => {
    const translationKeyByType = {
      subscription_expiring: "subscriptionExpiring",
      low_stock: "lowStock",
      suspended_users: "suspendedUsers",
      incomplete_profiles: "incompleteProfiles",
      pending_leave_requests: "pendingLeaveRequests",
      attendance_absences: "attendanceAbsences",
      attendance_lateness: "attendanceLateness",
      attendance_tracking_missing: "attendanceTrackingMissing",
    };
    const translationKey = translationKeyByType[alert?.type];
    if (!translationKey) {
      return alert?.message || "";
    }
    return t(`pages.users.alertMessages.${translationKey}`, {
      count: alert?.count,
      days: alert?.days_remaining,
      period: alert?.days,
    });
  };

  const formatLeaveTypeLabel = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return t("pages.users.notProvided");
    }
    return t(`pages.users.leaveTypes.${normalized}`, { defaultValue: normalized });
  };

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="w-fit bg-white/15 text-white" variant="neutral">
              {t("pages.users.operationalBadge")}
            </Badge>
            <h2 className="mt-2 text-2xl font-semibold">{t("pages.users.title")}</h2>
            <p className="text-sm text-slate-200">{t("pages.users.subtitle")}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-slate-300">{t("pages.users.catalogTitle")}</p>
              <p className="text-lg font-semibold">{profiles.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-slate-300">{t("pages.users.existingUsers")}</p>
              <p className="text-lg font-semibold">{usersData?.count ?? users.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-slate-300">{t("pages.users.organizationTitle")}</p>
              <p className="text-lg font-semibold">{units.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.directoryTitle")}</h3>
          <p className="text-sm text-slate-600">{t("pages.users.directoryHint")}</p>
        </div>
        {dashboardLoading && <p className="text-sm text-slate-600">{t("common.loading")}</p>}
        {dashboardError && <p className="text-sm text-red-600">{dashboardError}</p>}
        <div className="grid gap-3 xl:grid-cols-5">
          <SummaryMetric
            label={t("pages.users.totalUsers")}
            value={normalizeCount(dashboardUsers.total)}
            hint={t("pages.users.teamTitle")}
            variant="neutral"
          />
          <SummaryMetric
            label={t("pages.users.activeUsers")}
            value={normalizeCount(dashboardUsers.active)}
            hint={t("pages.users.profileComplete")}
            variant="success"
          />
          <SummaryMetric
            label={t("pages.users.suspendedUsers")}
            value={normalizeCount(byAccountStatus.suspended) + normalizeCount(byAccountStatus.locked)}
            hint={t("pages.users.status")}
            variant="warning"
          />
          <SummaryMetric
            label={t("pages.users.incompleteProfiles")}
            value={normalizeCount(personnel.incomplete_profiles)}
            hint={t("pages.users.profileIncomplete")}
            variant="warning"
          />
          <SummaryMetric
            label={t("pages.users.recentHires")}
            value={normalizeCount(personnel.recent_hires_30d)}
            hint={t("pages.users.contractHint")}
            variant="info"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.topDepartments")}</h4>
                <p className="text-sm text-slate-600">{t("pages.users.organisationHint")}</p>
              </div>
              <Badge variant="neutral">{departmentOptions.length}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {departmentOptions.slice(0, 8).map((department) => (
                <Badge key={department} variant="neutral">
                  {department}: {normalizeCount(byDepartment[department])}
                </Badge>
              ))}
              {!departmentOptions.length && <p className="text-sm text-slate-600">{t("common.noData")}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.topContracts")}</h4>
                <p className="text-sm text-slate-600">{t("pages.users.contractHint")}</p>
              </div>
              <Badge variant="neutral">{Object.keys(byContractType).length}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(byContractType)
                .sort((left, right) => normalizeCount(right[1]) - normalizeCount(left[1]))
                .slice(0, 8)
                .map(([contractType, count]) => (
                  <Badge key={contractType} variant="neutral">
                    {contractType}: {normalizeCount(count)}
                  </Badge>
                ))}
              {!Object.keys(byContractType).length && <p className="text-sm text-slate-600">{t("common.noData")}</p>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.attendanceInsightsTitle")}</h4>
                <p className="text-sm text-slate-600">
                  {t("pages.users.attendanceWindowHint", {
                    days: normalizeCount(attendance.lookback_days) || 30,
                  })}
                </p>
              </div>
              <Badge variant={normalizeCount(attendance.unjustified_absent_records) ? "warning" : "success"}>
                {normalizeCount(attendance.tracked_records)}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryMetric
                label={t("pages.users.attendanceTracked")}
                value={normalizeCount(attendance.tracked_records)}
                hint={t("pages.users.attendanceInsightsHint")}
                variant="neutral"
              />
              <SummaryMetric
                label={t("pages.users.employeesTracked")}
                value={normalizeCount(attendance.employees_tracked)}
                hint={t("pages.users.teamTitle")}
                variant="info"
              />
              <SummaryMetric
                label={t("pages.users.lateRecords")}
                value={normalizeCount(attendance.late_records)}
                hint={t("pages.users.activityTitle")}
                variant={normalizeCount(attendance.late_records) ? "warning" : "success"}
              />
              <SummaryMetric
                label={t("pages.users.unjustifiedAbsences")}
                value={normalizeCount(attendance.unjustified_absent_records)}
                hint={t("pages.users.alertsTitle")}
                variant={normalizeCount(attendance.unjustified_absent_records) ? "warning" : "success"}
              />
              <SummaryMetric
                label={t("pages.users.overtimeRecords")}
                value={normalizeCount(attendance.overtime_records)}
                hint={t("pages.users.contractHint")}
                variant="info"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.leaveQueueTitle")}</h4>
                <p className="text-sm text-slate-600">{t("pages.users.leaveQueueHint")}</p>
              </div>
              <Badge variant={normalizeCount(leaveRequests.pending_requests) ? "warning" : "success"}>
                {normalizeCount(leaveRequests.pending_requests)}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label={t("pages.users.pendingLeaveRequests")}
                value={normalizeCount(leaveRequests.pending_requests)}
                hint={t("pages.users.alertsTitle")}
                variant={normalizeCount(leaveRequests.pending_requests) ? "warning" : "success"}
              />
              <SummaryMetric
                label={t("pages.users.pendingLeaveDays")}
                value={leaveRequests.pending_days_total ?? 0}
                hint={t("pages.users.leaveQueueHint")}
                variant="neutral"
              />
              <SummaryMetric
                label={t("pages.users.approvedLeaveLast30d")}
                value={normalizeCount(leaveRequests.approved_last_30d)}
                hint={t("pages.users.attendanceWindowHint", {
                  days: normalizeCount(leaveRequests.lookback_days) || 30,
                })}
                variant="success"
              />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{t("pages.users.leaveTypeBreakdownTitle")}</p>
                <Badge variant="neutral">{Object.keys(leaveRequestsByType).length}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(leaveRequestsByType).map(([type, count]) => (
                  <Badge key={type} variant="neutral">
                    {formatLeaveTypeLabel(type)}: {normalizeCount(count)}
                  </Badge>
                ))}
                {!Object.keys(leaveRequestsByType).length && (
                  <p className="text-sm text-slate-600">{t("pages.users.leaveTypeEmpty")}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.alertsTitle")}</h4>
                <p className="text-sm text-slate-600">{t("pages.users.activityTitle")}</p>
              </div>
              <Badge variant={alerts.length ? "warning" : "success"}>{alerts.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <div key={`${alert.type}-${alert.count || alert.days_remaining || 0}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{translateAlert(alert)}</p>
                </div>
              ))}
              {!alerts.length && <p className="text-sm text-slate-600">{t("pages.users.noAlerts")}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{t("pages.users.recentActivity")}</h4>
                <p className="text-sm text-slate-600">{t("pages.users.listSubtitle")}</p>
              </div>
              <Badge variant="neutral">{activityRows.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {activityRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{row.description || row.action}</p>
                    <Badge variant="neutral">{formatDateTime(row.created_at, locale)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {[row.actor_email, row.module].filter(Boolean).join(" / ")}
                  </p>
                </div>
              ))}
              {!activityRows.length && <p className="text-sm text-slate-600">{t("pages.users.noRecentActivity")}</p>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.catalogTitle")}</h3>
              <p className="text-sm text-slate-600">{t("pages.users.catalogSubtitle")}</p>
            </div>
            {profilesLoading && <p className="text-sm text-slate-600">{t("common.loading")}</p>}
            {profilesError && <p className="text-sm text-red-600">{profilesError}</p>}
            <div className="grid gap-3 lg:grid-cols-2">
              {profiles.map((profile) => (
                <button
                  key={profile.code}
                  type="button"
                  onClick={() => applyProfile(profile)}
                  className={[
                    "rounded-2xl border p-4 text-left transition-colors",
                    selectedProfile?.code === profile.code
                      ? "border-primary bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{profile.name}</p>
                      <p className={selectedProfile?.code === profile.code ? "text-sm text-slate-200" : "text-sm text-slate-600"}>
                        {profile.definition}
                      </p>
                    </div>
                    <Badge variant={selectedProfile?.code === profile.code ? "success" : "neutral"}>
                      {profile.linked_roles.length}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(profile.system_access || []).slice(0, 4).map((access) => (
                      <Badge key={`${profile.code}-${access.module}`} variant="neutral">
                        {access.module}: {access.level}
                      </Badge>
                    ))}
                    {profile.default_organization_unit ? (
                      <Badge variant="neutral">{profile.default_organization_unit.name}</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.selectedProfile")}</h3>
              <p className="text-sm text-slate-600">{selectedProfile?.definition || t("pages.users.noProfileSelected")}</p>
            </div>

            {!selectedProfile && <p className="text-sm text-slate-600">{t("pages.users.noProfiles")}</p>}

            {selectedProfile ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{selectedProfile.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{selectedProfile.definition}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral">
                        {t("pages.users.linkedRoles")}: {(selectedProfile.linked_roles || []).length}
                      </Badge>
                      <Badge variant="neutral">
                        {t("pages.users.typeFixed")}:{" "}
                        {t(`enums.userType.${selectedProfile.default_assignment?.user_type || "employee"}`)}
                      </Badge>
                      {selectedProfile.default_assignment?.hierarchy_level != null ? (
                        <Badge variant="neutral">N{selectedProfile.default_assignment.hierarchy_level}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.linkedRoles")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedProfile.linked_roles || []).map((role) => (
                        <Badge key={`${selectedProfile.code}-${role.code}`} variant="neutral">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">{t("pages.users.permissions")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedProfilePermissions.map((permission) => (
                        <Badge key={`${selectedProfile.code}-${permission}`} variant="neutral">
                          {permission}
                        </Badge>
                      ))}
                      {!selectedProfilePermissions.length ? (
                        <p className="text-sm text-slate-600">{t("common.noData")}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.systemAccess")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedProfile.system_access || []).map((access) => (
                        <Badge key={`${selectedProfile.code}-${access.module}-full`} variant="neutral">
                          {access.module}: {access.level}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {t("pages.users.organizationAssignmentLabel")}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedProfile.default_organization_unit?.name || t("pages.users.noOrganizationUnit")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedProfile.default_assignment?.job_title || t("pages.users.notProvided")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.missions")}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {(selectedProfile.missions || []).map((mission) => (
                        <p key={`${selectedProfile.code}-${mission}`}>{mission}</p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.functionalities")}</p>
                    <div className="mt-3 space-y-3">
                      {(selectedProfile.feature_groups || []).map((group) => (
                        <div key={`${selectedProfile.code}-${group.title}`}>
                          <p className="text-sm font-medium text-slate-800">{group.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(group.items || []).map((item) => (
                              <Badge key={`${group.title}-${item}`} variant="neutral">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.indicators")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedProfile.indicators || []).map((indicator) => (
                        <Badge key={`${selectedProfile.code}-${indicator}`} variant="neutral">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t("pages.users.controls")}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {(selectedProfile.controls || []).map((control) => (
                        <p key={`${selectedProfile.code}-${control}`}>{control}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.interactionsTitle")}</h3>
              <p className="text-sm text-slate-600">{t("pages.users.interactionsSubtitle")}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {interactions.map((interaction) => (
                <div
                  key={`${interaction.source}-${interaction.target}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-medium text-slate-900">
                    {interaction.source} / {interaction.target}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{interaction.description}</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="responsive-scroll">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-5 gap-px bg-slate-200 text-xs font-semibold text-slate-700">
                    {matrixColumns(t).map((column) => (
                      <div key={column.key} className="bg-slate-100 px-3 py-2">
                        {column.label}
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-slate-200 bg-white text-sm">
                    {accessMatrix.map((row) => (
                      <div key={row.role} className="grid grid-cols-5">
                        {matrixColumns(t).map((column) => (
                          <div key={`${row.role}-${column.key}`} className="px-3 py-3 text-slate-700">
                            {row[column.key]}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.organizationTitle")}</h3>
              <p className="text-sm text-slate-600">{t("pages.users.organizationSubtitle")}</p>
            </div>
            {organizationLoading && <p className="text-sm text-slate-600">{t("common.loading")}</p>}
            {organizationError && <p className="text-sm text-red-600">{organizationError}</p>}
            <div className="grid gap-3">
              {units.map((unit) => (
                <div key={unit.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{unit.name}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-600">{unit.code}</p>
                    </div>
                    <Badge variant="neutral">{t(`enums.organizationUnitType.${unit.unit_type}`)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="neutral">{t("pages.users.headcount", { count: unit.headcount || 0 })}</Badge>
                    {unit.parent_unit ? <Badge variant="neutral">{unit.parent_unit.name}</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
            {canManage ? (
              <form className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" onSubmit={submitUnit}>
                <p className="text-sm font-semibold text-slate-900">{t("pages.users.createOrganizationUnit")}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("pages.users.organizationCode")}
                    value={unitForm.code}
                    onChange={(event) => onUnitChange("code", event.target.value)}
                  />
                  <Input
                    placeholder={t("pages.users.organizationName")}
                    value={unitForm.name}
                    onChange={(event) => onUnitChange("name", event.target.value)}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    aria-label="organization-unit-type"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={unitForm.unit_type}
                    onChange={(event) => onUnitChange("unit_type", event.target.value)}
                  >
                    {["directorate", "department", "service", "team"].map((unitType) => (
                      <option key={unitType} value={unitType}>
                        {t(`enums.organizationUnitType.${unitType}`)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="organization-unit-parent"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={unitForm.parent_unit_id}
                    onChange={(event) => onUnitChange("parent_unit_id", event.target.value)}
                  >
                    <option value="">{t("pages.users.noParentUnit")}</option>
                    {units.map((unit) => (
                      <option key={`parent-${unit.id}`} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={saving}>
                  {t("pages.users.createOrganizationUnit")}
                </Button>
              </form>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {isEditing ? t("pages.users.editCollaborator") : t("pages.users.formTitle")}
              </h3>
              <p className="text-sm text-slate-600">
                {isEditing ? t("pages.users.editHint") : t("pages.users.formSubtitle")}
              </p>
            </div>
            {!canManage ? <p className="text-sm text-amber-700">{t("pages.users.noManage")}</p> : null}
            {mutationError ? <p className="text-sm text-red-600">{mutationError}</p> : null}
            {actionMessage ? <p className="text-sm text-emerald-700">{actionMessage}</p> : null}
            {canManage ? (
              <form className="grid gap-3" onSubmit={submitUser}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{t("pages.users.operationalProfile")}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedProfile?.name || t("pages.users.noProfileSelected")}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("pages.users.firstName")}
                    value={form.first_name}
                    onChange={(event) => onChange("first_name", event.target.value)}
                  />
                  <Input
                    placeholder={t("pages.users.lastName")}
                    value={form.last_name}
                    onChange={(event) => onChange("last_name", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("pages.users.email")}
                    value={form.email}
                    onChange={(event) => onChange("email", event.target.value)}
                  />
                  <Input
                    placeholder={t("pages.users.phone")}
                    value={form.phone}
                    onChange={(event) => onChange("phone", event.target.value)}
                  />
                </div>

                {!isEditing ? (
                  <Input
                    placeholder={t("pages.users.password")}
                    type="password"
                    value={form.password}
                    onChange={(event) => onChange("password", event.target.value)}
                  />
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("pages.users.loginIdentifier")}
                    value={form.login_identifier}
                    onChange={(event) => onChange("login_identifier", event.target.value)}
                  />
                  <Input
                    placeholder={t("pages.users.employeeNumber")}
                    value={form.employee_number}
                    onChange={(event) => onChange("employee_number", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={t("pages.users.jobTitle")}
                    value={form.job_title}
                    onChange={(event) => onChange("job_title", event.target.value)}
                  />
                  <Input
                    placeholder={t("pages.users.department")}
                    value={form.department}
                    onChange={(event) => onChange("department", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    aria-label="user-contract-type"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={form.contract_type}
                    onChange={(event) => onChange("contract_type", event.target.value)}
                  >
                    <option value="">{t("pages.users.allContracts")}</option>
                    {CONTRACT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="date"
                    aria-label="user-hire-date"
                    value={form.hire_date}
                    onChange={(event) => onChange("hire_date", event.target.value)}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    aria-label="user-organization-unit"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={form.organization_unit_id}
                    onChange={(event) => onChange("organization_unit_id", event.target.value)}
                  >
                    <option value="">{t("pages.users.noOrganizationUnit")}</option>
                    {units.map((unit) => (
                      <option key={`org-${unit.id}`} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="user-language"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={form.preferred_language}
                    onChange={(event) => onChange("preferred_language", event.target.value)}
                  >
                    <option value="fr">{t("common.languages.fr")}</option>
                    <option value="en">{t("common.languages.en")}</option>
                  </select>
                </div>

                <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  {t("pages.users.typeFixed")}: {t(`enums.userType.${form.user_type}`)}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving || (!selectedProfile && !isEditing)}>
                    {isEditing ? t("pages.users.saveChanges") : t("pages.users.createOperational")}
                  </Button>
                  {isEditing ? (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      {t("pages.users.cancelEdit")}
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("pages.users.existingUsers")}</h3>
              <p className="text-sm text-slate-600">{t("pages.users.listSubtitle")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={t("pages.users.searchPlaceholder")}
                value={filters.search}
                onChange={(event) => onFilterChange("search", event.target.value)}
              />
              <select
                aria-label="users-filter-department"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={filters.department}
                onChange={(event) => onFilterChange("department", event.target.value)}
              >
                <option value="">{t("pages.users.allDepartments")}</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                aria-label="users-filter-contract"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={filters.contract_type}
                onChange={(event) => onFilterChange("contract_type", event.target.value)}
              >
                <option value="">{t("pages.users.allContracts")}</option>
                {contractOptions.map((contractType) => (
                  <option key={contractType} value={contractType}>
                    {contractType}
                  </option>
                ))}
              </select>
              <select
                aria-label="users-filter-status"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={filters.account_status}
                onChange={(event) => onFilterChange("account_status", event.target.value)}
              >
                <option value="">{t("pages.users.allStatuses")}</option>
                {ACCOUNT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`enums.accountStatus.${status}`)}
                  </option>
                ))}
              </select>
              <select
                aria-label="users-filter-type"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={filters.user_type}
                onChange={(event) => onFilterChange("user_type", event.target.value)}
              >
                <option value="">{t("pages.users.allUserTypes")}</option>
                {USER_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(`enums.userType.${type}`)}
                  </option>
                ))}
              </select>
              <select
                aria-label="users-filter-unit"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={filters.organization_unit_id}
                onChange={(event) => onFilterChange("organization_unit_id", event.target.value)}
              >
                <option value="">{t("pages.users.noOrganizationUnit")}</option>
                {units.map((unit) => (
                  <option key={`filter-unit-${unit.id}`} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={filters.include_inactive}
                  onChange={(event) => onFilterChange("include_inactive", event.target.checked)}
                />
                {t("pages.users.includeInactive")}
              </label>
              <Button type="button" variant="outline" onClick={resetFilters}>
                {t("pages.users.clearFilters")}
              </Button>
            </div>

            {loading && <p className="text-sm text-slate-600">{t("common.loading")}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !users.length ? <p className="text-sm text-slate-600">{t("pages.users.emptyDirectory")}</p> : null}

            <div className="space-y-3">
              {users.map((item) => {
                const isSecurityOpen = securityTargetId === item.id;
                const isHrFileOpen = hrFileTargetId === item.id;
                const canReactivate = item.account_status !== "active";
                const identityDocumentUrl = resolveManagedAssetUrl(item, "identity_document");
                const cvDocumentUrl = resolveManagedAssetUrl(item, "cv");

                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-900">
                            {item.first_name} {item.last_name}
                          </p>
                          {item.is_primary_admin ? <Badge variant="info">{t("pages.users.primaryAdmin")}</Badge> : null}
                          <Badge variant={isProfileComplete(item) ? "success" : "warning"}>
                            {isProfileComplete(item) ? t("pages.users.profileComplete") : t("pages.users.profileIncomplete")}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{item.email}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {[item.job_title, item.department].filter(Boolean).join(" / ") ||
                            t(`enums.userType.${item.user_type}`)}
                        </p>
                        {item.organization_unit ? (
                          <p className="text-sm text-slate-600">
                            {t("pages.users.organizationAssignmentLabel")}: {item.organization_unit.name}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          {item.employee_number ? <span>{t("pages.users.employeeNumber")}: {item.employee_number}</span> : null}
                          {item.login_identifier ? <span>{t("pages.users.loginIdentifier")}: {item.login_identifier}</span> : null}
                          {item.contract_type ? <span>{t("pages.users.contractType")}: {item.contract_type}</span> : null}
                          {item.last_login_at ? <span>{t("pages.users.lastLogin")}: {formatDateTime(item.last_login_at, locale)}</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusVariant(item.account_status)}>
                          {t(`enums.accountStatus.${item.account_status}`)}
                        </Badge>
                        {item.operational_profile_code ? <Badge variant="neutral">{item.operational_profile_code}</Badge> : null}
                        {(item.roles || []).map((role) => (
                          <Badge key={`${item.id}-${role.code}`} variant="neutral">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingUserId(item.id);
                            setForm(buildEditForm(item));
                            setError(null);
                            setActionMessage(null);
                          }}
                        >
                          {t("pages.users.editAction")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateUserStatus(item, canReactivate ? "active" : "suspended")}
                        >
                          {canReactivate ? t("pages.users.reactivate") : t("pages.users.suspend")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSecurityTargetId((currentId) => (currentId === item.id ? null : item.id));
                            setSecurityForm(EMPTY_SECURITY_FORM);
                            setError(null);
                            setActionMessage(null);
                          }}
                        >
                          {t("pages.users.resetPassword")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setHrFileTargetId((currentId) => (currentId === item.id ? null : item.id));
                            setHrFileDirty(false);
                            setError(null);
                            setActionMessage(null);
                          }}
                        >
                          {t("pages.users.hrFile.open")}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => forceLogout(item.id)}>
                          {t("pages.users.forceLogout")}
                        </Button>
                      </div>
                    ) : null}

                    {canManage && isSecurityOpen ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{t("pages.users.resetPassword")}</p>
                        <div className="mt-3 grid gap-3">
                          <Input
                            type="password"
                            placeholder={t("pages.users.newPasswordPrompt")}
                            value={securityForm.new_password}
                            onChange={(event) =>
                              setSecurityForm((previous) => ({ ...previous, new_password: event.target.value }))
                            }
                          />
                          <label className="flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              checked={securityForm.must_change_password}
                              onChange={(event) =>
                                setSecurityForm((previous) => ({
                                  ...previous,
                                  must_change_password: event.target.checked,
                                }))
                              }
                            />
                            {t("pages.users.mustChangePassword")}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => submitPasswordReset(item.id)} disabled={saving}>
                              {t("pages.users.resetPassword")}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetSecurityPanel}>
                              {t("pages.users.cancelEdit")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {canManage && isHrFileOpen ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{t("pages.users.hrFile.title")}</p>
                            <p className="mt-1 text-sm text-slate-600">{t("pages.users.hrFile.subtitle")}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="neutral">{item.employee_number || t("pages.users.notProvided")}</Badge>
                            <Badge variant={getStatusVariant(item.account_status)}>
                              {t(`enums.accountStatus.${item.account_status}`)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <p className="font-semibold text-slate-900">{t("pages.users.hrFile.contractTitle")}</p>
                              <p className="text-sm text-slate-600">{t("pages.users.hrFile.contractHint")}</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <Input
                                type="date"
                                aria-label="hr-file-hire-date"
                                value={hrFileForm.hire_date}
                                onChange={(event) => updateHrFileField("hire_date", event.target.value)}
                              />
                              <select
                                aria-label="hr-file-contract-type"
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                value={hrFileForm.contract_type}
                                onChange={(event) => updateHrFileField("contract_type", event.target.value)}
                              >
                                <option value="">{t("pages.users.allContracts")}</option>
                                {CONTRACT_TYPE_OPTIONS.map((option) => (
                                  <option key={`${item.id}-${option}`} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={t("pages.users.hrFile.baseSalary")}
                                value={hrFileForm.base_salary}
                                onChange={(event) => updateHrFileField("base_salary", event.target.value)}
                              />
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                placeholder={t("pages.users.hrFile.hierarchyLevel")}
                                value={hrFileForm.hierarchy_level}
                                onChange={(event) => updateHrFileField("hierarchy_level", event.target.value)}
                              />
                              <Input
                                type="date"
                                aria-label="hr-file-employment-end-date"
                                value={hrFileForm.employment_end_date}
                                onChange={(event) => updateHrFileField("employment_end_date", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.exitReason")}
                                value={hrFileForm.exit_reason}
                                onChange={(event) => updateHrFileField("exit_reason", event.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <p className="font-semibold text-slate-900">{t("pages.users.hrFile.identityTitle")}</p>
                              <p className="text-sm text-slate-600">{t("pages.users.hrFile.identityHint")}</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <select
                                aria-label="hr-file-identity-type"
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                value={hrFileForm.identity_document_type}
                                onChange={(event) => updateHrFileField("identity_document_type", event.target.value)}
                              >
                                <option value="">{t("pages.users.notProvided")}</option>
                                {HR_IDENTITY_DOCUMENT_TYPES.map((option) => (
                                  <option key={`${item.id}-identity-${option}`} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <Input
                                placeholder={t("pages.users.hrFile.identityNumber")}
                                value={hrFileForm.identity_document_number}
                                onChange={(event) => updateHrFileField("identity_document_number", event.target.value)}
                              />
                              <Input
                                type="date"
                                aria-label="hr-file-identity-issue-date"
                                value={hrFileForm.identity_issue_date}
                                onChange={(event) => updateHrFileField("identity_issue_date", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.taxpayerNumber")}
                                value={hrFileForm.taxpayer_number}
                                onChange={(event) => updateHrFileField("taxpayer_number", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.identityDocumentUrl")}
                                value={hrFileForm.identity_document_url}
                                onChange={(event) => updateHrFileField("identity_document_url", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.cvUrl")}
                                value={hrFileForm.cv_url}
                                onChange={(event) => updateHrFileField("cv_url", event.target.value)}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                              {identityDocumentUrl ? (
                                <a className="text-primary underline-offset-4 hover:underline" href={identityDocumentUrl} target="_blank" rel="noreferrer">
                                  {t("pages.users.hrFile.openIdentityDocument")}
                                </a>
                              ) : (
                                <span className="text-slate-500">{t("pages.users.hrFile.noIdentityDocument")}</span>
                              )}
                              {cvDocumentUrl ? (
                                <a className="text-primary underline-offset-4 hover:underline" href={cvDocumentUrl} target="_blank" rel="noreferrer">
                                  {t("pages.users.hrFile.openCv")}
                                </a>
                              ) : (
                                <span className="text-slate-500">{t("pages.users.hrFile.noCv")}</span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                            <div>
                              <p className="font-semibold text-slate-900">{t("pages.users.hrFile.payrollTitle")}</p>
                              <p className="text-sm text-slate-600">{t("pages.users.hrFile.payrollHint")}</p>
                            </div>
                            {hrPayrollProfileError ? <p className="text-sm text-red-600">{hrPayrollProfileError}</p> : null}
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <Input
                                placeholder={t("pages.users.hrFile.cnpsNumber")}
                                value={hrFileForm.cnps_number}
                                onChange={(event) => updateHrFileField("cnps_number", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.bankAccountNumber")}
                                value={hrFileForm.bank_account_number}
                                onChange={(event) => updateHrFileField("bank_account_number", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.bankDomiciliation")}
                                value={hrFileForm.bank_domiciliation}
                                onChange={(event) => updateHrFileField("bank_domiciliation", event.target.value)}
                              />
                              <select
                                aria-label="hr-file-payment-method"
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                value={hrFileForm.payment_method}
                                onChange={(event) => updateHrFileField("payment_method", event.target.value)}
                              >
                                {HR_PAYMENT_METHOD_OPTIONS.map((option) => (
                                  <option key={`${item.id}-payment-${option}`} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <Input
                                placeholder={t("pages.users.hrFile.hoursSchedule")}
                                value={hrFileForm.hours_schedule}
                                onChange={(event) => updateHrFileField("hours_schedule", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.employmentLabel")}
                                value={hrFileForm.employment_label}
                                onChange={(event) => updateHrFileField("employment_label", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.category")}
                                value={hrFileForm.category}
                                onChange={(event) => updateHrFileField("category", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.echelon")}
                                value={hrFileForm.echelon}
                                onChange={(event) => updateHrFileField("echelon", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.convention")}
                                value={hrFileForm.convention_collective}
                                onChange={(event) => updateHrFileField("convention_collective", event.target.value)}
                              />
                              <Input
                                placeholder={t("pages.users.hrFile.familyStatus")}
                                value={hrFileForm.family_status}
                                onChange={(event) => updateHrFileField("family_status", event.target.value)}
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={t("pages.users.hrFile.transportAllowance")}
                                value={hrFileForm.transport_allowance}
                                onChange={(event) => updateHrFileField("transport_allowance", event.target.value)}
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={t("pages.users.hrFile.otherFixedGains")}
                                value={hrFileForm.other_fixed_gains}
                                onChange={(event) => updateHrFileField("other_fixed_gains", event.target.value)}
                              />
                            </div>
                            <Textarea
                              rows={3}
                              placeholder={t("pages.users.hrFile.payrollNotes")}
                              value={hrFileForm.payroll_notes}
                              onChange={(event) => updateHrFileField("payroll_notes", event.target.value)}
                            />
                            <label className="flex items-center gap-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                checked={hrFileForm.is_payroll_enabled}
                                onChange={(event) => updateHrFileField("is_payroll_enabled", event.target.checked)}
                              />
                              {t("pages.users.hrFile.payrollEnabled")}
                            </label>
                            {hrPayrollProfileLoading ? <p className="text-sm text-slate-500">{t("common.loading")}</p> : null}
                          </div>

                          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{t("pages.users.hrFile.activityTitle")}</p>
                                <p className="text-sm text-slate-600">{t("pages.users.hrFile.activityHint")}</p>
                              </div>
                              <Badge variant="neutral">{hrActivityRows.length}</Badge>
                            </div>
                            {hrActivityError ? <p className="text-sm text-red-600">{hrActivityError}</p> : null}
                            {hrActivityLoading ? <p className="text-sm text-slate-500">{t("common.loading")}</p> : null}
                            {!hrActivityLoading && !hrActivityRows.length ? (
                              <p className="text-sm text-slate-500">{t("pages.users.hrFile.noActivity")}</p>
                            ) : null}
                            <div className="space-y-3">
                              {hrActivityRows.map((row) => (
                                <div key={`${item.id}-hr-activity-${row.id}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium text-slate-900">{row.description || row.action}</p>
                                    <Badge variant="neutral">{formatDateTime(row.created_at, locale)}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-600">{[row.actor_email, row.module].filter(Boolean).join(" / ")}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" onClick={() => submitHrFile(item.id)} disabled={saving}>
                            {t("pages.users.hrFile.save")}
                          </Button>
                          <Button type="button" variant="outline" onClick={resetHrFilePanel}>
                            {t("pages.users.hrFile.close")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function UsersPage() {
  const { tenantId, user } = useAuth();
  const canLoadTenantData = canAccessTenantModules(user, tenantId);

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.users" />;
  }

  return <UsersPageContent user={user} />;
}
