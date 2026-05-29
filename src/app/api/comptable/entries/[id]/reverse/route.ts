import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { periodOf, isPeriodLocked } from "@/lib/comptable/periods";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/**
 * Contrepassation (extourne façon Sage) : génère une écriture inverse d'une
 * écriture VALIDÉE, sans la supprimer (piste d'audit intacte). La
 * contrepassation est datée du jour (période ouverte) et validée.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const allowed = await getAccessibleSiteIds(session.sub);
  const entry = await prisma.entry.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { lines: true },
  });
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!isSiteAllowed(allowed, entry.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }
  if (entry.status !== CptEntryStatus.VALIDATED) {
    return NextResponse.json({ error: "Seule une écriture validée peut être contrepassée" }, { status: 409 });
  }

  const reverseRef = `EXT-${entry.reference}`;
  const already = await prisma.entry.findFirst({
    where: { tenantId: session.tenantId, journalCode: entry.journalCode, reference: reverseRef },
    select: { id: true },
  });
  if (already) return NextResponse.json({ error: "Cette écriture a déjà été contrepassée." }, { status: 409 });

  // La contrepassation est passée sur la période du jour (doit être ouverte).
  const today = new Date();
  const period = periodOf(today);
  if (await isPeriodLocked(session.tenantId, period)) {
    return NextResponse.json({ error: `Période ${period} clôturée — contrepassation impossible.` }, { status: 409 });
  }

  const created = await prisma.entry.create({
    data: {
      tenantId: session.tenantId,
      siteId: entry.siteId,
      journalCode: entry.journalCode,
      entryDate: today,
      reference: reverseRef,
      description: `Contrepassation de ${entry.reference} — ${entry.description}`,
      status: CptEntryStatus.VALIDATED,
      createdById: session.sub,
      validatedById: session.sub,
      validatedAt: today,
      lines: {
        create: entry.lines.map((l) => ({
          accountCode: l.accountCode,
          thirdPartyId: l.thirdPartyId,
          description: `Extourne — ${l.description}`,
          debit: l.credit, // inversion débit/crédit
          credit: l.debit,
          siteId: l.siteId,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "entry.reverse",
      entityType: "Entry",
      entityId: created.id,
      metadata: { original: entry.reference, reverseRef, journal: entry.journalCode },
    },
  });

  return NextResponse.json({ id: created.id, reference: reverseRef });
}
