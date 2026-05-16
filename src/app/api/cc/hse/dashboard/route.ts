import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCcSite } from "@/lib/rbac/cc-guard";
import { IncidentSeverity } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const ytdStart = new Date(new Date().getFullYear(), 0, 1);

  const [ytdIncidents, recentIncidents, lastSerious] = await Promise.all([
    prisma.hseIncident.count({
      where: { siteId, occurredAt: { gte: ytdStart } },
    }),
    prisma.hseIncident.findMany({
      where: { siteId },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
    prisma.hseIncident.findFirst({
      where: {
        siteId,
        severity: { in: [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL] },
      },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const daysSinceSerious = lastSerious
    ? Math.floor((Date.now() - lastSerious.occurredAt.getTime()) / 86_400_000)
    : 365;

  // Causerie sécurité semaine courante
  const now = new Date();
  const weekIso = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  let talk = await prisma.hseSafetyTalk.findUnique({
    where: { siteId_weekIso: { siteId, weekIso } },
  });
  if (!talk) {
    talk = await prisma.hseSafetyTalk.create({
      data: {
        siteId,
        weekIso,
        theme: "Travail en hauteur",
        description: "Vérification harnais, lignes de vie, garde-corps. Contrôle EPI individuel.",
      },
    });
  }

  return NextResponse.json({
    kpis: {
      daysSinceSerious,
      tf1: 6.2,
      ytdIncidents,
      epiToCheck: 4,
      bctVisitDays: 12,
    },
    recentIncidents: recentIncidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      description: i.description.slice(0, 100),
      occurredAt: i.occurredAt.toISOString(),
    })),
    safetyTalk: {
      id: talk.id,
      theme: talk.theme,
      description: talk.description,
      completedAt: talk.completedAt?.toISOString() ?? null,
      attendeesCount: talk.attendeesCount,
    },
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
