import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, DisciplinarySeverity, DisciplinaryStage, DisciplinarySanction } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const SEVERITY_LABEL: Record<DisciplinarySeverity, string> = {
  MINOR: "Mineure",
  MAJOR: "Majeure",
  CRITICAL: "Faute lourde",
};

const STAGE_LABEL: Record<DisciplinaryStage, string> = {
  OPENED: "Ouverte",
  PRELIMINARY_INTERVIEW: "Entretien préalable",
  SANCTION_DECIDED: "Sanction décidée",
  APPEALED: "Recours en cours",
  CLOSED: "Clôturée",
};

const SANCTION_LABEL: Record<DisciplinarySanction, string> = {
  WARNING: "Avertissement",
  REPRIMAND: "Blâme",
  SUSPENSION_3D: "Mise à pied 3 jours",
  SUSPENSION_8D: "Mise à pied 8 jours",
  DISMISSAL_FAULT: "Licenciement pour faute",
  GROSS_MISCONDUCT_DISMISSAL: "Licenciement pour faute lourde",
};

async function ensureSeed(tenantId: string, createdBy: string) {
  const existing = await prisma.disciplinaryCase.count({ where: { tenantId } });
  if (existing >= 11) return;

  // Auto-seed sur les vrais WORKERS du tenant — les cas disciplinaires
  // concernent typiquement les ouvriers de terrain.
  const pool = await prisma.user.findMany({
    where: { tenantId, status: "ACTIVE", role: "WORKER" },
    select: { id: true, firstName: true, lastName: true },
    take: 11,
  });
  if (pool.length === 0) return;
  const seedData = [
    { severity: "MINOR" as const, stage: "PRELIMINARY_INTERVIEW" as const, sanction: null, daysAgo: 4, reason: "Retards répétés (3 fois en 1 mois)", facts: "M. ABEGA s'est présenté en retard à 3 reprises entre le 1er et le 30 avril, sans justificatif accepté." },
    { severity: "MAJOR" as const, stage: "SANCTION_DECIDED" as const, sanction: "SUSPENSION_3D" as const, daysAgo: 10, reason: "Absence non justifiée 2 jours consécutifs", facts: "Absence non signalée les 22 et 23 avril 2026 sur chantier Pont Mfoundi." },
    { severity: "MAJOR" as const, stage: "OPENED" as const, sanction: null, daysAgo: 1, reason: "Refus consigne sécurité (port harnais)", facts: "Refus de port du harnais sur travail en hauteur le 9 mai 2026 malgré rappel chef de chantier." },
    // Historique 12m
    { severity: "MINOR" as const, stage: "CLOSED" as const, sanction: "WARNING" as const, daysAgo: 45, reason: "Retards répétés", facts: "Mise en demeure avec engagement de ponctualité." },
    { severity: "MAJOR" as const, stage: "CLOSED" as const, sanction: "SUSPENSION_3D" as const, daysAgo: 92, reason: "Insulte hiérarchie", facts: "Échange verbal avec chef d'équipe ayant donné lieu à témoignages." },
    { severity: "MINOR" as const, stage: "CLOSED" as const, sanction: "WARNING" as const, daysAgo: 130, reason: "Non-respect EPI", facts: "Casque non porté lors d'inspection HSE." },
    { severity: "CRITICAL" as const, stage: "CLOSED" as const, sanction: "DISMISSAL_FAULT" as const, daysAgo: 180, reason: "Vol matériel chantier", facts: "Vol de 4 sacs ciment constaté en sortie de site. Plainte déposée." },
    { severity: "MINOR" as const, stage: "CLOSED" as const, sanction: "WARNING" as const, daysAgo: 215, reason: "Retard", facts: "Avertissement écrit." },
    { severity: "MAJOR" as const, stage: "CLOSED" as const, sanction: "REPRIMAND" as const, daysAgo: 240, reason: "Comportement inapproprié", facts: "Comportement signalé par superviseur." },
    // Conseil de discipline en cours
    { severity: "CRITICAL" as const, stage: "PRELIMINARY_INTERVIEW" as const, sanction: null, daysAgo: 7, reason: "Falsification feuille pointage", facts: "Pointage frauduleux découvert lors audit RH. Entretien préalable programmé 13 mai." },
    // Départ négocié en cours
    { severity: "MAJOR" as const, stage: "APPEALED" as const, sanction: "DISMISSAL_FAULT" as const, daysAgo: 18, reason: "Insubordination répétée — départ négocié envisagé", facts: "Multiples refus consignes, négociation départ amiable en cours avec délégué du personnel." },
  ];

  for (const [i, s] of seedData.entries()) {
    const p = pool[i % pool.length];
    await prisma.disciplinaryCase.create({
      data: {
        tenantId,
        employeeKey: p.id,
        employeeName: `${p.firstName} ${p.lastName}`,
        reason: s.reason,
        severity: s.severity,
        stage: s.stage,
        sanction: s.sanction,
        facts: s.facts,
        documents: [],
        createdBy,
        openedAt: new Date(Date.now() - s.daysAgo * 86_400_000),
        resolvedAt: s.stage === "CLOSED" ? new Date(Date.now() - (s.daysAgo - 5) * 86_400_000) : null,
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

  await ensureSeed(session.tenantId, session.sub);

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "active"; // active | history | negotiated

  const all = await prisma.disciplinaryCase.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { openedAt: "desc" },
  });

  const enriched = all.map((d) => ({
    id: d.id,
    employeeKey: d.employeeKey,
    employeeName: d.employeeName,
    reason: d.reason,
    severity: d.severity,
    severityLabel: SEVERITY_LABEL[d.severity],
    stage: d.stage,
    stageLabel: STAGE_LABEL[d.stage],
    sanction: d.sanction,
    sanctionLabel: d.sanction ? SANCTION_LABEL[d.sanction] : null,
    openedAt: d.openedAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    facts: d.facts,
    notes: d.notes,
  }));

  let items = enriched;
  if (mode === "active") items = enriched.filter((d) => d.stage !== "CLOSED");
  else if (mode === "history") items = enriched.filter((d) => d.stage === "CLOSED");
  else if (mode === "negotiated") items = enriched.filter((d) => d.stage === "APPEALED");

  const summary = {
    activeCases: enriched.filter((d) => d.stage !== "CLOSED").length,
    warningsLast12m: enriched.filter((d) => d.sanction === "WARNING").length,
    disciplinaryCouncils: enriched.filter((d) => d.severity === "CRITICAL" && d.stage !== "CLOSED").length,
    negotiatedDepartures: enriched.filter((d) => d.stage === "APPEALED").length,
  };

  return NextResponse.json({ items, summary, mode });
}
