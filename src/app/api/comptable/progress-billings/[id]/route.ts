import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, BillingStatus, CptEntryStatus } from "@prisma/client";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const actionSchema = z.object({
  action: z.enum(["issue", "payment"]),
  paidAmount: z.coerce.number().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const billing = await prisma.progressBilling.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!billing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!isSiteAllowed(allowed, billing.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  if (parsed.data.action === "issue") {
    if (billing.status !== BillingStatus.DRAFT && billing.status !== BillingStatus.VALIDATED) {
      return NextResponse.json({ error: "Déjà émise" }, { status: 409 });
    }
    // Émission OHADA d'une situation de travaux :
    //   D 411 Clients   = TTC
    //   C 705 Travaux   = HT
    //   C 443 TVA coll. = TVA
    const now = new Date();
    const ref = `VTE-${billing.billingNumber.replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          tenantId: billing.tenantId,
          siteId: billing.siteId,
          journalCode: "VTE",
          entryDate: now,
          reference: ref,
          description: `Situation ${billing.billingNumber} période ${billing.period}`,
          status: CptEntryStatus.VALIDATED,
          createdById: session.sub,
          validatedById: session.sub,
          validatedAt: now,
          lines: {
            create: [
              {
                accountCode: "411000",
                description: "Client — créance TTC",
                debit: billing.amountTtc,
                credit: BigInt(0),
                siteId: billing.siteId,
              },
              {
                accountCode: "705000",
                description: "Travaux BTP — HT",
                debit: BigInt(0),
                credit: billing.amountHt,
                siteId: billing.siteId,
              },
              {
                accountCode: "443000",
                description: "TVA collectée 19,25 %",
                debit: BigInt(0),
                credit: billing.vatAmount,
                siteId: billing.siteId,
              },
            ],
          },
        },
      });
      const updated = await tx.progressBilling.update({
        where: { id: billing.id },
        data: { status: BillingStatus.ISSUED, pdfUrl: `/stub/billing-${billing.id}.pdf` },
      });
      return { entry, updated };
    });

    await prisma.auditLog.create({
      data: {
        tenantId: billing.tenantId,
        userId: session.sub,
        action: "progress-billing.issue",
        entityType: "ProgressBilling",
        entityId: billing.id,
        metadata: { billingNumber: billing.billingNumber, entryId: result.entry.id, reference: ref },
      },
    });
    return NextResponse.json({ ok: true, entryId: result.entry.id });
  }

  if (parsed.data.action === "payment") {
    if (billing.status === BillingStatus.PAID) {
      return NextResponse.json({ error: "Déjà payée" }, { status: 409 });
    }
    const amount = parsed.data.paidAmount ?? Number(billing.netToReceive);
    const newStatus =
      amount >= Number(billing.netToReceive) ? BillingStatus.PAID : BillingStatus.PARTIALLY_PAID;
    const paidAt = new Date();
    // Encaissement OHADA :
    //   D 521 Banques  = montant encaissé
    //   C 411 Clients  = montant encaissé
    const ref = `ENC-${billing.billingNumber.replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          tenantId: billing.tenantId,
          siteId: billing.siteId,
          journalCode: "BQ",
          entryDate: paidAt,
          reference: ref,
          description: `Encaissement situation ${billing.billingNumber}`,
          status: CptEntryStatus.VALIDATED,
          createdById: session.sub,
          validatedById: session.sub,
          validatedAt: paidAt,
          lines: {
            create: [
              {
                accountCode: "521000",
                description: "Banque — encaissement",
                debit: BigInt(Math.round(amount)),
                credit: BigInt(0),
                siteId: billing.siteId,
              },
              {
                accountCode: "411000",
                description: "Client — solde",
                debit: BigInt(0),
                credit: BigInt(Math.round(amount)),
                siteId: billing.siteId,
              },
            ],
          },
        },
      });
      const updated = await tx.progressBilling.update({
        where: { id: billing.id },
        data: {
          status: newStatus,
          paidAmount: BigInt(Math.round(amount)),
          paidAt: newStatus === BillingStatus.PAID ? paidAt : null,
        },
      });
      return { entry, updated };
    });

    await prisma.auditLog.create({
      data: {
        tenantId: billing.tenantId,
        userId: session.sub,
        action: "progress-billing.payment",
        entityType: "ProgressBilling",
        entityId: billing.id,
        metadata: { amount, billingNumber: billing.billingNumber, entryId: result.entry.id, reference: ref },
      },
    });
    return NextResponse.json({ ok: true, entryId: result.entry.id });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
