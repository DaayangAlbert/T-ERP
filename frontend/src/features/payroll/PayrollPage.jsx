import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { EditableFieldList, EditableFieldRow } from "@/components/ui/editable-field-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { useAuth } from "@/features/auth/AuthContext";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";
import { getOperationalProfileCode } from "@/shared/utils/operationalRoles";

const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "check", "other"];
const SELECT_CLASS = LIST_SELECT_CLASS;
const PAYROLL_FOCUS_VALUES = new Set(["summary", "leave", "payslips", "cycle", "team", "leave-management", "runs"]);

function buildDefaultPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toIso = (value) => value.toISOString().slice(0, 10);

  return {
    label: "",
    notes: "",
    start_date: toIso(start),
    end_date: toIso(end),
    payment_date: toIso(end),
    dry_run: false,
    include_lines: true,
  };
}

function formatMoney(value, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatCount(value, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number(value || 0));
}

function formatDate(value, locale = "fr-FR") {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

function normalizePayrollFocus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PAYROLL_FOCUS_VALUES.has(normalized) ? normalized : "";
}

function resolvePayrollFocusTarget(focus) {
  if (!focus) {
    return "";
  }

  if (focus === "summary") return "payroll-self-summary";
  if (focus === "leave") return "payroll-self-leave";
  if (focus === "payslips") return "payroll-self-payslips";
  if (focus === "cycle") return "payroll-cycle";
  if (focus === "team") return "payroll-team";
  if (focus === "leave-management") return "payroll-leave-management";
  if (focus === "runs") return "payroll-runs";
  return "";
}

function getFocusCardClass(isFocused) {
  return isFocused ? "ring-2 ring-primary/20 border-primary/40 shadow-sm shadow-primary/10" : "";
}

function stripApiPrefix(url) {
  return String(url || "").replace(/^\/api\/v1/, "");
}

function buildEmployeeDefaults(employee) {
  return {
    days_paid: "",
    late_hours: "",
    salary_base_override: "",
    transport_allowance: employee.profile?.transport_allowance ?? "",
    other_gains: employee.profile?.other_fixed_gains ?? "",
    brut_imposable: employee.base_salary ?? "",
    irpp: "",
    cac: "",
    tc: "",
    rav: "",
    cfs: "",
    payment_method: employee.payment_method || "bank_transfer",
    observation: "",
  };
}

function buildProfileDefaults(employee) {
  return {
    category: employee.profile?.category ?? "",
    echelon: employee.profile?.echelon ?? "",
    cnps_number: employee.profile?.cnps_number ?? "",
    convention_collective: employee.profile?.convention_collective ?? "",
    employment_label: employee.profile?.employment_label ?? "",
    hours_schedule: employee.profile?.hours_schedule ?? "",
    family_status: employee.profile?.family_status ?? "",
    bank_account_number: employee.profile?.bank_account_number ?? "",
    bank_domiciliation: employee.profile?.bank_domiciliation ?? "",
    payment_method: employee.payment_method || "bank_transfer",
    transport_allowance: employee.profile?.transport_allowance ?? "",
    other_fixed_gains: employee.profile?.other_fixed_gains ?? "",
    payroll_notes: employee.profile?.payroll_notes ?? "",
    is_payroll_enabled: employee.payroll_enabled ?? true,
  };
}

function buildProfileStateFromResponse(payload) {
  return {
    category: payload.profile?.category ?? "",
    echelon: payload.profile?.echelon ?? "",
    cnps_number: payload.profile?.cnps_number ?? "",
    convention_collective: payload.profile?.convention_collective ?? "",
    employment_label: payload.profile?.employment_label ?? "",
    hours_schedule: payload.profile?.hours_schedule ?? "",
    family_status: payload.profile?.family_status ?? "",
    bank_account_number: payload.profile?.bank_account_number ?? "",
    bank_domiciliation: payload.profile?.bank_domiciliation ?? "",
    payment_method: payload.profile?.payment_method || "bank_transfer",
    transport_allowance: payload.profile?.transport_allowance ?? "",
    other_fixed_gains: payload.profile?.other_fixed_gains ?? "",
    payroll_notes: payload.profile?.payroll_notes ?? "",
    is_payroll_enabled: payload.profile?.is_payroll_enabled ?? true,
  };
}

function buildEmployeeStateFromPeriodItem(row) {
  return {
    days_paid: row.input?.days_paid ?? row.input?.defaults?.days_paid ?? "",
    late_hours: row.input?.late_hours ?? row.input?.defaults?.late_hours ?? "",
    salary_base_override: row.input?.salary_base_override ?? row.input?.defaults?.salary_base_override ?? "",
    transport_allowance: row.input?.transport_allowance ?? row.input?.defaults?.transport_allowance ?? "",
    other_gains: row.input?.other_gains ?? row.input?.defaults?.other_gains ?? "",
    brut_imposable: row.input?.brut_imposable ?? "",
    irpp: row.input?.irpp ?? "",
    cac: row.input?.cac ?? "",
    tc: row.input?.tc ?? "",
    rav: row.input?.rav ?? "",
    cfs: row.input?.cfs ?? "",
    payment_method: row.input?.payment_method ?? row.input?.defaults?.payment_method ?? "bank_transfer",
    observation: row.input?.observation ?? row.input?.defaults?.observation ?? "",
  };
}

const SELF_SERVICE_LEAVE_STORAGE_KEY = "t-erp.self-service-leave-requests";
const SELF_SERVICE_LEAVE_TYPES = [
  { value: "paid_leave", label: "Conge paye" },
  { value: "permission", label: "Permission" },
  { value: "sick_leave", label: "Arret maladie" },
  { value: "exceptional_leave", label: "Conge exceptionnel" },
  { value: "absence_justification", label: "Justificatif d'absence" },
  { value: "late_arrival", label: "Justificatif de retard" },
];
const LEAVE_REQUEST_STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "submitted", label: "Envoye" },
  { value: "received", label: "Recu" },
  { value: "in_review", label: "En revue" },
  { value: "processing", label: "En traitement" },
  { value: "approved", label: "Approuve" },
  { value: "rejected", label: "Rejete" },
  { value: "resolved", label: "Clos" },
];
const LEAVE_WORKFLOW_APPROVER_CODES = new Set([
  "super_admin",
  "company_admin",
  "chef_chantier",
  "chef_projet",
  "conducteur_travaux",
  "responsable_rh",
  "rh_recruteur",
  "directeur_general",
  "directeur_administratif",
  "daf",
]);
const LEAVE_WORKFLOW_STAGE_LABELS = {
  manager_review: "Validation manager",
  hr_review: "Validation RH",
  direction_review: "Validation direction",
};

function buildEmptyLeaveWorkflow() {
  return {
    required_stage_codes: [],
    completed_stage_codes: [],
    current_stage_code: null,
    current_stage_label: null,
    available_actions: [],
    is_final: false,
    is_rejected: false,
    stages: [],
    history: [],
  };
}

function buildEmptyLeaveSummary() {
  return {
    total_requests: 0,
    approved_requests: 0,
    pending_requests: 0,
    rejected_requests: 0,
    requested_days_total: 0,
    approved_days_total: 0,
    pending_days_total: 0,
    last_request_at: null,
    last_approved_at: null,
  };
}

function buildClientLeaveRequestId() {
  return `leave-client-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function buildDefaultLeaveRequest() {
  const now = new Date();
  const toIso = (value) => value.toISOString().slice(0, 10);

  return {
    client_request_id: buildClientLeaveRequestId(),
    type: "paid_leave",
    title: "",
    start_date: toIso(now),
    end_date: toIso(now),
    reason: "",
    contact: "",
    handover_note: "",
    supporting_document_url: "",
    supporting_document_name: "",
  };
}

function buildLeaveStorageKey(tenantId, userId) {
  return `${SELF_SERVICE_LEAVE_STORAGE_KEY}.${tenantId || "global"}.${userId || "anonymous"}`;
}

function sortLeaveRequests(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

function computeLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const milliseconds = end.getTime() - start.getTime();
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : null;
}

function normalizeLeaveRequest(item, fallback = {}) {
  const clientRequestId = item?.client_request_id || fallback.client_request_id || item?.id || fallback.id || buildClientLeaveRequestId();

  return {
    id: item?.id || fallback.id || clientRequestId,
    client_request_id: clientRequestId,
    type: item?.type || fallback.type || "paid_leave",
    title: item?.title || fallback.title || "Demande de conge",
    start_date: item?.start_date || fallback.start_date || "",
    end_date: item?.end_date || fallback.end_date || "",
    reason: item?.reason || item?.description || fallback.reason || "",
    contact: item?.contact || item?.backup_contact || fallback.contact || "",
    handover_note: item?.handover_note || fallback.handover_note || "",
    supporting_document_url: item?.supporting_document_url || fallback.supporting_document_url || "",
    supporting_document_name: item?.supporting_document_name || fallback.supporting_document_name || "",
    days_requested:
      item?.days_requested ?? fallback.days_requested ?? computeLeaveDays(item?.start_date || fallback.start_date, item?.end_date || fallback.end_date),
    status: item?.status || fallback.status || "submitted",
    created_at: item?.created_at || fallback.created_at || new Date().toISOString(),
    source: item?.source || fallback.source || "api",
    employee: item?.employee || fallback.employee || null,
    employee_leave_summary: item?.employee_leave_summary || fallback.employee_leave_summary || buildEmptyLeaveSummary(),
    workflow: {
      ...buildEmptyLeaveWorkflow(),
      ...(item?.workflow || fallback.workflow || {}),
      available_actions: Array.isArray(item?.workflow?.available_actions || fallback.workflow?.available_actions)
        ? [...(item?.workflow?.available_actions || fallback.workflow?.available_actions || [])]
        : [],
      stages: Array.isArray(item?.workflow?.stages || fallback.workflow?.stages)
        ? [...(item?.workflow?.stages || fallback.workflow?.stages || [])]
        : [],
      history: Array.isArray(item?.workflow?.history || fallback.workflow?.history)
        ? [...(item?.workflow?.history || fallback.workflow?.history || [])]
        : [],
    },
  };
}

function getLeaveRequestIdentity(item) {
  if (item?.client_request_id) {
    return `client:${item.client_request_id}`;
  }
  return `id:${item?.id ?? "unknown"}`;
}

function mergeLeaveRequests(...collections) {
  const items = collections.flat().filter(Boolean).map((item) => normalizeLeaveRequest(item));
  const mergedItems = new Map();

  items.forEach((item) => {
    const key = getLeaveRequestIdentity(item);
    const previous = mergedItems.get(key);
    if (!previous || (previous.source === "local" && item.source === "api")) {
      mergedItems.set(key, item);
    }
  });

  return sortLeaveRequests([...mergedItems.values()]);
}

function buildLeaveRequestPayload(formValues) {
  const clientRequestId = formValues.client_request_id || formValues.id || buildClientLeaveRequestId();

  return compactPayload({
    client_request_id: clientRequestId,
    type: formValues.type,
    title: formValues.title || `Demande de conge du ${formValues.start_date}`,
    start_date: formValues.start_date,
    end_date: formValues.end_date,
    days_requested: formValues.days_requested ?? computeLeaveDays(formValues.start_date, formValues.end_date),
    reason: formValues.reason,
    contact: formValues.contact,
    handover_note: formValues.handover_note,
    supporting_document_url: formValues.supporting_document_url,
    supporting_document_name: formValues.supporting_document_name,
  });
}

function readStoredLeaveRequests(tenantId, userId) {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(buildLeaveStorageKey(tenantId, userId));
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeLeaveRequest(item, { source: "local" })) : [];
  } catch {
    return [];
  }
}

function persistStoredLeaveRequests(tenantId, userId, items) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const localItems = (items || []).filter((item) => item?.source === "local");
  window.localStorage.setItem(buildLeaveStorageKey(tenantId, userId), JSON.stringify(localItems));
}

function createLocalLeaveRequest(formValues) {
  const clientRequestId = formValues.client_request_id || formValues.id || buildClientLeaveRequestId();

  return normalizeLeaveRequest(
    {
      id: clientRequestId,
      client_request_id: clientRequestId,
      title: `Demande de conge du ${formValues.start_date}`,
      status: "submitted",
      created_at: new Date().toISOString(),
      source: "local",
    },
    {
      ...formValues,
      client_request_id: clientRequestId,
      days_requested: computeLeaveDays(formValues.start_date, formValues.end_date),
      source: "local",
    },
  );
}

function getLeaveStatusMeta(status) {
  switch (status) {
    case "approved":
    case "resolved":
      return {
        label: "Approuve",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "received":
    case "in_review":
    case "processing":
      return {
        label: "En traitement",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "rejected":
      return {
        label: "Rejete",
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "draft":
      return {
        label: "Brouillon",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    default:
      return {
        label: "Envoye",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
  }
}

function getWorkflowStageStatusMeta(status) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "current":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function unwrapMutationPayload(payload) {
  return payload?.data ?? payload;
}

function getPaymentMethodLabel(method) {
  switch (method) {
    case "cash":
      return "Espece";
    case "bank_transfer":
      return "Virement";
    case "mobile_money":
      return "Mobile money";
    case "check":
      return "Cheque";
    case "other":
      return "Autre";
    default:
      return method || "-";
  }
}

function getPayrollStatusMeta(status) {
  switch (status) {
    case "generated":
      return { label: "Generee", variant: "success" };
    case "archived":
      return { label: "Archivee", variant: "neutral" };
    default:
      return { label: "Brouillon", variant: "warning" };
  }
}

function SummaryCard({ label, value, helper, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-600">{helper}</p> : null}
    </div>
  );
}

export function PayrollPage() {
  const { t, i18n } = useTranslation();
  const { tenantId, user } = useAuth();
  const [searchParams] = useSearchParams();
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const isEnglish = i18n.language?.startsWith("en");
  const operationalProfileCode = getOperationalProfileCode(user);
  const canManagePayroll = user?.user_type === "super_admin" || user?.permissions?.includes("payroll.manage");
  const canManageLeaveWorkflow = canManagePayroll || LEAVE_WORKFLOW_APPROVER_CODES.has(operationalProfileCode);
  const isWorkflowOnlyPayroll = canManageLeaveWorkflow && !canManagePayroll;
  const isSelfServicePayroll = !canManageLeaveWorkflow;
  const isDafWorkspace =
    user?.operational_profile_code === "daf" ||
    (Array.isArray(user?.roles) && user.roles.includes("daf"));
  const focusSection = normalizePayrollFocus(searchParams.get("focus"));

  const [periodForm, setPeriodForm] = useState(() => buildDefaultPeriod());
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeInputs, setEmployeeInputs] = useState({});
  const [profileInputs, setProfileInputs] = useState({});
  const [generationResult, setGenerationResult] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [preparationNotice, setPreparationNotice] = useState("");
  const [profileActionEmployeeId, setProfileActionEmployeeId] = useState(null);
  const [preparationActionEmployeeId, setPreparationActionEmployeeId] = useState(null);
  const [leaveForm, setLeaveForm] = useState(() => buildDefaultLeaveRequest());
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveRequestNotice, setLeaveRequestNotice] = useState("");
  const [leaveRequestError, setLeaveRequestError] = useState("");
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);
  const [uploadingLeaveProof, setUploadingLeaveProof] = useState(false);
  const [leaveManagementFilter, setLeaveManagementFilter] = useState({ employeeId: "", status: "" });
  const [leaveActionRequestId, setLeaveActionRequestId] = useState(null);
  const [leaveDecisionNotes, setLeaveDecisionNotes] = useState({});
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [focusedEmployeeId, setFocusedEmployeeId] = useState(null);
  const [payslipFilters, setPayslipFilters] = useState({ month: "", date_from: "", date_to: "" });

  const { data: status } = useApiQuery("/payroll/status", { enabled: canLoadTenantData });
  const { data: employeesData, loading: loadingEmployees, refetch: refetchEmployees } = useApiQuery("/payroll/employees", {
    enabled: canLoadTenantData && canManagePayroll,
  });
  const { data: periodsData, loading: loadingPeriods, refetch: refetchPeriods } = useApiQuery("/payroll/periods", {
    enabled: canLoadTenantData && canManagePayroll,
  });
  const { data: selectedPeriodData, loading: loadingPeriodInputs, refetch: refetchSelectedPeriod } = useApiQuery(
    selectedPeriodId ? `/payroll/periods/${selectedPeriodId}/inputs` : "/payroll/periods",
    { enabled: canLoadTenantData && canManagePayroll && Boolean(selectedPeriodId) },
  );
  const { data: runsData, loading: loadingRuns, refetch: refetchRuns } = useApiQuery("/payroll/runs", {
    enabled: canLoadTenantData && canManagePayroll,
  });
  const { data: leaveRequestsData, loading: loadingManagedLeaveRequests, refetch: refetchLeaveRequests } = useApiQuery("/payroll/leave-requests", {
    enabled: canLoadTenantData && canManageLeaveWorkflow,
  });
  const { data: selfSummaryData, refetch: refetchSelfSummary } = useApiQuery("/payroll/me/summary", {
    enabled: canLoadTenantData && isSelfServicePayroll,
  });
  const selfPayslipParams = compactPayload({
    month: payslipFilters.month,
    date_from: payslipFilters.date_from,
    date_to: payslipFilters.date_to,
  });
  const { data: selfPayslipsData, loading: loadingSelfPayslips } = useApiQuery("/payroll/me/payslips", {
    enabled: canLoadTenantData && isSelfServicePayroll,
    params: selfPayslipParams,
  });
  const {
    mutate: mutateGeneration,
    loading: savingGeneration,
    error: generationError,
    setError: setGenerationError,
  } = useApiMutation();
  const {
    mutate: mutateProfile,
    loading: savingProfile,
    error: profileError,
    setError: setProfileError,
  } = useApiMutation();
  const {
    mutate: mutatePreparation,
    loading: savingPreparation,
    error: preparationError,
    setError: setPreparationError,
  } = useApiMutation();
  const {
    mutate: mutateLeaveRequest,
    loading: savingLeaveRequest,
    error: leaveManagementError,
    setError: setLeaveManagementError,
  } = useApiMutation();

  const employees = employeesData?.items || [];
  const periods = periodsData?.items || [];
  const runs = runsData?.items || [];
  const managedLeaveRequests = (leaveRequestsData?.items || []).map((item) => normalizeLeaveRequest(item));
  const leaveManagementSummary = leaveRequestsData?.summary || buildEmptyLeaveSummary();
  const workflowEmployees = useMemo(() => {
    const map = new Map();
    managedLeaveRequests.forEach((item) => {
      const employee = item.employee;
      if (employee?.id && !map.has(employee.id)) {
        map.set(employee.id, employee);
      }
    });
    return [...map.values()];
  }, [managedLeaveRequests]);
  const title = i18n.language?.startsWith("en")
    ? isWorkflowOnlyPayroll ? "Leave approval workflow" : isDafWorkspace ? "CFO payroll control" : "Monthly payroll"
    : isWorkflowOnlyPayroll ? "Circuit d'approbation RH" : isDafWorkspace ? "Paie DAF" : "Paie mensuelle";
  const subtitle = i18n.language?.startsWith("en")
    ? isWorkflowOnlyPayroll
      ? "Validate employee leave, absences, and lateness with the right manager, HR, and direction stages."
      : isDafWorkspace
      ? "Control payroll cycles, employee payroll data, leave approvals, and generated payslips. Team agenda and project scheduling stay in planning."
      : "Control payroll cycles, employee payroll data, leave approvals, and generated payslips. Team agenda and project scheduling stay in planning."
    : isWorkflowOnlyPayroll
      ? "Validez les conges, absences et retards avec un circuit manager, RH et direction selon le dossier."
      : isDafWorkspace
      ? "Pilotez le cycle de paie, les profils salaries, les absences qui impactent le salaire et les bulletins generes. L'agenda et la planification projet restent dans le planning."
      : "Pilotez le cycle de paie, les profils salaries, les absences qui impactent le salaire et les bulletins generes. L'agenda et la planification projet restent dans le planning.";
  const selfServiceTitle = isEnglish ? "Personal payroll space" : "Espace paie personnel";
  const selfServiceSubtitle = isEnglish
    ? "Payroll handles payslips, absences, lateness, and official leave requests. Planning stays dedicated to agenda and assigned tasks."
    : "La paie gere vos bulletins, absences, retards et demandes officielles de conge. Le planning reste l'espace de l'agenda et des taches assignees.";
  const planningShortcutLabel = isEnglish ? "Open planning" : "Ouvrir le planning";
  const leaveShortcutLabel = isEnglish ? "Leave requests" : "Demandes de conge";
  const payslipsShortcutLabel = isEnglish ? "My payslips" : "Mes bulletins";
  const cycleShortcutLabel = isEnglish ? "Payroll cycle" : "Cycle de paie";
  const teamShortcutLabel = isEnglish ? "Payroll team" : "Equipe paie";
  const leaveManagementShortcutLabel = isEnglish ? "Leave approvals" : "Validation des conges";
  const runsShortcutLabel = isEnglish ? "Generated runs" : "Runs generes";
  const boundaryTitle = isEnglish ? "Planning / payroll boundary" : "Frontiere planning / paie";
  const boundaryHint = isEnglish
    ? "Planning stays focused on agenda, reminders, and project execution. Payroll keeps the official incidents and salary outputs."
    : "Le planning reste centre sur l'agenda, les rappels et l'execution projet. La paie centralise les incidents officiels et les sorties salaire.";
  const boundaryPlanningTitle = isEnglish ? "Planning" : "Planning";
  const boundaryPlanningBody = isEnglish
    ? "Agenda, reminders, assigned tasks, and project scheduling."
    : "Agenda, rappels, taches assignees et planification projet.";
  const boundaryPayrollTitle = isEnglish ? "Payroll" : "Paie";
  const boundaryPayrollBody = isEnglish
    ? isWorkflowOnlyPayroll ? "Official leave approvals, absence evidence, and decision history." : "Payslips, absences, lateness, leave requests, and payroll cycle validation."
    : isWorkflowOnlyPayroll ? "Validations officielles des conges, justificatifs d'absence et historique de decision." : "Bulletins, absences, retards, demandes de conge et validations du cycle de paie.";
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) || null;
  const draftPeriods = periods.filter((period) => period.status === "draft");
  const generatedPeriods = periods.filter((period) => period.status === "generated");
  const payrollEnabledEmployeesCount = employees.filter((employee) => employee.payroll_enabled !== false).length;
  const selectedEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const selectedPayrollMass = selectedEmployees.reduce((sum, employee) => sum + Number(employee.base_salary || 0), 0);
  const employeesWithPendingLeaveCount = employees.filter((employee) => Number(employee.leave_summary?.pending_requests || 0) > 0).length;
  const latestRun = runs[0] || null;
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = !normalizedEmployeeSearch
      || [
        employee.full_name,
        employee.employee_number,
        employee.job_title,
        employee.department,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedEmployeeSearch));

    if (!matchesSearch) return false;
    if (employeeFilter === "selected") return selectedEmployeeIds.includes(employee.id);
    if (employeeFilter === "enabled") return employee.payroll_enabled !== false;
    if (employeeFilter === "pending_leave") return Number(employee.leave_summary?.pending_requests || 0) > 0;
    return true;
  });
  const focusedEmployee = employees.find((employee) => employee.id === focusedEmployeeId) || filteredEmployees[0] || null;
  const focusedValues = focusedEmployee ? employeeInputs[focusedEmployee.id] || buildEmployeeDefaults(focusedEmployee) : null;
  const focusedProfileValues = focusedEmployee ? profileInputs[focusedEmployee.id] || buildProfileDefaults(focusedEmployee) : null;
  const focusedLeaveSummary = focusedEmployee?.leave_summary || buildEmptyLeaveSummary();
  const filteredManagedLeaveRequests = managedLeaveRequests.filter((item) => {
    const matchesEmployee = leaveManagementFilter.employeeId ? String(item.employee?.id || "") === String(leaveManagementFilter.employeeId) : true;
    const matchesStatus = leaveManagementFilter.status ? item.status === leaveManagementFilter.status : true;
    return matchesEmployee && matchesStatus;
  });
  const preparedEmployeeIds = new Set(
    (selectedPeriodData?.items || [])
      .filter((row) => row.input?.exists)
      .map((row) => row.employee.id),
  );
  const periodInputRowsByEmployeeId = useMemo(() => {
    const map = new Map();
    (selectedPeriodData?.items || []).forEach((row) => {
      map.set(row.employee.id, row);
    });
    return map;
  }, [selectedPeriodData]);
  const allEmployeesSelected = employees.length > 0 && selectedEmployeeIds.length === employees.length;
  const allFilteredEmployeesSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((employee) => selectedEmployeeIds.includes(employee.id));
  const focusedEmployeePrepared = focusedEmployee ? preparedEmployeeIds.has(focusedEmployee.id) : false;
  const focusTargetId = useMemo(() => resolvePayrollFocusTarget(focusSection), [focusSection]);

  useEffect(() => {
    if (!focusTargetId) {
      return;
    }

    const target = document.getElementById(focusTargetId);
    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [focusTargetId]);

  useEffect(() => {
    if (!canLoadTenantData || !isSelfServicePayroll || !selfPayslipsData) {
      return;
    }

    httpClient
      .post("/users/me/notifications/mark-seen", { categories: ["payslips"] })
      .then(() => {
        window.dispatchEvent(new CustomEvent("terp-notifications-refresh"));
      })
      .catch(() => {
        // Clearing payslip alerts should not block the self-service payroll workspace.
      });
  }, [canLoadTenantData, isSelfServicePayroll, selfPayslipsData]);

  useEffect(() => {
    if (!employees.length) return;

    setSelectedEmployeeIds((current) =>
      current.length ? current.filter((id) => employees.some((employee) => employee.id === id)) : employees.map((employee) => employee.id),
    );
    setEmployeeInputs((current) => {
      const next = { ...current };
      employees.forEach((employee) => {
        next[employee.id] = next[employee.id] || buildEmployeeDefaults(employee);
      });
      return next;
    });
    setProfileInputs((current) => {
      const next = { ...current };
      employees.forEach((employee) => {
        next[employee.id] = next[employee.id] || buildProfileDefaults(employee);
      });
      return next;
    });
  }, [employeesData]);

  useEffect(() => {
    if (!filteredEmployees.length) {
      setFocusedEmployeeId(null);
      return;
    }

    if (!focusedEmployeeId || !filteredEmployees.some((employee) => employee.id === focusedEmployeeId)) {
      setFocusedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, focusedEmployeeId]);

  useEffect(() => {
    if (!selectedPeriodData?.period) return;

    setPeriodForm((current) => ({
      ...current,
      label: selectedPeriodData.period.label || "",
      notes: selectedPeriodData.period.notes || "",
      start_date: selectedPeriodData.period.start_date || current.start_date,
      end_date: selectedPeriodData.period.end_date || current.end_date,
      payment_date: selectedPeriodData.period.payment_date || current.payment_date,
    }));

    setEmployeeInputs((current) => {
      const next = { ...current };
      (selectedPeriodData.items || []).forEach((row) => {
        next[row.employee.id] = buildEmployeeStateFromPeriodItem(row);
      });
      return next;
    });

    const preparedIds = (selectedPeriodData.items || [])
      .filter((row) => row.input?.exists)
      .map((row) => row.employee.id);
    if (preparedIds.length) {
      setSelectedEmployeeIds(preparedIds);
    }
  }, [selectedPeriodData]);

  useEffect(() => {
    if (!canLoadTenantData || !isSelfServicePayroll) {
      return;
    }

    let cancelled = false;
    const loadLeaveRequests = async () => {
      const localLeaveRequests = readStoredLeaveRequests(tenantId, user?.id);
      setLoadingLeaveRequests(true);
      setLeaveRequestError("");

      try {
        const response = await httpClient.get("/payroll/me/leave-requests");
        if (cancelled) {
          return;
        }

        const apiItems = (response.data?.items || []).map((item) => normalizeLeaveRequest(item));
        let syncedItems = [];
        let remainingLocalItems = localLeaveRequests;

        if (localLeaveRequests.length) {
          const syncResults = await Promise.allSettled(
            localLeaveRequests.map((item) => httpClient.post("/payroll/me/leave-requests", buildLeaveRequestPayload(item))),
          );
          if (cancelled) {
            return;
          }

          syncedItems = [];
          remainingLocalItems = [];
          syncResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              syncedItems.push(normalizeLeaveRequest(result.value.data?.data || result.value.data?.item || result.value.data));
              return;
            }
            remainingLocalItems.push(localLeaveRequests[index]);
          });

          persistStoredLeaveRequests(tenantId, user?.id, remainingLocalItems);
          if (syncedItems.length) {
            setLeaveRequestNotice((current) => current || `${syncedItems.length} demande(s) locale(s) synchronisee(s) avec l'API.`);
            void refetchSelfSummary();
          }
        }

        setLeaveRequests(mergeLeaveRequests(apiItems, syncedItems, remainingLocalItems));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const status = error.response?.status;
        setLeaveRequests(sortLeaveRequests(localLeaveRequests));

        if (status && ![404, 405, 501].includes(status)) {
          setLeaveRequestError(
            error.response?.data?.message ||
              "Le circuit conges n'est pas joignable pour le moment. Vos demandes locales restent disponibles.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLeaveRequests(false);
        }
      }
    };

    loadLeaveRequests();

    return () => {
      cancelled = true;
    };
  }, [canLoadTenantData, isSelfServicePayroll, refetchSelfSummary, tenantId, user?.id]);

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.payroll" />;
  }

  const downloadPayslipByPath = async (downloadPath, fallbackFileName = "bulletin.pdf") => {
    if (!downloadPath) return;
    setDownloadError("");

    try {
      const response = await httpClient.get(stripApiPrefix(downloadPath), { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fallbackFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError(error.response?.data?.message || error.message || "Download failed");
    }
  };

  const downloadProtectedFile = async (downloadPath, fallbackFileName = "document") => {
    if (!downloadPath) return;
    setDownloadError("");

    try {
      const response = await httpClient.get(stripApiPrefix(downloadPath), { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fallbackFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError(error.response?.data?.message || error.message || "Download failed");
    }
  };

  const updateLeaveForm = (key, value) =>
    setLeaveForm((current) => ({
      ...current,
      [key]: value,
    }));

  const uploadLeaveProof = async (file) => {
    if (!file) {
      return;
    }

    setLeaveRequestError("");
    setUploadingLeaveProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.post("/payroll/me/leave-requests/upload-proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const payload = response.data?.data || {};
      setLeaveForm((current) => ({
        ...current,
        supporting_document_url: payload.supporting_document_url || "",
        supporting_document_name: payload.supporting_document_name || file.name,
      }));
      setLeaveRequestNotice("Justificatif televerse et pret a etre envoye.");
    } catch (error) {
      setLeaveRequestError(error.response?.data?.message || error.message || "Televersement impossible");
    } finally {
      setUploadingLeaveProof(false);
    }
  };

  const submitLeaveRequest = async (event) => {
    event.preventDefault();
    setLeaveRequestError("");
    setLeaveRequestNotice("");

    const payload = buildLeaveRequestPayload(leaveForm);

    setSubmittingLeaveRequest(true);

    try {
      const response = await httpClient.post("/payroll/me/leave-requests", payload);
      const savedRequest = normalizeLeaveRequest(response.data?.data || response.data?.item || response.data, payload);
      setLeaveRequests((current) => {
        const nextItems = mergeLeaveRequests(
          [savedRequest],
          current.filter((item) => item.client_request_id !== savedRequest.client_request_id),
        );
        persistStoredLeaveRequests(tenantId, user?.id, nextItems);
        return nextItems;
      });
      setLeaveRequestNotice("Votre demande de conge a ete enregistree.");
      setLeaveForm(buildDefaultLeaveRequest());
      void refetchSelfSummary();
    } catch (error) {
      const status = error.response?.status;
      const canFallbackToLocal = !status || [404, 405, 501].includes(status);

      if (!canFallbackToLocal) {
        setLeaveRequestError(error.response?.data?.message || error.message || "Envoi impossible");
        setSubmittingLeaveRequest(false);
        return;
      }

      const localRequest = createLocalLeaveRequest(payload);
      setLeaveRequests((current) => {
        const nextItems = mergeLeaveRequests([localRequest], current);
        persistStoredLeaveRequests(tenantId, user?.id, nextItems);
        return nextItems;
      });
      setLeaveRequestNotice("L'API conges est momentanement indisponible. Votre demande a ete conservee localement.");
      setLeaveForm(buildDefaultLeaveRequest());
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };

  const updateLeaveManagementFilterValue = (key, value) =>
    setLeaveManagementFilter((current) => ({
      ...current,
      [key]: value,
    }));

  const updateLeaveDecisionNote = (leaveRequestId, value) =>
    setLeaveDecisionNotes((current) => ({
      ...current,
      [leaveRequestId]: value,
    }));

  const refetchLeaveWorkflowData = () =>
    Promise.allSettled([
      refetchLeaveRequests(),
      ...(canManagePayroll ? [refetchEmployees()] : []),
    ]);

  const updateLeaveRequestStatus = async (leaveRequestId, nextStatus) => {
    setLeaveManagementError(null);
    setLeaveRequestNotice("");
    setLeaveActionRequestId(leaveRequestId);

    try {
      await mutateLeaveRequest({
        method: "patch",
        url: `/payroll/leave-requests/${leaveRequestId}`,
        data: { status: nextStatus },
      });
      setLeaveRequestNotice("Le statut de la demande de conge a ete mis a jour.");
      await refetchLeaveWorkflowData();
    } catch {
      return;
    } finally {
      setLeaveActionRequestId(null);
    }
  };

  const submitLeaveWorkflowAction = async (leaveRequest, action) => {
    const leaveRequestId = leaveRequest?.id;
    if (!leaveRequestId || !action) return;

    setLeaveManagementError(null);
    setLeaveRequestNotice("");
    setLeaveActionRequestId(leaveRequestId);

    try {
      await mutateLeaveRequest({
        method: "patch",
        url: `/payroll/leave-requests/${leaveRequestId}`,
        data: compactPayload({
          action,
          decision_note: (leaveDecisionNotes[leaveRequestId] || "").trim(),
        }),
      });
      setLeaveRequestNotice(action === "reject" ? "La demande a ete rejetee." : "La decision du workflow a ete enregistree.");
      setLeaveDecisionNotes((current) => {
        if (!(leaveRequestId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[leaveRequestId];
        return next;
      });
      await refetchLeaveWorkflowData();
    } catch {
      return;
    } finally {
      setLeaveActionRequestId(null);
    }
  };

  if (isSelfServicePayroll) {
    const attendance = selfSummaryData?.attendance;
    const payslips = selfPayslipsData?.items || [];
    const latestPayslip = payslips[0];
    const selfLeaveSummary = selfSummaryData?.leave_summary || buildEmptyLeaveSummary();
    const trackedDaysLabel = attendance?.period_days ? `${attendance.tracked_days ?? 0}/${attendance.period_days} jour(s) renseigne(s)` : "Aucune periode consolidee";
    const absenceCoverageLabel = attendance
      ? `${attendance.approved_leave_days ?? 0} couvert(es) par conge(s) | ${attendance.unjustified_absence_days ?? 0} non couvert(es)`
      : "En attente des premieres presences";
    const latenessHelperLabel = attendance
      ? `Heures sup: ${formatCount(attendance.overtime_hours ?? 0, locale)} h | Horaire: ${selfSummaryData?.payroll_profile?.hours_schedule || "Non renseigne"}`
      : `Horaire: ${selfSummaryData?.payroll_profile?.hours_schedule || "Non renseigne"}`;

    return (
      <section className="space-y-5">
        <Card className="border-0 bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_48%,#14b8a6_100%)] text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.75)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">{t("navigation.payroll")}</p>
              <h2 className="text-2xl font-semibold">{selfServiceTitle}</h2>
              <p className="max-w-3xl text-sm text-white/80">{selfServiceSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={focusSection === "leave" ? "primary" : "outline"}>
                <Link to="/app/payroll?focus=leave">{leaveShortcutLabel}</Link>
              </Button>
              <Button asChild variant={focusSection === "payslips" ? "primary" : "outline"}>
                <Link to="/app/payroll?focus=payslips">{payslipsShortcutLabel}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/planning">{planningShortcutLabel}</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border-sky-200 bg-sky-50/70">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{boundaryTitle}</h3>
            <p className="text-sm text-slate-600">{boundaryHint}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{boundaryPlanningTitle}</p>
              <p className="mt-2 text-sm text-slate-700">{boundaryPlanningBody}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{boundaryPayrollTitle}</p>
              <p className="mt-2 text-sm text-slate-700">{boundaryPayrollBody}</p>
            </div>
          </div>
        </Card>

        {downloadError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{downloadError}</Card>}
        {leaveRequestError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{leaveRequestError}</Card>}
        {leaveRequestNotice && <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{leaveRequestNotice}</Card>}

        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Salaire de base</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {selfSummaryData?.employee?.base_salary != null ? `${formatMoney(selfSummaryData.employee.base_salary, locale)} F` : "-"}
            </p>
            <p className="mt-2 text-sm text-slate-600">{selfSummaryData?.employee?.job_title || "Poste non renseigne"}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dernier net a payer</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {latestPayslip ? `${formatMoney(latestPayslip.net_a_payer, locale)} F` : "-"}
            </p>
            <p className="mt-2 text-sm text-slate-600">{latestPayslip?.period_key || "Aucun bulletin genere"}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Absences du mois</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{attendance?.absence_days ?? "-"}</p>
            <p className="mt-2 text-sm text-slate-600">{absenceCoverageLabel}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Retards et heures sup</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{attendance?.late_hours ?? "-"}</p>
            <p className="mt-2 text-sm text-slate-600">{latenessHelperLabel}</p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conge deja accorde</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCount(selfLeaveSummary.approved_days_total, locale)} jour(s)</p>
            <p className="mt-2 text-sm text-slate-600">{selfLeaveSummary.approved_requests || 0} demande(s) approuvee(s)</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Demandes en attente</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{selfLeaveSummary.pending_requests || 0}</p>
            <p className="mt-2 text-sm text-slate-600">{formatCount(selfLeaveSummary.pending_days_total, locale)} jour(s) encore en attente</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Historique conges</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{selfLeaveSummary.total_requests || 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              Derniere demande: {selfLeaveSummary.last_request_at ? formatDate(selfLeaveSummary.last_request_at, locale) : "-"}
            </p>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card id="payroll-self-summary" className={`space-y-4 ${getFocusCardClass(focusSection === "summary")}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ma synthese employe</h3>
                <p className="text-sm text-slate-500">
                  Salaire, horaires, absences et informations pratiques de la derniere periode.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{selfSummaryData?.employee?.full_name || "Employe"}</p>
                <p>{selfSummaryData?.employee?.department || "Service non renseigne"}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Periode suivie</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{attendance?.period_key || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{attendance?.period_label || "Derniere preparation connue"}</p>
                <p className="mt-2 text-xs text-slate-500">{trackedDaysLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Mode de paiement</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {selfSummaryData?.payroll_profile?.payment_method || "bank_transfer"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {selfSummaryData?.payroll_profile?.hours_schedule || "Horaire non renseigne"}
                </p>
              </div>
            </div>

            {attendance && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Presences</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{attendance.present_days ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-600">Jours saisis comme presents sur la periode.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conges approuves</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{attendance.approved_leave_days ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-600">Absences couvrees par une validation RH/paie.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Absences non couvertes</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{attendance.unjustified_absence_days ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-600">Absences constatees sans conge approuve associe.</p>
                </div>
              </div>
            )}

            {attendance?.observation && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Observation</p>
                <p className="mt-2 text-sm text-slate-700">{attendance.observation}</p>
              </div>
            )}
          </Card>

          <Card id="payroll-self-leave" className={`space-y-4 ${getFocusCardClass(focusSection === "leave")}`}>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Absence, retard et conges</h3>
              <p className="text-sm text-slate-500">
                Envoyez un conge, un justificatif d&apos;absence ou un justificatif de retard avec piece jointe si besoin.
              </p>
            </div>

            <form className="space-y-3" onSubmit={submitLeaveRequest}>
              <select className={SELECT_CLASS} value={leaveForm.type} onChange={(event) => updateLeaveForm("type", event.target.value)}>
                {SELF_SERVICE_LEAVE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Intitule de la demande ou du justificatif"
                value={leaveForm.title || ""}
                onChange={(event) => updateLeaveForm("title", event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input required type="date" value={leaveForm.start_date} onChange={(event) => updateLeaveForm("start_date", event.target.value)} />
                <Input required type="date" value={leaveForm.end_date} onChange={(event) => updateLeaveForm("end_date", event.target.value)} />
              </div>
              <Input
                placeholder="Contact pendant l'absence"
                value={leaveForm.contact}
                onChange={(event) => updateLeaveForm("contact", event.target.value)}
              />
              <Textarea
                rows={3}
                placeholder="Motif ou contexte"
                value={leaveForm.reason}
                onChange={(event) => updateLeaveForm("reason", event.target.value)}
              />
              <Textarea
                rows={2}
                placeholder="Passation / consignes utiles"
                value={leaveForm.handover_note}
                onChange={(event) => updateLeaveForm("handover_note", event.target.value)}
              />
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Piece justificative</p>
                    <p className="text-xs text-slate-500">
                      {leaveForm.supporting_document_name || "Ajoutez un certificat, une capture, un PDF ou tout autre justificatif."}
                    </p>
                  </div>
                  {leaveForm.supporting_document_url ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => downloadProtectedFile(leaveForm.supporting_document_url, leaveForm.supporting_document_name || "justificatif")}
                    >
                      Ouvrir la piece
                    </Button>
                  ) : null}
                </div>
                <Input
                  className="mt-3"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(event) => uploadLeaveProof(event.target.files?.[0])}
                />
                {uploadingLeaveProof ? <p className="mt-2 text-xs text-slate-500">Televersement du justificatif...</p> : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Duree estimee: {computeLeaveDays(leaveForm.start_date, leaveForm.end_date) ?? "-"} jour(s)
                </p>
                <Button type="submit" disabled={submittingLeaveRequest}>
                  {submittingLeaveRequest ? t("common.loading") : "Envoyer la demande"}
                </Button>
              </div>
            </form>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">Historique des demandes et conges</h4>
                {loadingLeaveRequests && <p className="text-xs text-slate-500">{t("common.loading")}</p>}
              </div>
              {!loadingLeaveRequests && !leaveRequests.length && (
                <p className="mt-3 text-sm text-slate-500">Aucune demande de conge enregistree pour le moment.</p>
              )}
              <div className="mt-3 space-y-3">
                {leaveRequests.map((item) => {
                  const statusMeta = getLeaveStatusMeta(item.status);

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-500">
                            {formatDate(item.start_date, locale)} - {formatDate(item.end_date, locale)}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{item.reason || "Motif non renseigne"}</p>
                      {item.supporting_document_url ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => downloadProtectedFile(item.supporting_document_url, item.supporting_document_name || "justificatif")}
                          >
                            Voir le justificatif
                          </Button>
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{item.days_requested ?? "-"} jour(s)</span>
                        <span>|</span>
                        <span>{SELF_SERVICE_LEAVE_TYPES.find((type) => type.value === item.type)?.label || item.type}</span>
                        <span>|</span>
                        <span>{formatDate(item.created_at, locale)}</span>
                        {item.source === "local" && (
                          <>
                            <span>|</span>
                            <span>En attente de synchronisation</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        <Card id="payroll-self-payslips" className={`space-y-4 ${getFocusCardClass(focusSection === "payslips")}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Mes bulletins</h3>
              <p className="text-sm text-slate-500">Filtrez puis telechargez vos bulletins deja generes par la paie.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bulletins disponibles</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selfSummaryData?.payslips_count ?? payslips.length}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              type="month"
              value={payslipFilters.month}
              onChange={(event) => setPayslipFilters((current) => ({ ...current, month: event.target.value }))}
            />
            <Input
              type="date"
              value={payslipFilters.date_from}
              onChange={(event) => setPayslipFilters((current) => ({ ...current, date_from: event.target.value }))}
            />
            <Input
              type="date"
              value={payslipFilters.date_to}
              onChange={(event) => setPayslipFilters((current) => ({ ...current, date_to: event.target.value }))}
            />
          </div>
          {loadingSelfPayslips && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
          {!loadingSelfPayslips && !payslips.length && <p className="text-sm text-slate-500">Aucun bulletin disponible.</p>}
          {payslips.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{item.period_key}</p>
                  <p className="text-sm text-slate-500">{item.run_reference || "Run paie"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(item.net_a_payer, locale)} F</p>
                  <p className="text-xs text-slate-500">Net a payer</p>
                </div>
              </div>
              <Button
                className="mt-3"
                variant="outline"
                type="button"
                disabled={!item.download_path}
                onClick={() => downloadPayslipByPath(item.download_path, `bulletin-${item.period_key}.pdf`)}
              >
                Telecharger le PDF
              </Button>
            </div>
          ))}
        </Card>
      </section>
    );
  }

  const updatePeriod = (key, value) => setPeriodForm((current) => ({ ...current, [key]: value }));
  const updateEmployeeInput = (employeeId, key, value) =>
    setEmployeeInputs((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] || {}),
        [key]: value,
      },
    }));
  const updateProfileInput = (employeeId, key, value) =>
    setProfileInputs((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] || {}),
        [key]: value,
      },
    }));

  const toggleEmployee = (employeeId) =>
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId],
    );

  const toggleSelectAll = () =>
    setSelectedEmployeeIds((current) => (current.length === employees.length ? [] : employees.map((employee) => employee.id)));

  const toggleSelectVisibleEmployees = () =>
    setSelectedEmployeeIds((current) => {
      const visibleIds = filteredEmployees.map((employee) => employee.id);
      if (!visibleIds.length) return current;

      const everyVisibleEmployeeSelected = visibleIds.every((id) => current.includes(id));
      if (everyVisibleEmployeeSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });

  const resetToNewDraft = () => {
    setSelectedPeriodId(null);
    setPreparationNotice("");
    setGenerationResult(null);
    setPeriodForm(buildDefaultPeriod());
    setEmployeeInputs(
      Object.fromEntries(employees.map((employee) => [employee.id, buildEmployeeDefaults(employee)])),
    );
    setSelectedEmployeeIds(employees.map((employee) => employee.id));
  };

  const ensurePeriodDraft = async () => {
    setPreparationError(null);
    const payload = compactPayload({
      label: periodForm.label,
      notes: periodForm.notes,
      start_date: periodForm.start_date,
      end_date: periodForm.end_date,
      payment_date: periodForm.payment_date,
    });

    const response = selectedPeriodId
      ? await mutatePreparation({
          method: "patch",
          url: `/payroll/periods/${selectedPeriodId}`,
          data: payload,
        })
      : await mutatePreparation({
          method: "post",
          url: "/payroll/periods",
          data: payload,
        });

    const period = unwrapMutationPayload(response);
    setSelectedPeriodId(period.id);
    await refetchPeriods();
    return period.id;
  };

  const saveCurrentPreparation = async ({ silent = false } = {}) => {
    const periodId = await ensurePeriodDraft();
    const payload = {
      employee_inputs: selectedEmployeeIds.map((employeeId) =>
        compactPayload({
          user_id: employeeId,
          ...(employeeInputs[employeeId] || {}),
        }),
      ),
    };
    const response = await mutatePreparation({
      method: "put",
      url: `/payroll/periods/${periodId}/inputs`,
      data: payload,
    });
    setSelectedPeriodId(periodId);
    if (!silent) {
      setPreparationNotice(`Preparation mensuelle enregistree pour ${payload.employee_inputs.length} employe(s).`);
    }
    await Promise.allSettled([refetchPeriods(), refetchSelectedPeriod(), refetchEmployees()]);
    return periodId;
  };

  const generatePayroll = async (event) => {
    event.preventDefault();
    setGenerationError(null);
    setDownloadError("");
    setPreparationNotice("");

    try {
      const periodId = await saveCurrentPreparation({ silent: true });
      const response = await mutateGeneration({
        method: "post",
        url: "/payroll/periods/generate",
        data: {
          payroll_period_id: periodId,
          dry_run: periodForm.dry_run,
          include_lines: periodForm.include_lines,
          employee_ids: selectedEmployeeIds,
        },
      });
      setGenerationResult(response);
      await Promise.allSettled([refetchRuns(), refetchEmployees(), refetchPeriods(), refetchSelectedPeriod()]);
    } catch {
      return;
    }
  };

  const savePreparationManually = async () => {
    setPreparationNotice("");
    try {
      await saveCurrentPreparation();
    } catch {
      return;
    }
  };

  const saveProfile = async (employee) => {
    setProfileError(null);
    setProfileNotice("");
    setProfileActionEmployeeId(employee.id);

    try {
      const response = await mutateProfile({
        method: "patch",
        url: `/payroll/employees/${employee.id}/profile`,
        data: compactPayload(profileInputs[employee.id] || {}),
      });
      const savedProfile = unwrapMutationPayload(response);
      setProfileInputs((current) => ({
        ...current,
        [employee.id]: buildProfileStateFromResponse(savedProfile),
      }));
      setEmployeeInputs((current) => ({
        ...current,
        [employee.id]: {
          ...(current[employee.id] || {}),
          transport_allowance: savedProfile.profile?.transport_allowance ?? "",
          other_gains: savedProfile.profile?.other_fixed_gains ?? "",
          payment_method: savedProfile.profile?.payment_method || "bank_transfer",
        },
      }));
      setProfileNotice(`Profil paie enregistre pour ${employee.full_name}.`);
      await refetchEmployees();
    } catch {
      return;
    } finally {
      setProfileActionEmployeeId(null);
    }
  };

  const resetProfile = async (employee) => {
    setProfileError(null);
    setProfileNotice("");
    setProfileActionEmployeeId(employee.id);

    try {
      const response = await mutateProfile({
        method: "delete",
        url: `/payroll/employees/${employee.id}/profile`,
      });
      const resetPayload = unwrapMutationPayload(response);
      setProfileInputs((current) => ({
        ...current,
        [employee.id]: buildProfileStateFromResponse(resetPayload),
      }));
      setEmployeeInputs((current) => ({
        ...current,
        [employee.id]: {
          ...(current[employee.id] || {}),
          transport_allowance: "",
          other_gains: "",
          payment_method: "bank_transfer",
        },
      }));
      setProfileNotice(`Profil paie reinitialise pour ${employee.full_name}.`);
      await refetchEmployees();
    } catch {
      return;
    } finally {
      setProfileActionEmployeeId(null);
    }
  };

  const deletePreparedInput = async (employee) => {
    if (!selectedPeriodId) return;
    setPreparationError(null);
    setPreparationNotice("");
    setPreparationActionEmployeeId(employee.id);

    try {
      const response = await mutatePreparation({
        method: "delete",
        url: `/payroll/periods/${selectedPeriodId}/inputs/${employee.id}`,
      });
      const periodPayload = unwrapMutationPayload(response);
      const row = (periodPayload.items || []).find((item) => item.employee.id === employee.id);
      setEmployeeInputs((current) => ({
        ...current,
        [employee.id]: row ? buildEmployeeStateFromPeriodItem(row) : buildEmployeeDefaults(employee),
      }));
      setPreparationNotice(`Preparation mensuelle effacee pour ${employee.full_name}.`);
      await Promise.allSettled([refetchPeriods(), refetchSelectedPeriod()]);
    } catch {
      return;
    } finally {
      setPreparationActionEmployeeId(null);
    }
  };

  const saveFocusedEmployeePreparation = async (employee) => {
    if (!employee) return;
    setPreparationError(null);
    setPreparationNotice("");
    setPreparationActionEmployeeId(employee.id);

    try {
      const periodId = await ensurePeriodDraft();
      await mutatePreparation({
        method: "put",
        url: `/payroll/periods/${periodId}/inputs`,
        data: {
          employee_inputs: [
            compactPayload({
              user_id: employee.id,
              ...(employeeInputs[employee.id] || {}),
            }),
          ],
        },
      });
      setSelectedEmployeeIds((current) => (current.includes(employee.id) ? current : [...current, employee.id]));
      setPreparationNotice(`Preparation mensuelle enregistree pour ${employee.full_name}.`);
      await Promise.allSettled([refetchPeriods(), refetchSelectedPeriod(), refetchEmployees()]);
    } catch {
      return;
    } finally {
      setPreparationActionEmployeeId(null);
    }
  };

  const downloadPayslip = async (item) => {
    if (!item.download_path) return;
    setDownloadError("");

    try {
      const url = item.download_path.replace(/^\/api\/v1/, "");
      const response = await httpClient.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = item.output_path?.split("/").pop() || `${item.matricule}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError(error.response?.data?.message || error.message || "Download failed");
    }
  };

  const selectedPeriodStatusMeta = getPayrollStatusMeta(selectedPeriod?.status);

  return (
    <section className="space-y-5">
      <Card className="border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#14b8a6_100%)] text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-white/15 bg-white/10 text-white" variant="neutral">
                {t("navigation.payroll")}
              </Badge>
              {isDafWorkspace ? (
                <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                  Pilotage DAF
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="max-w-3xl text-sm text-white/80">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManagePayroll ? (
                <Button asChild variant={focusSection === "cycle" ? "primary" : "outline"}>
                  <Link to="/app/payroll?focus=cycle">{cycleShortcutLabel}</Link>
                </Button>
              ) : null}
              <Button asChild variant={focusSection === "leave-management" ? "primary" : "outline"}>
                <Link to="/app/payroll?focus=leave-management">{leaveManagementShortcutLabel}</Link>
              </Button>
              {canManagePayroll ? (
                <Button asChild variant={focusSection === "runs" ? "primary" : "outline"}>
                  <Link to="/app/payroll?focus=runs">{runsShortcutLabel}</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link to="/app/planning">{planningShortcutLabel}</Link>
              </Button>
            </div>
          </div>
          {canManagePayroll ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Plafond CNPS</p>
                <p className="mt-2 text-xl font-semibold">{formatMoney(status?.cnps_ceiling, locale)} F</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Salaries actifs</p>
                <p className="mt-2 text-xl font-semibold">{payrollEnabledEmployeesCount}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Periodes brouillon</p>
                <p className="mt-2 text-xl font-semibold">{draftPeriods.length}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Runs generes</p>
                <p className="mt-2 text-xl font-semibold">{generatedPeriods.length}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Demandes en attente</p>
                <p className="mt-2 text-xl font-semibold">{leaveManagementSummary.pending_requests || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Jours accordes</p>
                <p className="mt-2 text-xl font-semibold">{formatCount(leaveManagementSummary.approved_days_total, locale)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-white/65">Demandes visibles</p>
                <p className="mt-2 text-xl font-semibold">{leaveManagementSummary.total_requests || 0}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {generationError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{generationError}</Card>}
      {profileError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{profileError}</Card>}
      {preparationError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{preparationError}</Card>}
      {leaveRequestError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{leaveRequestError}</Card>}
      {leaveManagementError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{leaveManagementError}</Card>}
      {preparationNotice && <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{preparationNotice}</Card>}
      {profileNotice && <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{profileNotice}</Card>}
      {leaveRequestNotice && <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{leaveRequestNotice}</Card>}
      {downloadError && <Card className="border-red-200 bg-red-50 text-sm text-red-700">{downloadError}</Card>}

      <Card className="space-y-4 border-sky-200 bg-sky-50/70">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{boundaryTitle}</h3>
          <p className="text-sm text-slate-600">{boundaryHint}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{boundaryPlanningTitle}</p>
            <p className="mt-2 text-sm text-slate-700">{boundaryPlanningBody}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{boundaryPayrollTitle}</p>
            <p className="mt-2 text-sm text-slate-700">{boundaryPayrollBody}</p>
          </div>
        </div>
      </Card>

      {canManagePayroll ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Salaries retenus" value={selectedEmployeeIds.length} helper={`${employees.length} employe(s) visibles`} />
          <SummaryCard
            label="Masse salariale cible"
            value={`${formatMoney(selectedPayrollMass, locale)} F`}
            helper="Base brute des salaries selectionnes"
            tone="text-sky-700"
          />
          <SummaryCard
            label="Conges en attente"
            value={employeesWithPendingLeaveCount}
            helper={`${leaveManagementSummary.pending_requests || 0} demande(s) a arbitrer`}
            tone="text-amber-700"
          />
          <SummaryCard
            label="Dernier run net"
            value={latestRun ? `${formatMoney(latestRun.total_net, locale)} F` : "-"}
            helper={latestRun ? `${latestRun.run_reference} | ${formatDate(latestRun.created_at, locale)}` : "Aucun run genere"}
            tone="text-emerald-700"
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Etape courante" value={leaveManagementSummary.pending_requests || 0} helper="Demandes encore a traiter" tone="text-amber-700" />
          <SummaryCard label="Jours accordes" value={formatCount(leaveManagementSummary.approved_days_total, locale)} helper="Demandes finalement approuvees" tone="text-emerald-700" />
          <SummaryCard label="Historique visible" value={leaveManagementSummary.total_requests || 0} helper={`${workflowEmployees.length} employe(s) concernes`} />
        </div>
      )}

      {canManagePayroll ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <form className="space-y-5" onSubmit={generatePayroll}>
          <Card id="payroll-cycle" className={`space-y-5 ${getFocusCardClass(focusSection === "cycle")}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cycle mensuel de paie</h3>
                <p className="text-sm text-slate-500">
                  Chargez un brouillon, mettez a jour la periode et lancez la generation quand la preparation est prete.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPeriod ? <Badge variant={selectedPeriodStatusMeta.variant}>{selectedPeriodStatusMeta.label}</Badge> : <Badge variant="info">Nouveau cycle</Badge>}
                <Badge variant="neutral">{selectedEmployeeIds.length} salaire(s) cibles</Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Brouillons" value={draftPeriods.length} helper="Periodes encore ajustables" />
              <SummaryCard label="Periode active" value={selectedPeriod?.period_key || "Nouvelle"} helper={selectedPeriod?.label || "Brouillon non enregistre"} />
              <SummaryCard
                label="Lignes preparees"
                value={selectedPeriod ? selectedPeriod.inputs_count || 0 : selectedEmployeeIds.length}
                helper="Salaries avec preparation mensuelle"
              />
              <SummaryCard
                label="Runs sur periode"
                value={selectedPeriod?.runs_count || 0}
                helper={selectedPeriod ? "Historique deja genere pour cette periode" : "Aucune periode selectionnee"}
              />
            </div>

            <EditableFieldList>
              <EditableFieldRow label="Brouillon actif" hint="Chargez une periode existante ou ouvrez un nouveau cycle.">
                <select className={SELECT_CLASS} value={selectedPeriodId || ""} onChange={(event) => setSelectedPeriodId(event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Nouveau brouillon mensuel</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label || period.period_key} | {period.status} | {period.inputs_count} ligne(s)
                    </option>
                  ))}
                </select>
              </EditableFieldRow>
              <EditableFieldRow label="Libelle et periode" hint="Nom du cycle et bornes de calcul." multiline>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="Libelle de periode" value={periodForm.label} onChange={(event) => updatePeriod("label", event.target.value)} />
                  <Input required type="date" value={periodForm.start_date} onChange={(event) => updatePeriod("start_date", event.target.value)} />
                  <Input required type="date" value={periodForm.end_date} onChange={(event) => updatePeriod("end_date", event.target.value)} />
                </div>
              </EditableFieldRow>
              <EditableFieldRow label="Paiement et notes" hint="Date de reglement et commentaires de cloture." multiline>
                <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                  <Input required type="date" value={periodForm.payment_date} onChange={(event) => updatePeriod("payment_date", event.target.value)} />
                  <Textarea rows={2} placeholder="Notes de cloture, hypotheses ou commentaires du cycle" value={periodForm.notes} onChange={(event) => updatePeriod("notes", event.target.value)} />
                </div>
              </EditableFieldRow>
            </EditableFieldList>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={periodForm.dry_run} onChange={(event) => updatePeriod("dry_run", event.target.checked)} />
                Dry run / apercu sans engagement
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={periodForm.include_lines} onChange={(event) => updatePeriod("include_lines", event.target.checked)} />
                Inclure les lignes de rubriques dans la reponse
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium text-slate-900">Preparation actuelle</p>
                  <p className="text-sm text-slate-600">
                    {selectedEmployeeIds.length} employe(s) selectionne(s) pour {selectedPeriod?.label || periodForm.label || "la periode en cours"}.
                  </p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-sm text-slate-500">Masse salariale cible</p>
                  <p className="text-lg font-semibold text-slate-900">{formatMoney(selectedPayrollMass, locale)} F</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={resetToNewDraft} type="button">
                  Repartir d&apos;un nouveau brouillon
                </Button>
                <Button variant="outline" onClick={savePreparationManually} type="button" disabled={savingPreparation || !selectedEmployeeIds.length}>
                  {savingPreparation ? t("common.loading") : "Enregistrer toute la preparation"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => Promise.allSettled([refetchEmployees(), refetchRuns(), refetchPeriods(), selectedPeriodId ? refetchSelectedPeriod() : Promise.resolve()])}
                  type="button"
                >
                  Actualiser
                </Button>
                <Button type="submit" disabled={savingGeneration || !selectedEmployeeIds.length}>
                  {savingGeneration ? t("common.loading") : "Generer les bulletins"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Derniere generation</h3>
                <p className="text-sm text-slate-500">Resultat immediat du dernier lancement effectue dans cette session.</p>
              </div>
              {generationResult?.run ? <Badge variant={generationResult.dry_run ? "info" : "success"}>{generationResult.dry_run ? "Preview" : "Run genere"}</Badge> : null}
            </div>
            {!generationResult?.items?.length && <p className="text-sm text-slate-500">Aucun resultat de generation dans cette session.</p>}
            <div className="space-y-3">
              {generationResult?.items?.slice(0, 6).map((item) => (
                <div key={`${item.employee_id}-${item.period_key}`} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{item.employee_name}</p>
                      <p className="text-sm text-slate-500">{item.matricule} | {item.period_key}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-slate-900">{item.net_a_payer_formatted}</p>
                      <p className="text-xs text-slate-500">{item.pdf_generated ? "PDF genere" : "Preview"}</p>
                    </div>
                  </div>
                  {item.download_path ? (
                    <Button className="mt-3" variant="outline" onClick={() => downloadPayslip(item)} type="button">
                      Telecharger le PDF
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

        <Card id="payroll-team" className={`space-y-4 ${getFocusCardClass(focusSection === "team")}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Equipe paie</h3>
              <p className="text-sm text-slate-500">
                {loadingEmployees || loadingPeriodInputs
                  ? t("common.loading")
                  : `${selectedEmployeeIds.length} inclus sur ${employees.length} salarie(s) | ${filteredEmployees.length} visible(s)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{preparedEmployeeIds.size} preparation(s)</Badge>
              <Button variant="outline" onClick={toggleSelectVisibleEmployees} type="button" disabled={!filteredEmployees.length}>
                {allFilteredEmployeesSelected ? "Retirer visibles" : "Inclure visibles"}
              </Button>
              <Button variant="outline" onClick={toggleSelectAll} type="button" disabled={!employees.length}>
                {allEmployeesSelected ? "Tout retirer" : "Tout inclure"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr]">
            <Input
              placeholder="Rechercher un salarie, matricule, poste ou service"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
            />
            <select className={SELECT_CLASS} value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
              <option value="all">Tous les salaries</option>
              <option value="selected">Inclus dans le cycle</option>
              <option value="enabled">Paie active</option>
              <option value="pending_leave">Conges en attente</option>
            </select>
          </div>

          {!employees.length && <p className="text-sm text-slate-500">Aucun employe disponible pour la paie.</p>}
          {!!employees.length && !filteredEmployees.length && <p className="text-sm text-slate-500">Aucun salarie ne correspond aux filtres actuels.</p>}
          <div className="space-y-3">
            {filteredEmployees.map((employee) => {
              const values = employeeInputs[employee.id] || buildEmployeeDefaults(employee);
              const profileValues = profileInputs[employee.id] || buildProfileDefaults(employee);
              const leaveSummary = employee.leave_summary || buildEmptyLeaveSummary();
              const attendanceSummary = periodInputRowsByEmployeeId.get(employee.id)?.input?.attendance_summary || null;
              const isFocused = focusedEmployee?.id === employee.id;
              const isPrepared = preparedEmployeeIds.has(employee.id);
              return (
                <div key={employee.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
                      <div>
                        <p className="font-medium text-slate-900">{employee.full_name}</p>
                        <p className="text-sm text-slate-500">{employee.employee_number || `ID ${employee.id}`} | {employee.job_title || "-"}</p>
                        <p className="text-xs text-slate-500">{employee.department || "-"} | {formatMoney(employee.base_salary, locale)} F</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={selectedEmployeeIds.includes(employee.id) ? "success" : "neutral"}>
                            {selectedEmployeeIds.includes(employee.id) ? "Inclus" : "Hors cycle"}
                          </Badge>
                          <Badge variant={employee.payroll_enabled !== false ? "success" : "warning"}>
                            {employee.payroll_enabled !== false ? "Paie active" : "Paie stoppee"}
                          </Badge>
                          {isPrepared ? <Badge variant="info">Preparation enregistree</Badge> : null}
                          {leaveSummary.pending_requests ? <Badge variant="warning">{leaveSummary.pending_requests} conge(s)</Badge> : null}
                        </div>
                      </div>
                    </label>
                    <div className="flex flex-col gap-2 text-left lg:items-end lg:text-right">
                      <div className="text-xs text-slate-500">
                        <p>{getPaymentMethodLabel(employee.payment_method || employee.profile?.payment_method)}</p>
                        <p>{formatDate(employee.hire_date, locale)}</p>
                      </div>
                      <Button type="button" variant={isFocused ? "outline" : "ghost"} onClick={() => setFocusedEmployeeId(employee.id)}>
                        {isFocused ? "Dossier ouvert" : "Ouvrir le dossier"}
                      </Button>
                    </div>
                  </div>

                  {isFocused ? (
                    <>
                      <EditableFieldList className="mt-4">
                        <EditableFieldRow label="Temps du mois" hint="Temps declare et incidents d'assiduite.">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input type="number" placeholder="Jours payes" value={values.days_paid} onChange={(event) => updateEmployeeInput(employee.id, "days_paid", event.target.value)} />
                            <Input type="number" placeholder="Heures de retard" value={values.late_hours} onChange={(event) => updateEmployeeInput(employee.id, "late_hours", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        {attendanceSummary ? (
                          <EditableFieldRow label="Attendance consolidee" hint="Valeurs recommandees a partir des presences terrain et conges valides.">
                            <div className="grid gap-3 md:grid-cols-4">
                              <SummaryCard
                                label="Jours recommandes"
                                value={`${formatCount(attendanceSummary.recommended_days_paid ?? 0, locale)} j`}
                                helper={`${attendanceSummary.tracked_days ?? 0} jour(s) suivis`}
                                tone="text-sky-700"
                              />
                              <SummaryCard
                                label="Retards"
                                value={`${formatCount(attendanceSummary.recommended_late_hours ?? 0, locale)} h`}
                                helper={`${attendanceSummary.late_days ?? 0} jour(s) en retard`}
                                tone="text-amber-700"
                              />
                              <SummaryCard
                                label="Conges valides"
                                value={`${formatCount(attendanceSummary.approved_leave_days ?? 0, locale)} j`}
                                helper={`${attendanceSummary.tracked_presence_days ?? 0} jour(s) travailles`}
                                tone="text-emerald-700"
                              />
                              <SummaryCard
                                label="Absences non couvertes"
                                value={`${formatCount(attendanceSummary.unjustified_absence_days ?? 0, locale)} j`}
                                helper={`Heures sup ${formatCount(attendanceSummary.overtime_hours ?? 0, locale)} h`}
                                tone="text-rose-700"
                              />
                            </div>
                          </EditableFieldRow>
                        ) : null}
                        <EditableFieldRow label="Base et brut" hint="Base mensuelle retenue pour le calcul." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input type="number" placeholder="Base salariale du mois" value={values.salary_base_override || ""} onChange={(event) => updateEmployeeInput(employee.id, "salary_base_override", event.target.value)} />
                            <Input type="number" placeholder="Brut imposable" value={values.brut_imposable} onChange={(event) => updateEmployeeInput(employee.id, "brut_imposable", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Avantages" hint="Composants variables verses ce mois.">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input type="number" placeholder="Transport" value={values.transport_allowance} onChange={(event) => updateEmployeeInput(employee.id, "transport_allowance", event.target.value)} />
                            <Input type="number" placeholder="Autres gains" value={values.other_gains} onChange={(event) => updateEmployeeInput(employee.id, "other_gains", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Retenues" hint="Impot et retenues appliquees au bulletin." multiline>
                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                            <Input type="number" placeholder="IRPP" value={values.irpp} onChange={(event) => updateEmployeeInput(employee.id, "irpp", event.target.value)} />
                            <Input type="number" placeholder="CAC" value={values.cac} onChange={(event) => updateEmployeeInput(employee.id, "cac", event.target.value)} />
                            <Input type="number" placeholder="TC" value={values.tc} onChange={(event) => updateEmployeeInput(employee.id, "tc", event.target.value)} />
                            <Input type="number" placeholder="RAV" value={values.rav} onChange={(event) => updateEmployeeInput(employee.id, "rav", event.target.value)} />
                            <Input type="number" placeholder="CFS" value={values.cfs} onChange={(event) => updateEmployeeInput(employee.id, "cfs", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Mode de paiement" hint="Canal de reglement pour ce mois.">
                          <select className={SELECT_CLASS} value={values.payment_method} onChange={(event) => updateEmployeeInput(employee.id, "payment_method", event.target.value)}>
                            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>)}
                          </select>
                        </EditableFieldRow>
                        <EditableFieldRow label="Observation" hint="Commentaire libre pour cette preparation." multiline>
                          <Textarea rows={2} placeholder="Observation" value={values.observation} onChange={(event) => updateEmployeeInput(employee.id, "observation", event.target.value)} />
                        </EditableFieldRow>
                      </EditableFieldList>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canManagePayroll || (savingPreparation && preparationActionEmployeeId === employee.id)}
                          onClick={() => saveFocusedEmployeePreparation(employee)}
                        >
                          {savingPreparation && preparationActionEmployeeId === employee.id ? t("common.loading") : "Enregistrer cette preparation"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!selectedPeriodId || !canManagePayroll || (savingPreparation && preparationActionEmployeeId === employee.id)}
                          onClick={() => deletePreparedInput(employee)}
                        >
                          Effacer la preparation du mois
                        </Button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Profil paie persistant</p>
                            <p className="text-xs text-slate-500">Ces valeurs alimentent les prochaines generations tant qu&apos;elles ne sont pas remplacees au mois.</p>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={Boolean(profileValues.is_payroll_enabled)} onChange={(event) => updateProfileInput(employee.id, "is_payroll_enabled", event.target.checked)} />
                            Paie active
                          </label>
                        </div>

                        <EditableFieldList className="mt-4">
                          <EditableFieldRow label="Classification" hint="Categorie, echelon et emploi de reference." multiline>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <Input placeholder="Categorie" value={profileValues.category} onChange={(event) => updateProfileInput(employee.id, "category", event.target.value)} />
                              <Input placeholder="Echelon" value={profileValues.echelon} onChange={(event) => updateProfileInput(employee.id, "echelon", event.target.value)} />
                              <Input placeholder="Emploi occupe" value={profileValues.employment_label} onChange={(event) => updateProfileInput(employee.id, "employment_label", event.target.value)} />
                            </div>
                          </EditableFieldRow>
                          <EditableFieldRow label="Conformite sociale" hint="Elements statutaires et administratifs." multiline>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <Input placeholder="Numero CNPS" value={profileValues.cnps_number} onChange={(event) => updateProfileInput(employee.id, "cnps_number", event.target.value)} />
                              <Input placeholder="Convention collective" value={profileValues.convention_collective} onChange={(event) => updateProfileInput(employee.id, "convention_collective", event.target.value)} />
                              <Input placeholder="Horaire" value={profileValues.hours_schedule} onChange={(event) => updateProfileInput(employee.id, "hours_schedule", event.target.value)} />
                              <Input placeholder="Situation familiale" value={profileValues.family_status} onChange={(event) => updateProfileInput(employee.id, "family_status", event.target.value)} />
                            </div>
                          </EditableFieldRow>
                          <EditableFieldRow label="Paiement et avantages" hint="Reglement de reference et montants fixes." multiline>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <select className={SELECT_CLASS} value={profileValues.payment_method} onChange={(event) => updateProfileInput(employee.id, "payment_method", event.target.value)}>
                                {PAYMENT_METHODS.map((method) => <option key={`profile-${method}`} value={method}>{getPaymentMethodLabel(method)}</option>)}
                              </select>
                              <Input type="number" placeholder="Transport fixe" value={profileValues.transport_allowance} onChange={(event) => updateProfileInput(employee.id, "transport_allowance", event.target.value)} />
                              <Input type="number" placeholder="Autres gains fixes" value={profileValues.other_fixed_gains} onChange={(event) => updateProfileInput(employee.id, "other_fixed_gains", event.target.value)} />
                              <Input placeholder="Compte bancaire" value={profileValues.bank_account_number} onChange={(event) => updateProfileInput(employee.id, "bank_account_number", event.target.value)} />
                            </div>
                          </EditableFieldRow>
                          <EditableFieldRow label="Domiciliation" hint="Banque ou agence de domiciliation.">
                            <Input placeholder="Domiciliation bancaire" value={profileValues.bank_domiciliation} onChange={(event) => updateProfileInput(employee.id, "bank_domiciliation", event.target.value)} />
                          </EditableFieldRow>
                          <EditableFieldRow label="Notes du profil" hint="Commentaire interne permanent." multiline>
                            <Textarea className="mt-0" rows={2} placeholder="Notes du profil paie" value={profileValues.payroll_notes} onChange={(event) => updateProfileInput(employee.id, "payroll_notes", event.target.value)} />
                          </EditableFieldRow>
                        </EditableFieldList>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" disabled={!canManagePayroll || (savingProfile && profileActionEmployeeId === employee.id)} onClick={() => saveProfile(employee)}>
                            {savingProfile && profileActionEmployeeId === employee.id ? t("common.loading") : "Enregistrer le profil"}
                          </Button>
                          <Button type="button" variant="ghost" disabled={!canManagePayroll || (savingProfile && profileActionEmployeeId === employee.id)} onClick={() => resetProfile(employee)}>
                            Reinitialiser le profil
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <SummaryCard label="Conges approuves" value={`${formatCount(leaveSummary.approved_days_total, locale)} j`} helper={`${leaveSummary.total_requests || 0} demande(s)`} />
                      <SummaryCard label="Conges en attente" value={leaveSummary.pending_requests || 0} helper="Impact potentiel paie" tone="text-amber-700" />
                      <SummaryCard label="Paiement" value={getPaymentMethodLabel(values.payment_method || employee.payment_method)} helper={employee.profile?.bank_domiciliation || "Mode de reglement"} />
                      <SummaryCard label="Dossier" value={isPrepared ? "Pret" : "A saisir"} helper="Ouvrir pour modifier" tone={isPrepared ? "text-sky-700" : "text-slate-900"} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </Card>
          </form>
        </div>
      ) : null}

      <Card id="payroll-leave-management" className={`space-y-5 ${getFocusCardClass(focusSection === "leave-management")}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{isWorkflowOnlyPayroll ? "Circuit d'approbation des conges" : "Pilotage RH des conges"}</h3>
            <p className="text-sm text-slate-500">
              {isWorkflowOnlyPayroll
                ? "Traitez uniquement les dossiers qui attendent votre validation manager, RH ou direction."
                : "Historique global des mises en conge, jours deja accordes et validation des demandes employees."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Jours accordes</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatCount(leaveManagementSummary.approved_days_total, locale)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Demandes en attente</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{leaveManagementSummary.pending_requests || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Demandes historisees</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{leaveManagementSummary.total_requests || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <select
            className={SELECT_CLASS}
            value={leaveManagementFilter.employeeId}
            onChange={(event) => updateLeaveManagementFilterValue("employeeId", event.target.value)}
          >
            <option value="">Tous les employes</option>
            {(isWorkflowOnlyPayroll ? workflowEmployees : employees).map((employee) => (
              <option key={`leave-filter-${employee.id}`} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={leaveManagementFilter.status}
            onChange={(event) => updateLeaveManagementFilterValue("status", event.target.value)}
          >
            <option value="">Tous les statuts</option>
            {LEAVE_REQUEST_STATUS_OPTIONS.map((statusOption) => (
              <option key={`leave-status-filter-${statusOption.value}`} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={refetchLeaveWorkflowData}>
            Actualiser les conges
          </Button>
        </div>

        {loadingManagedLeaveRequests && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
        {!loadingManagedLeaveRequests && !filteredManagedLeaveRequests.length && (
          <p className="text-sm text-slate-500">Aucune demande de conge ne correspond aux filtres actuels.</p>
        )}

        <div className="space-y-3">
          {filteredManagedLeaveRequests.map((item) => {
            const statusMeta = getLeaveStatusMeta(item.status);
            const employeeLeaveSummary = item.employee_leave_summary || buildEmptyLeaveSummary();
            const workflow = item.workflow || buildEmptyLeaveWorkflow();
            const decisionNote = leaveDecisionNotes[item.id] || "";
            const canApprove = workflow.available_actions.includes("approve");
            const canReject = workflow.available_actions.includes("reject");
            const workflowStatusLabel = workflow.current_stage_label || (workflow.is_final ? "Workflow finalise" : workflow.is_rejected ? "Workflow rejete" : "Aucune etape active");

            return (
              <div key={`managed-leave-${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.employee?.full_name || item.title}</p>
                    <p className="text-sm text-slate-500">
                      {(item.employee?.employee_number || "Sans matricule")} | {item.employee?.job_title || "Poste non renseigne"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {SELF_SERVICE_LEAVE_TYPES.find((type) => type.value === item.type)?.label || item.type} | {formatDate(item.start_date, locale)} -{" "}
                      {formatDate(item.end_date, locale)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>{statusMeta.label}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getWorkflowStageStatusMeta(workflow.is_rejected ? "cancelled" : workflow.is_final ? "completed" : workflow.current_stage_code ? "current" : "pending")}`}>
                      {workflowStatusLabel}
                    </span>
                    {canManagePayroll ? (
                      <select
                        className={SELECT_CLASS}
                        value={item.status}
                        disabled={leaveActionRequestId === item.id && savingLeaveRequest}
                        onChange={(event) => updateLeaveRequestStatus(item.id, event.target.value)}
                      >
                        {LEAVE_REQUEST_STATUS_OPTIONS.map((statusOption) => (
                          <option key={`managed-status-${item.id}-${statusOption.value}`} value={statusOption.value}>
                            {statusOption.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.reason || "Motif non renseigne"}</p>
                {item.supporting_document_url ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => downloadProtectedFile(item.supporting_document_url, item.supporting_document_name || "justificatif")}
                    >
                      Ouvrir le justificatif
                    </Button>
                  </div>
                ) : null}
                {!!workflow.stages.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {workflow.stages.map((stage) => (
                      <span
                        key={`${item.id}-${stage.code}`}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getWorkflowStageStatusMeta(stage.status)}`}
                      >
                        {stage.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {(canApprove || canReject) ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Decision de workflow</p>
                        <p className="text-sm text-slate-500">
                          {workflow.current_stage_label ? `Etape en cours: ${workflow.current_stage_label}.` : "Ajoutez une note si necessaire avant de statuer."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canApprove ? (
                          <Button
                            type="button"
                            disabled={leaveActionRequestId === item.id && savingLeaveRequest}
                            onClick={() => submitLeaveWorkflowAction(item, "approve")}
                          >
                            {leaveActionRequestId === item.id && savingLeaveRequest ? t("common.loading") : "Approuver"}
                          </Button>
                        ) : null}
                        {canReject ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={leaveActionRequestId === item.id && savingLeaveRequest}
                            onClick={() => submitLeaveWorkflowAction(item, "reject")}
                          >
                            {leaveActionRequestId === item.id && savingLeaveRequest ? t("common.loading") : "Rejeter"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Textarea
                      className="mt-3"
                      rows={2}
                      placeholder="Note de decision, justification ou consigne pour l'etape suivante"
                      value={decisionNote}
                      onChange={(event) => updateLeaveDecisionNote(item.id, event.target.value)}
                    />
                    <p className="mt-2 text-xs text-slate-500">Le motif est requis en cas de rejet.</p>
                  </div>
                ) : null}
                {!!workflow.history.length ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">Historique de validation</p>
                    <div className="mt-3 space-y-3">
                      {workflow.history.map((entry) => (
                        <div key={`leave-history-${item.id}-${entry.id}`} className="rounded-2xl border border-slate-200 px-3 py-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{entry.workflow_stage_label || entry.label || "Etape de workflow"}</p>
                              <p className="text-xs text-slate-500">
                                {(entry.actor?.full_name || entry.actor?.email || "Systeme")} | {formatDate(entry.created_at, locale)}
                              </p>
                            </div>
                            {entry.decision ? (
                              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getWorkflowStageStatusMeta(entry.decision === "reject" ? "cancelled" : "completed")}`}>
                                {entry.decision === "reject" ? "Rejet" : "Validation"}
                              </span>
                            ) : null}
                          </div>
                          {entry.decision_note ? <p className="mt-2 text-sm text-slate-600">{entry.decision_note}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{formatCount(item.days_requested, locale)} jour(s) demande(s)</span>
                  <span>|</span>
                  <span>{item.employee?.department || "Service non renseigne"}</span>
                  <span>|</span>
                  <span>Historique employe: {employeeLeaveSummary.total_requests || 0} demande(s)</span>
                  <span>|</span>
                  <span>Deja accordes: {formatCount(employeeLeaveSummary.approved_days_total, locale)} jour(s)</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {canManagePayroll ? (
        <Card id="payroll-runs" className={`space-y-4 ${getFocusCardClass(focusSection === "runs")}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Historique des runs</h3>
              <p className="text-sm text-slate-500">Suivez les generations de paie, les montants agreges et le statut d&apos;execution.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{runs.length} run(s)</Badge>
              {latestRun ? <Badge variant="success">{latestRun.run_reference}</Badge> : null}
            </div>
          </div>

          {loadingRuns && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
          {!runs.length && !loadingRuns && <p className="text-sm text-slate-500">Aucun run paie enregistre pour le moment.</p>}

          {runs.map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-medium text-slate-900">{run.run_reference}</p>
                  <p className="text-sm text-slate-500">{run.period?.label || run.period?.period_key || "Periode non renseignee"}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Effectif</p>
                    <p className="mt-1 font-medium text-slate-900">{run.employee_count}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Brut</p>
                    <p className="mt-1 font-medium text-slate-900">{formatMoney(run.total_brut, locale)} F</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Net</p>
                    <p className="mt-1 font-medium text-slate-900">{formatMoney(run.total_net, locale)} F</p>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <Badge variant={run.status === "generated" ? "success" : run.error_message ? "danger" : "warning"}>
                    {run.status || "inconnu"}
                  </Badge>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(run.created_at, locale)}</p>
                </div>
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </section>
  );
}
