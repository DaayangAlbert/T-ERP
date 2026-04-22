import { useNavigate } from "react-router-dom";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AssistantAdminDashboardPage } from "@/features/dashboard/AssistantAdminDashboardPage";
import { WorkerDashboardPage } from "@/features/dashboard/WorkerDashboardPage";
import { useAuth } from "@/features/auth/AuthContext";
import { isComptableWorkspaceUser } from "@/features/comptable/permissions";
import { ComptableDashboardPage } from "@/features/comptable/pages/ComptableDashboardPage";
import { isMagasinierWorkspaceUser } from "@/features/magasinier/permissions";
import { useMagasinierWorkspace } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { MagasinierDashboardPage } from "@/features/magasinier/pages/MagasinierDashboardPage";
import { getUserRoleCodes, hasAnyRole } from "@/shared/utils/operationalRoles";

function MagasinierDashboardContainer() {
  const navigate = useNavigate();
  const magasinierWorkspace = useMagasinierWorkspace();

  return (
    <MagasinierDashboardPage
      workspace={magasinierWorkspace}
      onOpenSection={(section) => navigate(`/app/inventory?section=${section}`)}
      onOpenChat={() => navigate("/app/chat")}
    />
  );
}

export function DashboardEntryPage() {
  const { user } = useAuth();
  const roleCodes = getUserRoleCodes(user);

  if (hasAnyRole(user, ["ouvrier", "collaborateur_terrain"])) {
    return <WorkerDashboardPage />;
  }

  if (roleCodes.includes("assistant_administratif")) {
    return <AssistantAdminDashboardPage />;
  }

  if (isComptableWorkspaceUser(user)) {
    return <ComptableDashboardPage />;
  }

  if (isMagasinierWorkspaceUser(user)) {
    return <MagasinierDashboardContainer />;
  }

  return <DashboardPage />;
}
