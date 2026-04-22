import { useAuth } from "@/features/auth/AuthContext";
import { isComptableWorkspaceUser } from "@/features/comptable/permissions";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { isMagasinierWorkspaceUser } from "@/features/magasinier/permissions";

function mapInventorySectionToTab(section) {
  if (section === "movements") {
    return "operations";
  }

  if (section === "reports") {
    return "reports";
  }

  if (section === "stock") {
    return "catalog";
  }

  return null;
}

export function InventoryEntryPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("project_id") || "";

  const initialTab = useMemo(() => {
    const routedTab = mapInventorySectionToTab(searchParams.get("section"));
    if (routedTab) {
      return routedTab;
    }

    if (isMagasinierWorkspaceUser(user)) {
      return "operations";
    }

    if (isComptableWorkspaceUser(user)) {
      return "reports";
    }

    return "catalog";
  }, [searchParams, user]);

  return <InventoryPage initialTab={initialTab} initialProjectId={initialProjectId} />;
}
