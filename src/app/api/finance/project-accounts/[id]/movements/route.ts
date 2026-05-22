import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { projectMovementSchema } from "@/schemas/finance";
import { directionForType, signedDelta } from "@/lib/cpt/analytical";
import {
  Role,
  CptDirection,
  MovementDirection,
  ProjectAccountEntryType,
  type Prisma,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

/**
 * Enregistre un mouvement manuel sur un compte projet.
 * - REPAYMENT (remboursement banque) : réservé DAF/DG, crédite la banque.
 * - autres types : DAF/DG, ou comptable affecté au chantier.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = projectMovementSchema.parse(await req.json());
    const type = data.type as ProjectAccountEntryType;
    const amount = BigInt(data.amount);
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const account = await prisma.projectAccount.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
      include: { site: { select: { code: true } } },
    });
    if (!account) return NextResponse.json({ error: "Compte projet introuvable" }, { status: 404 });
    if (!account.isActive) return NextResponse.json({ error: "Compte projet clôturé" }, { status: 400 });

    const isManager = MANAGE_ROLES.includes(session.role as Role);

    // Le remboursement touche la banque → réservé direction financière.
    if (type === ProjectAccountEntryType.REPAYMENT && !isManager) {
      return NextResponse.json({ error: "Remboursement réservé DAF / DG" }, { status: 403 });
    }
    // Comptable : autorisé seulement sur ses chantiers.
    if (!isManager) {
      if (session.role !== Role.ACCOUNTANT) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
      const allowed = await getAccessibleSiteIds(session.sub);
      if (!isSiteAllowed(allowed, account.siteId)) {
        return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
      }
    }

    const direction = directionForType(
      type,
      data.direction === "CREDIT" ? CptDirection.CREDIT : data.direction === "DEBIT" ? CptDirection.DEBIT : undefined,
    );
    if (type === ProjectAccountEntryType.ADJUSTMENT && !data.direction) {
      return NextResponse.json({ error: "Sens requis pour une régularisation" }, { status: 400 });
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    const newBalance = account.balance + signedDelta(direction, amount);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.projectAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          movements: {
            create: {
              type,
              direction,
              amount,
              reason: data.reason,
              reference: data.reference ?? null,
              balanceAfter: newBalance,
              occurredAt,
              recordedById: session.sub,
            },
          },
        },
      }),
    ];

    // Remboursement : la banque est créditée en retour.
    if (type === ProjectAccountEntryType.REPAYMENT) {
      const bankId = data.bankAccountId ?? account.bankAccountId;
      if (!bankId) {
        return NextResponse.json({ error: "Compte bancaire requis pour le remboursement" }, { status: 400 });
      }
      const bank = await prisma.bankAccount.findFirst({
        where: { id: bankId, tenantId: { in: scopeIds }, isActive: true },
        select: { id: true },
      });
      if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
      ops.push(
        prisma.bankAccount.update({
          where: { id: bank.id },
          data: {
            balance: { increment: amount },
            movements: {
              create: {
                direction: MovementDirection.INBOUND,
                amount,
                label: data.reason,
                reference: data.reference ?? null,
                counterparty: `Compte projet ${account.site.code}`,
                siteId: account.siteId,
                occurredAt,
              },
            },
          },
        }),
      );
    }

    ops.push(
      prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.sub,
          action: "cpt.project_account.movement",
          entityType: "ProjectAccount",
          entityId: account.id,
          metadata: { type, direction, amount: data.amount, siteCode: account.site.code },
        },
      }),
    );

    await prisma.$transaction(ops);

    return NextResponse.json({ ok: true, balance: newBalance.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/project-accounts/[id]/movements]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
