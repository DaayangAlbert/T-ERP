import { describe, expect, it } from "vitest";

import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";
import {
  APP_NAV_ITEMS,
  getAppNavigationItemPresentation,
  getAppNavigationSections,
  getDashboardQuickEntries,
  getPreferredAppRoute,
  getVisibleAppNavigationItems,
  resolvePostLoginRoute,
} from "@/shared/navigation/appNavigation";
import {
  canAccessWorkspaceEntry,
  getOperationalProfileCode,
  getOperationalWorkspaceProfile,
  getWorkspaceNavigationSections,
} from "@/shared/utils/operationalRoles";

const NAV_ITEMS = [
  { id: "dashboard", to: "/app" },
  { id: "companies", to: "/app/companies" },
  { id: "correspondences", to: "/app/correspondences" },
  { id: "users", to: "/app/users" },
  { id: "projects", to: "/app/projects" },
  { id: "planning", to: "/app/planning" },
  { id: "attendance", to: "/app/attendance" },
  { id: "finance", to: "/app/finance" },
  { id: "inventory", to: "/app/inventory" },
  { id: "procurement", to: "/app/procurement" },
  { id: "recruitment", to: "/app/recruitment" },
  { id: "payroll", to: "/app/payroll" },
  { id: "chat", to: "/app/chat" },
  { id: "calls", to: "/app/calls" },
];

describe("operational workspace helpers", () => {
  it("infers the executive workspace from a PCA role", () => {
    expect(
      getOperationalProfileCode({
        user_type: "employee",
        roles: [{ code: "pca", name: "PCA" }],
      })
    ).toBe("directeur_general");
  });

  it("keeps dedicated workspace profiles when they are explicitly assigned", () => {
    const workspaceProfile = getOperationalWorkspaceProfile({
      user_type: "employee",
      operational_profile_code: "acheteur",
      roles: [{ code: "acheteur", name: "Acheteur" }],
    });

    expect(workspaceProfile.code).toBe("acheteur");
    expect(workspaceProfile.sourceCode).toBe("acheteur");
    expect(workspaceProfile.priorityNavIds).toEqual(["dashboard", "procurement", "inventory", "projects"]);
  });

  it("keeps assistant administratif on a dedicated workspace profile", () => {
    const workspaceProfile = getOperationalWorkspaceProfile({
      user_type: "employee",
      operational_profile_code: "assistant_administratif",
      roles: [{ code: "assistant_administratif", name: "Assistant administratif" }],
    });

    expect(workspaceProfile.code).toBe("assistant_administratif");
    expect(workspaceProfile.sourceCode).toBe("assistant_administratif");
    expect(workspaceProfile.priorityNavIds).toEqual(["dashboard", "correspondences", "companies", "projects"]);
    expect(workspaceProfile.allowedAppIds).toEqual(["dashboard", "companies", "correspondences", "projects", "planning", "payroll", "chat", "calls"]);
  });

  it("builds audit-first navigation for an external controller workspace", () => {
    const sections = getWorkspaceNavigationSections(
      {
        user_type: "employee",
        operational_profile_code: "controleur_externe",
        roles: [{ code: "controleur_externe", name: "Controleur externe" }],
      },
      NAV_ITEMS.filter((item) => ["dashboard", "companies", "finance", "inventory", "projects", "procurement", "recruitment"].includes(item.id))
    );

    expect(sections.map((section) => section.key)).toEqual(["priority", "secondary"]);
    expect(sections[0].items.map((item) => item.id)).toEqual(["dashboard", "companies", "finance", "inventory"]);
    expect(sections[1].items.map((item) => item.id)).toEqual(["projects", "procurement", "recruitment"]);
  });

  it("decorates procurement navigation explicitly for a juriste workspace", () => {
    const presentation = getAppNavigationItemPresentation(
      {
        user_type: "employee",
        operational_profile_code: "juriste",
        roles: [{ code: "juriste", name: "Juriste" }],
        permissions: ["procurement.read"],
      },
      { id: "procurement", to: "/app/procurement", labelKey: "navigation.procurement" }
    );

    expect(presentation.labelKey).toBe("navigationProfiles.juriste.procurementLabel");
    expect(presentation.descriptionKey).toBe("navigationProfiles.juriste.procurementHint");
    expect(presentation.badgeKey).toBe("navigationBadges.review");
  });

  it("surfaces candidate quick entries without repeating the dashboard link", () => {
    const quickEntries = getDashboardQuickEntries(
      {
        user_type: "job_seeker",
        operational_profile_code: "candidat_job_seeker",
        roles: [{ code: "candidat_job_seeker", name: "Candidat" }],
        permissions: ["recruitment.read"],
      },
      3
    );

    expect(quickEntries.map((item) => item.id)).toEqual(["recruitment", "planning"]);
    expect(quickEntries[0].labelKey).toBe("navigationProfiles.candidat_job_seeker.recruitmentLabel");
  });

  it("computes the preferred destination for a company admin workspace", () => {
    const route = getPreferredAppRoute({
      user_type: "company_admin",
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      permissions: ["users.read", "projects.read", "finance.read"],
    });

    expect(route).toBe("/app/users");
  });

  it("routes a company admin in first-run setup to the company workspace first", () => {
    const route = getPreferredAppRoute({
      user_type: "company_admin",
      company_setup_pending: true,
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      permissions: ["companies.read", "users.read", "projects.read", "finance.read"],
    });

    expect(route).toBe("/app/companies");
  });

  it("keeps an explicit protected route target, but replaces /app with the priority module", () => {
    const user = {
      user_type: "company_admin",
      roles: [{ code: "company_admin", name: "Admin entreprise" }],
      permissions: ["users.read", "projects.read", "finance.read"],
    };

    expect(resolvePostLoginRoute(user, { pathname: "/app", search: "" })).toBe("/app/users");
    expect(resolvePostLoginRoute(user, { pathname: "/app/projects", search: "?tab=planning" })).toBe("/app/projects?tab=planning");
  });

  it("locks the magasinier workspace to inventory, personal payroll, and collaboration only", () => {
    const user = {
      user_type: "employee",
      operational_profile_code: "magasinier",
      roles: [{ code: "magasinier", name: "Magasinier" }],
      permissions: ["inventory.read", "projects.read", "payroll.read", "chat.read", "calls.read"],
    };

    const items = getVisibleAppNavigationItems(user);

    expect(items.map((item) => item.id)).toEqual(["dashboard", "planning", "inventory", "payroll", "chat", "calls"]);
    expect(canAccessWorkspaceEntry(user, "projects")).toBe(false);
    expect(canAccessWorkspaceEntry(user, "payroll")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "inventory")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "chat")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "calls")).toBe(true);
    expect(getPreferredAppRoute(user)).toBe("/app/inventory");
  });

  it("locks the comptable workspace to finance, payroll, stock read-only, planning, and chat only", () => {
    const user = {
      user_type: "employee",
      operational_profile_code: "comptable",
      roles: [{ code: "comptable", name: "Comptable" }],
      permissions: ["finance.read", "payroll.read", "inventory.read", "chat.read", "projects.read", "calls.read"],
    };

    const items = getVisibleAppNavigationItems(user);

    expect(items.map((item) => item.id)).toEqual(["dashboard", "planning", "finance", "inventory", "payroll", "chat"]);
    expect(canAccessWorkspaceEntry(user, "finance")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "inventory")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "payroll")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "chat")).toBe(true);
    expect(canAccessWorkspaceEntry(user, "attendance")).toBe(false);
    expect(canAccessWorkspaceEntry(user, "projects")).toBe(false);
    expect(canAccessWorkspaceEntry(user, "calls")).toBe(false);
    expect(getPreferredAppRoute(user)).toBe("/app/finance");
  });

  it("keeps attendance enabled as a real backend module and still excludes admin", () => {
    expect(isBackendModuleEnabled("companies")).toBe(true);
    expect(isBackendModuleEnabled("planning")).toBe(true);
    expect(isBackendModuleEnabled("attendance")).toBe(true);
    expect(isBackendModuleEnabled("admin")).toBe(false);
    expect(isBackendModuleEnabled("correspondences")).toBe(false);
  });

  it("anchors correspondences to the companies module instead of a standalone backend module", () => {
    const correspondencesItem = APP_NAV_ITEMS.find((item) => item.id === "correspondences");

    expect(correspondencesItem).toMatchObject({
      id: "correspondences",
      permission: "companies.read",
      moduleKey: "companies",
    });
    expect(APP_NAV_ITEMS.some((item) => item.id === "attendance")).toBe(true);
    expect(APP_NAV_ITEMS.some((item) => item.id === "admin")).toBe(false);

    const user = {
      user_type: "employee",
      operational_profile_code: "assistant_administratif",
      roles: [{ code: "assistant_administratif", name: "Assistant administratif" }],
      permissions: ["companies.read"],
    };

    const items = getVisibleAppNavigationItems(user);

    expect(items.map((item) => item.id)).toContain("correspondences");
  });

  it("surfaces attendance for RH users when the module and permission are both real", () => {
    const user = {
      user_type: "employee",
      operational_profile_code: "responsable_rh",
      roles: [{ code: "responsable_rh", name: "Responsable RH" }],
      permissions: ["users.read", "attendance.read", "payroll.read", "recruitment.read"],
    };

    const items = getVisibleAppNavigationItems(user);

    expect(items.map((item) => item.id)).toContain("attendance");
    expect(getPreferredAppRoute(user)).toBe("/app/users");
  });

  it("surfaces chat in the collaboration section for profiles that previously had no messaging entry", () => {
    const user = {
      user_type: "employee",
      operational_profile_code: "juriste",
      roles: [{ code: "juriste", name: "Juriste" }],
      permissions: ["companies.read", "projects.read", "finance.read", "procurement.read", "chat.read"],
    };

    const items = getVisibleAppNavigationItems(user);
    const sections = getAppNavigationSections(user);

    expect(items.map((item) => item.id)).toContain("chat");
    expect(sections.find((section) => section.key === "collaboration")?.items.map((item) => item.id)).toEqual(["chat"]);
  });
});
