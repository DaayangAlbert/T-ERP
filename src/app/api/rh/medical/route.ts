import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, MedicalVisitType, FitnessVerdict } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const TYPE_LABEL: Record<MedicalVisitType, string> = {
  HIRING: "Embauche",
  PERIODIC: "Périodique",
  RETURN_TO_WORK: "Reprise",
  SPONTANEOUS: "Spontanée",
};

const VERDICT_LABEL: Record<FitnessVerdict, string> = {
  FIT: "Apte",
  FIT_WITH_RESTRICTIONS: "Apte avec restrictions",
  UNFIT: "Inapte",
  TEMPORARILY_UNFIT: "Inapte temporaire",
};

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "all"; // upcoming / overdue / fitness / all

  const all = await prisma.medicalVisit.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { scheduledAt: "asc" },
  });

  const now = Date.now();
  const enriched = all.map((v) => {
    const overdue = !v.completedAt && v.scheduledAt.getTime() < now;
    const daysToScheduled = Math.ceil((v.scheduledAt.getTime() - now) / 86_400_000);
    return {
      id: v.id,
      employeeKey: v.employeeKey,
      employeeName: v.employeeName,
      type: v.type,
      typeLabel: TYPE_LABEL[v.type],
      scheduledAt: v.scheduledAt.toISOString(),
      completedAt: v.completedAt?.toISOString() ?? null,
      fitnessVerdict: v.fitnessVerdict,
      verdictLabel: v.fitnessVerdict ? VERDICT_LABEL[v.fitnessVerdict] : null,
      restrictions: v.restrictions,
      doctor: v.doctor,
      overdue,
      daysToScheduled,
      status: overdue ? "OVERDUE" : v.completedAt ? "COMPLETED" : daysToScheduled <= 30 ? "SOON" : "PLANNED",
    };
  });

  const upcoming = enriched.filter((v) => v.status === "SOON" || v.status === "OVERDUE" || v.status === "PLANNED");
  const items = mode === "upcoming" ? upcoming
    : mode === "overdue" ? enriched.filter((v) => v.overdue)
    : enriched;

  const summary = {
    scheduledThisMonth: enriched.filter((v) => v.status === "SOON").length,
    overdue: enriched.filter((v) => v.overdue).length,
    fitWithoutRestrictions: enriched.filter((v) => v.fitnessVerdict === "FIT").length,
    fitWithRestrictions: enriched.filter((v) => v.fitnessVerdict === "FIT_WITH_RESTRICTIONS").length,
  };

  return NextResponse.json({ items, summary, mode });
}
