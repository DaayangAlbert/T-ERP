import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth/AuthContext";
import { getPreferredAppRoute } from "@/shared/navigation/appNavigation";
import { canAccessWorkspaceEntry } from "@/shared/utils/operationalRoles";

function FullScreenMessage({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {message}
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <FullScreenMessage message={t("common.loading")} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, noticeKey: "login.loginRequired" }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { t } = useTranslation();
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <FullScreenMessage message={t("common.loading")} />;
  }

  if (isAuthenticated) {
    return <Navigate to={getPreferredAppRoute(user)} replace />;
  }

  return <Outlet />;
}

export function PermissionRoute({ permission, appEntryId, children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return <FullScreenMessage message={t("common.loading")} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, noticeKey: "login.loginRequired" }} />;
  }

  if (!permission) {
    return children;
  }

  const hasPermission = user?.user_type === "super_admin" || user?.permissions?.includes(permission);
  if (!hasPermission) {
    return <Navigate to={getPreferredAppRoute(user)} replace />;
  }

  if (!canAccessWorkspaceEntry(user, appEntryId)) {
    return <Navigate to={getPreferredAppRoute(user)} replace />;
  }

  return children;
}
