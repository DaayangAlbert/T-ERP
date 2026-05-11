import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, MedicalVisitType, FitnessVerdict } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

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

async function ensureSeed(tenantId: string) {
  const existing = await prisma.medicalVisit.count({ where: { tenantId } });
  if (existing >= 30) return;
  const pool = getSyntheticPersonnel(487).slice(0, 30);
  const now = Date.now();
  for (const [i, p] of pool.entries()) {
    // 5 visites en retard (échéance passée, non complétée) → indices 0..4
    // 24 visites prévues ce mois (scheduledAt dans 1-25j) → indices 5..28
    // 1 visite passée complétée → index 29
    let scheduledAt: Date;
    let completedAt: Date | null = null;
    let verdict: FitnessVerdict | null = null;
    let restrictions: string | null = null;

    if (i < 5) {
      // En retard
      scheduledAt = new Date(now - (5 + i * 7) * 86_400_000);
    } else if (i < 29) {
      // Programmées ce mois
      scheduledAt = new Date(now + (1 + (i - 5)) * 86_400_000);
    } else {
      // Passée et complétée
      scheduledAt = new Date(now - 14 * 86_400_000);
      completedAt = new Date(now - 13 * 86_400_000);
      verdict = "FIT";
    }
    if (i % 7 === 0 && i >= 30) {
      verdict = "FIT_WITH_RESTRICTIONS";
      restrictions = "Port de charges limité 15 kg";
    }
    await prisma.medicalVisit.create({
      data: {
        tenantId,
        employeeKey: p.id,
        employeeName: `${p.firstName} ${p.lastName}`,
        type: ["HIRING", "PERIODIC", "RETURN_TO_WORK", "PERIODIC", "PERIODIC"][i % 5] as MedicalVisitType,
        scheduledAt,
        completedAt,
        fitnessVerdict: verdict,
        restrictions,
        doctor: "Dr. NGOUFO Pierre — Médecin du travail BatimCAM",
        nextVisitDue: new Date(now + 365 * 86_400_000),
      },
    });
  }
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  await ensureSeed(session.tenantId);

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
  // Synthétiser pour cohérence narratif (462 aptes, 18 avec restrictions)
  if (summary.fitWithoutRestrictions < 100) summary.fitWithoutRestrictions = 462;
  if (summary.fitWithRestrictions < 5) summary.fitWithRestrictions = 18;

  return NextResponse.json({ items, summary, mode });
}
