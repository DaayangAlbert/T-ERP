import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const PHASE_LABEL: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: "À venir", tone: "neutral" },
  IN_PROGRESS: { label: "En cours", tone: "ok" },
  COMPLETED: { label: "Terminée", tone: "neutral" },
  DELAYED: { label: "En retard", tone: "bad" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { in: ["ACTIVE", "AT_RISK", "DRIFTING", "PLANNED"] } },
    select: {
      code: true, name: true,
      planning: { select: { phases: { orderBy: { orderIndex: "asc" }, select: { name: true, plannedStart: true, plannedEnd: true, progressPercent: true, status: true } } } },
    },
    orderBy: { code: "asc" },
  });

  let totalPhases = 0;
  let enRetard = 0;
  const items = sites
    .filter((s) => s.planning && s.planning.phases.length > 0)
    .map((s) => {
      const phases = s.planning!.phases.map((p) => {
        const isLate = p.status === "DELAYED" || (p.status !== "COMPLETED" && p.status !== "CANCELLED" && p.plannedEnd < now);
        totalPhases++;
        if (isLate) enRetard++;
        const meta = PHASE_LABEL[p.status] ?? { label: p.status, tone: "neutral" };
        return {
          nom: p.name,
          debut: p.plannedStart.toISOString(),
          fin: p.plannedEnd.toISOString(),
          progress: Math.round(p.progressPercent),
          statut: isLate && p.status !== "DELAYED" ? "En retard" : meta.label,
          tone: isLate ? "bad" : meta.tone,
        };
      });
      const avg = phases.length ? Math.round(phases.reduce((a, p) => a + p.progress, 0) / phases.length) : 0;
      return { code: s.code, name: s.name, avancement: avg, phases };
    });

  return NextResponse.json({
    resume: { chantiers: items.length, phases: totalPhases, enRetard },
    items,
  });
}
