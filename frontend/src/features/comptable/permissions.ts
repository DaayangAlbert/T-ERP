import type {
  AttendanceRecord,
  ComptableProject,
  ComptableScopeFlags,
  ComptableUserProfile,
  FinanceRecord,
  InboxThread,
  NotificationItem,
  Payslip,
  ProofFile,
  StockItemSnapshot,
  StockMovementSnapshot,
  WorkerProfile,
} from "@/features/comptable/types";

const DEFAULT_ASSIGNED_PROJECT_IDS = ["prj-bonanjo", "prj-yassa"];

export const COMPTABLE_SCOPE_FLAGS: ComptableScopeFlags = {
  canReadInventory: true,
  canManageInventory: false,
  canAccessProjects: false,
  canAccessCompanies: false,
  canAccessAdministration: false,
  allowedModules: ["dashboard", "finance", "payroll", "inventory", "chat"],
};

function initialsFromName(name: string) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");
}

export function isComptableWorkspaceUser(user: any) {
  return user?.operational_profile_code === "comptable" || user?.roles?.some((role: any) => {
    const code = typeof role === "string" ? role : role?.code;
    return code === "comptable";
  });
}

export function getAssignedProjectIds(user: any) {
  const explicitIds = [
    ...(Array.isArray(user?.assigned_project_ids) ? user.assigned_project_ids : []),
    ...(Array.isArray(user?.project_ids) ? user.project_ids : []),
    ...(Array.isArray(user?.project_assignments)
      ? user.project_assignments.map((assignment: any) => assignment?.project_id)
      : []),
  ]
    .map((value) => String(value || ""))
    .filter(Boolean);

  return explicitIds.length ? [...new Set(explicitIds)] : DEFAULT_ASSIGNED_PROJECT_IDS;
}

export function buildCurrentComptableUser(user: any): ComptableUserProfile {
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.name ||
    "Comptable projet";

  return {
    id: Number(user?.id || 280),
    displayName,
    email: user?.email || "comptable@t-erp.demo",
    roleLabel: "Comptable",
    department: user?.department || "Finance chantier",
    jobTitle: user?.job_title || "Comptable projet BTP",
    initials: initialsFromName(displayName),
    online: true,
  };
}

export function filterScopedProjects(projects: ComptableProject[], assignedProjectIds: string[]) {
  return projects.filter((project) => assignedProjectIds.includes(project.id));
}

export function filterScopedWorkers(workers: WorkerProfile[], assignedProjectIds: string[]) {
  return workers.filter((worker) => assignedProjectIds.includes(worker.projectId));
}

export function filterScopedTransactions(transactions: FinanceRecord[], assignedProjectIds: string[]) {
  return transactions.filter((record) => assignedProjectIds.includes(record.projectId));
}

export function filterScopedPayslips(payslips: Payslip[], assignedProjectIds: string[]) {
  return payslips.filter((payslip) => assignedProjectIds.includes(payslip.projectId));
}

export function filterScopedAttendance(records: AttendanceRecord[], assignedProjectIds: string[]) {
  return records.filter((record) => assignedProjectIds.includes(record.projectId));
}

export function filterScopedStockItems(items: StockItemSnapshot[], assignedProjectIds: string[]) {
  return items.filter((item) => assignedProjectIds.includes(item.projectId));
}

export function filterScopedStockMovements(movements: StockMovementSnapshot[], assignedProjectIds: string[]) {
  return movements.filter((movement) => assignedProjectIds.includes(movement.projectId));
}

export function filterScopedNotifications(notifications: NotificationItem[], assignedProjectIds: string[]) {
  return notifications.filter((notification) =>
    !notification.description.includes("prj-") ||
    assignedProjectIds.some((projectId) => notification.description.includes(projectId))
  );
}

export function filterScopedInbox(inbox: InboxThread[], assignedProjectIds: string[]) {
  return inbox.filter((thread) => !thread.projectId || assignedProjectIds.includes(thread.projectId));
}

export function filterScopedProofs(proofs: ProofFile[], scopedRecords: Array<{ proofIds?: string[]; proofId?: string }>) {
  const proofIds = new Set(
    scopedRecords.flatMap((record) => [...(record.proofIds || []), ...(record.proofId ? [record.proofId] : [])])
  );

  return proofs.filter((proof) => proofIds.has(proof.id));
}
