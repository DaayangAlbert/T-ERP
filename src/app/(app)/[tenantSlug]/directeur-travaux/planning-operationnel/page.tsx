"use client";

import { PlanningOperationnel } from "@/components/operational/PlanningOperationnel";
import { useParams } from "next/navigation";

export default function DtravPlanningOperationnelPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  return <PlanningOperationnel dailyPlanHref={`/${tenantSlug}/conducteur-travaux/plan`} />;
}
