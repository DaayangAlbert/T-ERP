import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ValidationStatus, ValidationType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const TYPE_LABELS: Record<ValidationType, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
};

interface WorkflowStep {
  key?: string;
  role?: string;
  status?: string;
  decidedAt?: string;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  // 90 jours d'historique pour calculer délais et taux
  const since = new Date(Date.now() - 90 * 86_400_000);
  const validations = await prisma.validation.findMany({
    where: { tenantId: session.tenantId, createdAt: { gte: since } },
    include: { currentApprover: { select: { firstName: true, lastName: true } } },
    take: 500,
  });

  // Délai moyen par étape (en heures)
  const stepDelays: Record<string, number[]> = { RH: [], DAF: [], DG: [] };
  for (const v of validations) {
    const steps = ((v.workflow as { steps?: WorkflowStep[] })?.steps ?? []) as WorkflowStep[];
    let prevTime = v.createdAt.getTime();
    for (const s of steps) {
      const role = s.role ?? s.key ?? "OTHER";
      if (s.status === "APPROVED" && s.decidedAt) {
        const t = new Date(s.decidedAt).getTime();
        const hours = (t - prevTime) / 3_600_000;
        if (hours >= 0 && hours < 24 * 30) {
          if (!stepDelays[role]) stepDelays[role] = [];
          stepDelays[role].push(hours);
        }
        prevTime = t;
      }
    }
  }
  const avgByStep = Object.entries(stepDelays).map(([step, vals]) => ({
    step,
    averageHours: vals.length === 0 ? 0 : vals.reduce((s, x) => s + x, 0) / vals.length,
    count: vals.length,
  }));

  // Délai moyen par type (création -> décision)
  const byType = Object.values(ValidationType).map((t) => {
    const subset = validations.filter(
      (v) => v.type === t && v.status === ValidationStatus.APPROVED && v.decisionAt
    );
    const avgHours =
      subset.length === 0
        ? 0
        : subset.reduce((s, v) => s + ((v.decisionAt!.getTime() - v.createdAt.getTime()) / 3_600_000), 0) / subset.length;
    return { type: t, label: TYPE_LABELS[t], averageHours: avgHours, count: subset.length };
  });

  // Top validateurs lents (par moyenne d'ancienneté en attente)
  const pendingValidators: Record<string, { name: string; ageDays: number[] }> = {};
  for (const v of validations.filter((v) => v.status === ValidationStatus.PENDING && v.currentApprover)) {
    const key = v.currentApproverId!;
    const name = `${v.currentApprover!.firstName} ${v.currentApprover!.lastName}`;
    const ageDays = Math.floor((Date.now() - v.createdAt.getTime()) / 86_400_000);
    if (!pendingValidators[key]) pendingValidators[key] = { name, ageDays: [] };
    pendingValidators[key].ageDays.push(ageDays);
  }
  const topSlowValidators = Object.entries(pendingValidators)
    .map(([id, x]) => ({
      userId: id,
      name: x.name,
      averageAgeDays: x.ageDays.reduce((s, n) => s + n, 0) / x.ageDays.length,
      pendingCount: x.ageDays.length,
    }))
    .sort((a, b) => b.averageAgeDays - a.averageAgeDays)
    .slice(0, 8);

  // Taux de rejet par étape
  const rejectionByStep = ["RH", "DAF", "DG"].map((step) => {
    const total = validations.filter((v) => {
      const steps = ((v.workflow as { steps?: WorkflowStep[] })?.steps ?? []) as WorkflowStep[];
      return steps.some((s) => (s.role ?? s.key) === step);
    }).length;
    const rejected = validations.filter(
      (v) => v.status === ValidationStatus.REJECTED && v.currentStep === step
    ).length;
    return { step, total, rejected, percent: total === 0 ? 0 : (rejected / total) * 100 };
  });

  // Heatmap horaire (heures de création des validations)
  const heatmap = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const v of validations) {
    heatmap[v.createdAt.getHours()].count += 1;
  }

  return NextResponse.json({
    avgByStep,
    byType,
    topSlowValidators,
    rejectionByStep,
    heatmap,
    period: { sinceDays: 90, total: validations.length },
  });
}
