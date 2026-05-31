import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { periodOf, isPeriodLocked } from "@/lib/comptable/periods";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

interface TemplateLine {
  accountCode: string;
  description?: string | null;
  debit?: number;
  credit?: number;
  thirdPartyId?: string | null;
  siteId?: string | null;
}

/**
 * Génère l'écriture du mois courant pour un modèle récurrent.
 * Anti-doublon : refus si déjà exécuté pour la période en cours.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tpl = await prisma.recurringEntry.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!tpl) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  if (!tpl.active) return NextResponse.json({ error: "Modèle inactif" }, { status: 409 });

  const today = new Date();
  const period = periodOf(today);

  if (tpl.lastRunPeriod === period) {
    return NextResponse.json({ error: `Déjà généré pour ${period}.` }, { status: 409 });
  }
  if (await isPeriodLocked(session.tenantId, period)) {
    return NextResponse.json({ error: `Période ${period} clôturée — génération impossible.` }, { status: 409 });
  }

  const lines = (Array.isArray(tpl.lines) ? tpl.lines : []) as unknown as TemplateLine[];
  if (lines.length < 2) return NextResponse.json({ error: "Modèle invalide (lignes manquantes)" }, { status: 400 });

  // Équilibre.
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (totalDebit !== totalCredit || totalDebit === 0) {
    return NextResponse.json({ error: "Modèle déséquilibré (D ≠ C)" }, { status: 400 });
  }

  // Référence unique par modèle et période.
  const reference = `REC-${tpl.id.slice(-6)}-${period}`;

  // Vérifie l'unicité (au cas où, on évite la collision unique sur [tenant,journal,ref]).
  const existing = await prisma.entry.findFirst({
    where: { tenantId: session.tenantId, journalCode: tpl.journalCode, reference },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Écriture déjà présente." }, { status: 409 });

  const [created] = await prisma.$transaction([
    prisma.entry.create({
      data: {
        tenantId: session.tenantId,
        siteId: null,
        journalCode: tpl.journalCode,
        entryDate: today,
        reference,
        description: tpl.description,
        status: CptEntryStatus.VALIDATED,
        createdById: session.sub,
        validatedById: session.sub,
        validatedAt: today,
        lines: {
          create: lines.map((l) => ({
            accountCode: l.accountCode,
            thirdPartyId: l.thirdPartyId ?? null,
            description: l.description ?? tpl.description,
            debit: BigInt(Math.round(l.debit ?? 0)),
            credit: BigInt(Math.round(l.credit ?? 0)),
            siteId: l.siteId ?? null,
          })),
        },
      },
    }),
    prisma.recurringEntry.update({
      where: { id: tpl.id },
      data: { lastRunAt: today, lastRunPeriod: period },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "cpt.recurring.run",
      entityType: "Entry",
      entityId: created.id,
      metadata: { template: tpl.id, period, reference },
    },
  });

  return NextResponse.json({ id: created.id, reference, period });
}
