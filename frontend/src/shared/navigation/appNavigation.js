import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";
import {
  canAccessWorkspaceEntry,
  getOperationalWorkspaceProfile,
  getWorkspaceNavigationSections,
} from "@/shared/utils/operationalRoles";

export const APP_NAV_ITEMS = [
  { id: "dashboard", to: "/app", end: true, labelKey: "navigation.dashboard" },
  { id: "companies", to: "/app/companies", labelKey: "navigation.companies", permission: "companies.read", moduleKey: "companies" },
  { id: "correspondences", to: "/app/correspondences", labelKey: "navigation.correspondences", permission: "companies.read", moduleKey: "companies" },
  { id: "users", to: "/app/users", labelKey: "navigation.users", permission: "users.read", moduleKey: "users" },
  { id: "projects", to: "/app/projects", labelKey: "navigation.projects", permission: "projects.read", moduleKey: "projects" },
  { id: "planning", to: "/app/planning", labelKey: "navigation.planning", moduleKey: "planning" },
  { id: "attendance", to: "/app/attendance", labelKey: "navigation.attendance", permission: "attendance.read", moduleKey: "attendance" },
  { id: "finance", to: "/app/finance", labelKey: "navigation.finance", permission: "finance.read", moduleKey: "finance" },
  { id: "inventory", to: "/app/inventory", labelKey: "navigation.inventory", permission: "inventory.read", moduleKey: "inventory" },
  { id: "payroll", to: "/app/payroll", labelKey: "navigation.payroll", permission: "payroll.read", moduleKey: "payroll" },
  { id: "procurement", to: "/app/procurement", labelKey: "navigation.procurement", permission: "procurement.read", moduleKey: "procurement" },
  { id: "chat", to: "/app/chat", labelKey: "navigation.chat", permission: "chat.read", moduleKey: "chat" },
  { id: "calls", to: "/app/calls", labelKey: "navigation.calls", permission: "calls.read", moduleKey: "calls" },
  { id: "recruitment", to: "/app/recruitment", labelKey: "navigation.recruitment", permission: "recruitment.read", moduleKey: "recruitment" },
  { id: "admin", to: "/app/admin", labelKey: "navigation.admin", permission: "companies.read", moduleKey: "companies" },
];

const DEFAULT_NAVIGATION_METADATA = {
  dashboard: { descriptionKey: "navigationHints.dashboard" },
  companies: { descriptionKey: "navigationHints.companies" },
  correspondences: { descriptionKey: "navigationHints.correspondences" },
  users: { descriptionKey: "navigationHints.users" },
  projects: { descriptionKey: "navigationHints.projects" },
  planning: { descriptionKey: "navigationHints.planning" },
  attendance: { descriptionKey: "navigationHints.attendance" },
  finance: { descriptionKey: "navigationHints.finance" },
  inventory: { descriptionKey: "navigationHints.inventory" },
  payroll: { descriptionKey: "navigationHints.payroll" },
  procurement: { descriptionKey: "navigationHints.procurement" },
  chat: { descriptionKey: "navigationHints.chat" },
  calls: { descriptionKey: "navigationHints.calls" },
  recruitment: { descriptionKey: "navigationHints.recruitment" },
  admin: { descriptionKey: "navigationHints.admin" },
};

const PROFILE_NAVIGATION_OVERRIDES = {
  company_admin: {
    users: {
      labelKey: "navigationProfiles.company_admin.usersLabel",
      descriptionKey: "navigationProfiles.company_admin.usersHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    projects: {
      labelKey: "navigationProfiles.company_admin.projectsLabel",
      descriptionKey: "navigationProfiles.company_admin.projectsHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "info",
    },
    correspondences: {
      labelKey: "navigationProfiles.company_admin.correspondencesLabel",
      descriptionKey: "navigationProfiles.company_admin.correspondencesHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "info",
    },
    finance: {
      labelKey: "navigationProfiles.company_admin.financeLabel",
      descriptionKey: "navigationProfiles.company_admin.financeHint",
      badgeKey: "navigationBadges.review",
      badgeVariant: "warning",
    },
    inventory: {
      labelKey: "navigationProfiles.company_admin.inventoryLabel",
      descriptionKey: "navigationProfiles.company_admin.inventoryHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "warning",
    },
    recruitment: {
      labelKey: "navigationProfiles.company_admin.recruitmentLabel",
      descriptionKey: "navigationProfiles.company_admin.recruitmentHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    procurement: {
      labelKey: "navigationProfiles.company_admin.procurementLabel",
      descriptionKey: "navigationProfiles.company_admin.procurementHint",
      badgeKey: "navigationBadges.review",
      badgeVariant: "info",
    },
    admin: {
      labelKey: "navigationProfiles.company_admin.adminLabel",
      descriptionKey: "navigationProfiles.company_admin.adminHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "info",
    },
  },
  acheteur: {
    procurement: {
      labelKey: "navigationProfiles.acheteur.procurementLabel",
      descriptionKey: "navigationProfiles.acheteur.procurementHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    inventory: {
      labelKey: "navigationProfiles.acheteur.inventoryLabel",
      descriptionKey: "navigationProfiles.acheteur.inventoryHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "warning",
    },
    projects: {
      labelKey: "navigationProfiles.acheteur.projectsLabel",
      descriptionKey: "navigationProfiles.acheteur.projectsHint",
    },
  },
  juriste: {
    companies: {
      labelKey: "navigationProfiles.juriste.companiesLabel",
      descriptionKey: "navigationProfiles.juriste.companiesHint",
      badgeKey: "navigationBadges.review",
      badgeVariant: "info",
    },
    procurement: {
      labelKey: "navigationProfiles.juriste.procurementLabel",
      descriptionKey: "navigationProfiles.juriste.procurementHint",
      badgeKey: "navigationBadges.review",
      badgeVariant: "info",
    },
    finance: {
      labelKey: "navigationProfiles.juriste.financeLabel",
      descriptionKey: "navigationProfiles.juriste.financeHint",
      badgeKey: "navigationBadges.readOnly",
      badgeVariant: "neutral",
    },
  },
  assistant_administratif: {
    companies: {
      labelKey: "navigationProfiles.assistant_administratif.companiesLabel",
      descriptionKey: "navigationProfiles.assistant_administratif.companiesHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "info",
    },
    correspondences: {
      labelKey: "navigationProfiles.assistant_administratif.correspondencesLabel",
      descriptionKey: "navigationProfiles.assistant_administratif.correspondencesHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    projects: {
      labelKey: "navigationProfiles.assistant_administratif.projectsLabel",
      descriptionKey: "navigationProfiles.assistant_administratif.projectsHint",
      badgeKey: "navigationBadges.readOnly",
      badgeVariant: "neutral",
    },
    payroll: {
      labelKey: "navigationProfiles.assistant_administratif.payrollLabel",
      descriptionKey: "navigationProfiles.assistant_administratif.payrollHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "warning",
    },
  },
  controleur_externe: {
    companies: {
      labelKey: "navigationProfiles.controleur_externe.companiesLabel",
      descriptionKey: "navigationProfiles.controleur_externe.companiesHint",
      badgeKey: "navigationBadges.audit",
      badgeVariant: "warning",
    },
    finance: {
      labelKey: "navigationProfiles.controleur_externe.financeLabel",
      descriptionKey: "navigationProfiles.controleur_externe.financeHint",
      badgeKey: "navigationBadges.audit",
      badgeVariant: "warning",
    },
    inventory: {
      labelKey: "navigationProfiles.controleur_externe.inventoryLabel",
      descriptionKey: "navigationProfiles.controleur_externe.inventoryHint",
      badgeKey: "navigationBadges.trace",
      badgeVariant: "info",
    },
    recruitment: {
      labelKey: "navigationProfiles.controleur_externe.recruitmentLabel",
      descriptionKey: "navigationProfiles.controleur_externe.recruitmentHint",
      badgeKey: "navigationBadges.readOnly",
      badgeVariant: "neutral",
    },
  },
  candidat_job_seeker: {
    recruitment: {
      labelKey: "navigationProfiles.candidat_job_seeker.recruitmentLabel",
      descriptionKey: "navigationProfiles.candidat_job_seeker.recruitmentHint",
      badgeKey: "navigationBadges.me",
      badgeVariant: "success",
    },
  },
  magasinier: {
    inventory: {
      labelKey: "navigationProfiles.magasinier.inventoryLabel",
      descriptionKey: "navigationProfiles.magasinier.inventoryHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "warning",
    },
    payroll: {
      labelKey: "navigationProfiles.magasinier.payrollLabel",
      descriptionKey: "navigationProfiles.magasinier.payrollHint",
      badgeKey: "navigationBadges.me",
      badgeVariant: "success",
    },
    chat: {
      labelKey: "navigationProfiles.magasinier.chatLabel",
      descriptionKey: "navigationProfiles.magasinier.chatHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    calls: {
      labelKey: "navigationProfiles.magasinier.callsLabel",
      descriptionKey: "navigationProfiles.magasinier.callsHint",
      badgeKey: "navigationBadges.followUp",
      badgeVariant: "info",
    },
  },
  comptable: {
    finance: {
      labelKey: "navigationProfiles.comptable.financeLabel",
      descriptionKey: "navigationProfiles.comptable.financeHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "success",
    },
    payroll: {
      labelKey: "navigationProfiles.comptable.payrollLabel",
      descriptionKey: "navigationProfiles.comptable.payrollHint",
      badgeKey: "navigationBadges.me",
      badgeVariant: "success",
    },
    inventory: {
      labelKey: "navigationProfiles.comptable.inventoryLabel",
      descriptionKey: "navigationProfiles.comptable.inventoryHint",
      badgeKey: "navigationBadges.readOnly",
      badgeVariant: "neutral",
    },
    chat: {
      labelKey: "navigationProfiles.comptable.chatLabel",
      descriptionKey: "navigationProfiles.comptable.chatHint",
      badgeKey: "navigationBadges.action",
      badgeVariant: "info",
    },
  },
};

function hasPermission(user, permission) {
  return user?.user_type === "super_admin" || user?.permissions?.includes(permission);
}

export function getVisibleAppNavigationItems(user) {
  return APP_NAV_ITEMS.filter((item) => {
    if (!canAccessWorkspaceEntry(user, item.id)) {
      return false;
    }

    if (item.moduleKey && !isBackendModuleEnabled(item.moduleKey)) {
      return false;
    }

    if (item.requiresSuperAdmin && user?.user_type !== "super_admin") {
      return false;
    }

    if (!item.permission) {
      return true;
    }

    return hasPermission(user, item.permission);
  });
}

export function getAppNavigationItemPresentation(user, item) {
  const workspaceProfile = getOperationalWorkspaceProfile(user);
  const defaultMeta = DEFAULT_NAVIGATION_METADATA[item.id] || {};
  const profileMeta = PROFILE_NAVIGATION_OVERRIDES[workspaceProfile.code]?.[item.id] || {};

  return {
    ...item,
    labelKey: profileMeta.labelKey || item.labelKey,
    descriptionKey: profileMeta.descriptionKey || defaultMeta.descriptionKey || null,
    badgeKey: profileMeta.badgeKey || null,
    badgeVariant: profileMeta.badgeVariant || "neutral",
  };
}

export function getAppNavigationSections(user) {
  const visibleItems = getVisibleAppNavigationItems(user);
  return getWorkspaceNavigationSections(user, visibleItems).map((section) => ({
    ...section,
    items: section.items.map((item) => getAppNavigationItemPresentation(user, item)),
  }));
}

export function getDashboardQuickEntries(user, limit = 3) {
  return getAppNavigationSections(user)
    .flatMap((section) => section.items)
    .filter((item) => item.id !== "dashboard")
    .slice(0, limit);
}

function flattenSectionItems(sections) {
  return (sections || []).flatMap((section) => section.items || []);
}

function matchesAppPath(item, pathname) {
  const currentPath = pathname || "/app";

  if (item.end) {
    return currentPath === item.to;
  }

  return currentPath === item.to || currentPath.startsWith(`${item.to}/`);
}

export function getPreferredAppEntry(user) {
  const visibleItems = getVisibleAppNavigationItems(user);

  if (user?.company_setup_pending) {
    const companySetupEntry = visibleItems.find((item) => item.id === "companies");
    if (companySetupEntry) {
      return getAppNavigationItemPresentation(user, companySetupEntry);
    }
  }

  const orderedItems = flattenSectionItems(getAppNavigationSections(user));
  return orderedItems.find((item) => item.id !== "dashboard") || orderedItems[0] || APP_NAV_ITEMS[0];
}

export function getPreferredAppRoute(user) {
  return getPreferredAppEntry(user)?.to || "/app";
}

export function resolvePostLoginRoute(user, fromLocation = null) {
  if (user?.company_setup_pending) {
    return getPreferredAppRoute(user);
  }

  const pathname = fromLocation?.pathname;
  const search = fromLocation?.search || "";

  if (pathname && pathname !== "/app") {
    return `${pathname}${search}`;
  }

  return getPreferredAppRoute(user);
}

export function getCurrentAppEntry(user, pathname) {
  const orderedItems = flattenSectionItems(getAppNavigationSections(user));
  return orderedItems.find((item) => matchesAppPath(item, pathname)) || getAppNavigationItemPresentation(user, APP_NAV_ITEMS[0]);
}
