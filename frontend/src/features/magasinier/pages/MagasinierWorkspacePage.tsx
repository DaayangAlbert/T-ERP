import { Boxes, FileWarning, LayoutDashboard, Truck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { MobileMagasinierNav } from "@/features/magasinier/components/MobileMagasinierNav";
import { useMagasinierWorkspace } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { MagasinierDashboardPage } from "@/features/magasinier/pages/MagasinierDashboardPage";
import { ProjectStocksPage } from "@/features/magasinier/pages/ProjectStocksPage";
import { ReportsPage } from "@/features/magasinier/pages/ReportsPage";
import { StockMovementsPage } from "@/features/magasinier/pages/StockMovementsPage";

const sectionItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "stock", label: "Stocks projet", icon: Boxes },
  { id: "movements", label: "Mouvements", icon: Truck },
  { id: "reports", label: "Signalements", icon: FileWarning },
] as const;

export function MagasinierWorkspacePage() {
  const navigate = useNavigate();
  const workspace = useMagasinierWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("section") || "dashboard";

  const openSection = (nextSection: string) => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.set("section", nextSection);
      return nextParams;
    });
  };

  return (
    <div className="space-y-5">
      <MobileMagasinierNav
        items={sectionItems.map((item) => ({
          ...item,
          count:
            item.id === "reports"
              ? workspace.workspace.signalements.length
              : item.id === "movements"
                ? workspace.workspace.movements.length
                : undefined,
        }))}
        activeId={section}
        onChange={openSection}
      />

      {section === "dashboard" ? (
        <MagasinierDashboardPage
          workspace={workspace}
          onOpenSection={openSection as (section: "stock" | "movements" | "reports") => void}
          onOpenChat={() => navigate("/app/chat")}
        />
      ) : null}
      {section === "stock" ? <ProjectStocksPage workspace={workspace} /> : null}
      {section === "movements" ? <StockMovementsPage workspace={workspace} /> : null}
      {section === "reports" ? <ReportsPage workspace={workspace} /> : null}
    </div>
  );
}
