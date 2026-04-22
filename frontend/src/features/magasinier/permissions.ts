import { initialsFromName } from "@/features/magasinier/utils/format";
import type {
  MagasinierProject,
  MagasinierScopeFlags,
  MagasinierUserProfile,
  NotificationItem,
  ProjectContact,
  Signalement,
  StockItem,
  StockMovement,
  StockRequest,
} from "@/features/magasinier/types";

const DEFAULT_ASSIGNED_PROJECT_IDS = ["prj-bonanjo", "prj-yassa"];

export const MAGASINIER_SCOPE_FLAGS: MagasinierScopeFlags = {
  canViewGlobalProjects: false,
  canAccessAdminSettings: false,
  canViewFinance: false,
  canMessageOnlyScopedUsers: true,
  canManageProjectStock: true,
};

export function isMagasinierWorkspaceUser(user: any) {
  return user?.operational_profile_code === "magasinier" || user?.roles?.some((role: any) => {
    const code = typeof role === "string" ? role : role?.code;
    return code === "magasinier" || code === "logisticien";
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

export function buildCurrentMagasinierUser(user: any): MagasinierUserProfile {
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.name ||
    "Magasinier terrain";

  return {
    id: Number(user?.id || 402),
    displayName,
    email: user?.email || "magasinier@t-erp.demo",
    roleLabel: "Magasinier",
    department: user?.department || "Stock et logistique",
    jobTitle: user?.job_title || "Chef de magasin chantier",
    online: true,
    initials: initialsFromName(displayName),
  };
}

export function filterScopedProjects(projects: MagasinierProject[], assignedProjectIds: string[]) {
  return projects.filter((project) => assignedProjectIds.includes(project.id));
}

export function filterScopedItems(items: StockItem[], assignedProjectIds: string[]) {
  return items.filter((item) => assignedProjectIds.includes(item.projectId));
}

export function filterScopedMovements(movements: StockMovement[], assignedProjectIds: string[]) {
  return movements.filter((movement) => assignedProjectIds.includes(movement.projectId));
}

export function filterScopedRequests(requests: StockRequest[], assignedProjectIds: string[]) {
  return requests.filter((request) => assignedProjectIds.includes(request.projectId));
}

export function filterScopedSignalements(signalements: Signalement[], assignedProjectIds: string[]) {
  return signalements.filter((report) => assignedProjectIds.includes(report.projectId));
}

export function filterScopedContacts(contacts: ProjectContact[], assignedProjectIds: string[]) {
  return contacts.filter((contact) => {
    if (contact.roleCode === "admin") {
      return true;
    }

    return contact.projectIds.some((projectId) => assignedProjectIds.includes(projectId));
  });
}

export function filterScopedNotifications(notifications: NotificationItem[], assignedProjectIds: string[]) {
  return notifications.filter((notification) =>
    assignedProjectIds.some(
      (projectId) => notification.id.includes(projectId) || notification.description.includes(projectId)
    )
  );
}
