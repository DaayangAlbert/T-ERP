"use client";

import { PlanningOperationnel } from "@/components/operational/PlanningOperationnel";
import { useParams } from "next/navigation";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravPlanningOperationnelTutorial } from "@/components/help/tutorials/DtravPlanningOperationnelTutorial";

export default function DtravPlanningOperationnelPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PageHelp title="Aide — Planning op&eacute;rationnel"><DtravPlanningOperationnelTutorial /></PageHelp>
      </div>
      <PlanningOperationnel dailyPlanHref={`/${tenantSlug}/conducteur-travaux/plan`} />
    </div>
  );
}
