import { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import i18n from "@/app/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from "@/features/auth/RouteGuards";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { DashboardEntryPage } from "@/features/dashboard/DashboardEntryPage";
import { LandingPage } from "@/features/landing/LandingPage";
import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";

const CompaniesPage = lazy(() => import("@/features/companies/CompaniesPage").then((m) => ({ default: m.CompaniesPage })));
const CorrespondencesPage = lazy(() =>
  import("@/features/correspondences/CorrespondencesPage").then((m) => ({ default: m.CorrespondencesPage }))
);
const UsersPage = lazy(() => import("@/features/users/UsersPage.jsx").then((m) => ({ default: m.UsersPage })));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectWorkspaceLayout = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceLayout }))
);
const ProjectWorkspaceOverviewPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceOverviewPage }))
);
const ProjectWorkspaceTeamPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceTeamPage }))
);
const ProjectWorkspacePlanningPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspacePlanningPage }))
);
const ProjectWorkspaceRisksPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceRisksPage }))
);
const ProjectWorkspaceFinancePage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceFinancePage }))
);
const ProjectWorkspaceStockPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceStockPage }))
);
const ProjectWorkspaceDocumentsPage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspaceDocumentsPage }))
);
const ProjectWorkspacePresencePage = lazy(() =>
  import("@/features/projects/ProjectWorkspacePages").then((m) => ({ default: m.ProjectWorkspacePresencePage }))
);
const PlanningPage = lazy(() => import("@/features/planning/PlanningPage").then((m) => ({ default: m.PlanningPage })));
const AttendancePage = lazy(() => import("@/features/attendance/AttendancePage").then((m) => ({ default: m.AttendancePage })));
const FinancePage = lazy(() => import("@/features/finance/FinanceEntryPage").then((m) => ({ default: m.FinanceEntryPage })));
const InventoryPage = lazy(() => import("@/features/inventory/InventoryEntryPage").then((m) => ({ default: m.InventoryEntryPage })));
const PayrollPage = lazy(() => import("@/features/payroll/PayrollEntryPage").then((m) => ({ default: m.PayrollEntryPage })));
const ProcurementPage = lazy(() => import("@/features/procurement/ProcurementPage").then((m) => ({ default: m.ProcurementPage })));
const ChatPage = lazy(() => import("@/features/chat/ChatEntryPage").then((m) => ({ default: m.ChatEntryPage })));
const CallsPage = lazy(() => import("@/features/calls/CallsEntryPage").then((m) => ({ default: m.CallsEntryPage })));
const RecruitmentPage = lazy(() => import("@/features/recruitment/RecruitmentPage").then((m) => ({ default: m.RecruitmentPage })));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const CompanyAdminWorkspacePage = lazy(() =>
  import("@/features/admin/CompanyAdminWorkspacePage").then((m) => ({ default: m.CompanyAdminWorkspacePage }))
);

function withSuspense(element) {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
          {i18n.t("common.loading")}
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

function withPermission(permission, appEntryId, element) {
  return (
    <PermissionRoute permission={permission} appEntryId={appEntryId}>
      {element}
    </PermissionRoute>
  );
}

const appChildRoutes = [
  { index: true, element: <DashboardEntryPage /> },
  { path: "profile", element: withSuspense(<ProfilePage />) },
  ...(isBackendModuleEnabled("companies")
    ? [{ path: "companies", element: withPermission("companies.read", "companies", withSuspense(<CompaniesPage />)) }]
    : []),
  ...(isBackendModuleEnabled("companies")
    ? [{ path: "correspondences", element: withPermission("companies.read", "correspondences", withSuspense(<CorrespondencesPage />)) }]
    : []),
  ...(isBackendModuleEnabled("users")
    ? [{ path: "users", element: withPermission("users.read", "users", withSuspense(<UsersPage />)) }]
    : []),
  ...(isBackendModuleEnabled("projects")
    ? [
        { path: "projects", element: withPermission("projects.read", "projects", withSuspense(<ProjectsPage />)) },
        {
          path: "projects/:projectId",
          element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceLayout />)),
          children: [
            { index: true, element: <Navigate to="overview" replace /> },
            { path: "overview", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceOverviewPage />)) },
            { path: "team", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceTeamPage />)) },
            { path: "planning", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspacePlanningPage />)) },
            { path: "reports", element: <Navigate to="../risks" replace /> },
            { path: "risks", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceRisksPage />)) },
            { path: "finance", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceFinancePage />)) },
            { path: "stock", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceStockPage />)) },
            { path: "documents", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspaceDocumentsPage />)) },
            { path: "presence", element: withPermission("projects.read", "projects", withSuspense(<ProjectWorkspacePresencePage />)) },
          ],
        },
      ]
    : []),
  ...(isBackendModuleEnabled("planning")
    ? [{ path: "planning", element: withSuspense(<PlanningPage />) }]
    : []),
  ...(isBackendModuleEnabled("attendance")
    ? [{ path: "attendance", element: withPermission("attendance.read", "attendance", withSuspense(<AttendancePage />)) }]
    : []),
  ...(isBackendModuleEnabled("finance")
    ? [{ path: "finance", element: withPermission("finance.read", "finance", withSuspense(<FinancePage />)) }]
    : []),
  ...(isBackendModuleEnabled("inventory")
    ? [{ path: "inventory", element: withPermission("inventory.read", "inventory", withSuspense(<InventoryPage />)) }]
    : []),
  ...(isBackendModuleEnabled("payroll")
    ? [{ path: "payroll", element: withPermission("payroll.read", "payroll", withSuspense(<PayrollPage />)) }]
    : []),
  ...(isBackendModuleEnabled("procurement")
    ? [{ path: "procurement", element: withPermission("procurement.read", "procurement", withSuspense(<ProcurementPage />)) }]
    : []),
  ...(isBackendModuleEnabled("chat")
    ? [{ path: "chat", element: withPermission("chat.read", "chat", withSuspense(<ChatPage />)) }]
    : []),
  ...(isBackendModuleEnabled("calls")
    ? [{ path: "calls", element: withPermission("calls.read", "calls", withSuspense(<CallsPage />)) }]
    : []),
  ...(isBackendModuleEnabled("recruitment")
    ? [{ path: "recruitment", element: withPermission("recruitment.read", "recruitment", withSuspense(<RecruitmentPage />)) }]
    : []),
  ...(isBackendModuleEnabled("companies")
    ? [{ path: "admin", element: withPermission("companies.read", "admin", withSuspense(<CompanyAdminWorkspacePage />)) }]
    : []),
  { path: "*", element: <Navigate to="/app" replace /> },
];

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppShell />,
        children: appChildRoutes,
      },
    ],
  },
]);
