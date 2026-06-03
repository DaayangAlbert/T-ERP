"use client";

import { PlanningOperationnel } from "@/components/operational/PlanningOperationnel";
import { useParams } from "next/navigation";
import { PageHelp } from "@/components/help/PageHelp";
import { CdtPlanningTutorial } from "@/components/help/tutorials/CdtPlanningTutorial";

export default function CdtPlanningPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PageHelp title="Aide — Planning CDT"><CdtPlanningTutorial /></PageHelp>
      </div>
      <PlanningOperationnel dailyPlanHref={`/${tenantSlug}/conducteur-travaux/plan`} />
    </div>
  );
}
