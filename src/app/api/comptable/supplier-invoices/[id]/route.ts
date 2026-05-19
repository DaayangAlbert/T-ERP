import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, InvoiceStatus, CptEntryStatus } from "@prisma/client";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const actionSchema = z.object({
  action: z.enum(["account", "dispute", "pay"]),
  reason: z.string().optional(),
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
  const invoice = await prisma.supplierInvoice.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { supplier: true },
  });
  if (!invoice) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!isSiteAllowed(allowed, invoice.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  if (parsed.data.action === "account") {
    if (invoice.status === InvoiceStatus.ACCOUNTED || invoice.status === InvoiceStatus.PAID) {
      return NextResponse.json({ error: "Déjà comptabilisée" }, { status: 409 });
    }
    const ref = `FA-${invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;
    const entry = await prisma.entry.create({
      data: {
        tenantId: invoice.tenantId,
        siteId: invoice.siteId,
        journalCode: "ACH",
        entryDate: invoice.invoiceDate,
        reference: ref,
        description: `Facture ${invoice.supplier.name} n°${invoice.invoiceNumber}`,
        status: CptEntryStatus.VALIDATED,
        createdById: session.sub,
        validatedById: session.sub,
        validatedAt: new Date(),
        lines: {
          create: [
            { accountCode: "604000", description: "Achats matériels", debit: invoice.amountHt, credit: BigInt(0), siteId: invoice.siteId },
            { accountCode: "445660", description: "TVA déductible 19,25%", debit: invoice.vatAmount, credit: BigInt(0), siteId: invoice.siteId },
            { accountCode: "401", thirdPartyId: invoice.supplierId, description: invoice.supplier.name, debit: BigInt(0), credit: invoice.amountTtc, siteId: invoice.siteId },
          ],
        },
      },
    });
    await prisma.supplierInvoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.ACCOUNTED, entryId: entry.id, accountedAt: new Date(), accountedBy: session.sub },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId: session.sub,
        action: "supplier-invoice.account",
        entityType: "SupplierInvoice",
        entityId: invoice.id,
        metadata: { entryId: entry.id, reference: ref },
      },
    });
    return NextResponse.json({ entryId: entry.id });
  }

  if (parsed.data.action === "dispute") {
    if (!parsed.data.reason || parsed.data.reason.length < 5) {
      return NextResponse.json({ error: "Motif requis" }, { status: 400 });
    }
    await prisma.supplierInvoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.DISPUTED, disputeReason: parsed.data.reason },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId: session.sub,
        action: "supplier-invoice.dispute",
        entityType: "SupplierInvoice",
        entityId: invoice.id,
        metadata: { reason: parsed.data.reason },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "pay") {
    // Source de vérité = Entry comptable (OHADA). On crée l'écriture de
    // règlement fournisseur :
    //   D 401 Fournisseurs   = invoice.amountTtc
    //   C 521 Banques        = invoice.amountTtc
    // Journal "BQ", statut VALIDATED — apparaît immédiatement dans l'historique
    // trésorerie et dans le grand livre. Plus aucun BankMovement direct.
    const paidAt = new Date();
    const ref = `REG-${invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          tenantId: invoice.tenantId,
          siteId: invoice.siteId,
          journalCode: "BQ",
          entryDate: paidAt,
          reference: ref,
          description: `Règlement facture ${invoice.supplier.name} n°${invoice.invoiceNumber}`,
          status: CptEntryStatus.VALIDATED,
          createdById: session.sub,
          validatedById: session.sub,
          validatedAt: paidAt,
          lines: {
            create: [
              {
                accountCode: "401000",
                thirdPartyId: invoice.supplierId,
                description: `Solde ${invoice.supplier.name}`,
                debit: invoice.amountTtc,
                credit: BigInt(0),
                siteId: invoice.siteId,
              },
              {
                accountCode: "521000",
                description: "Décaissement règlement",
                debit: BigInt(0),
                credit: invoice.amountTtc,
                siteId: invoice.siteId,
              },
            ],
          },
        },
      });

      const updated = await tx.supplierInvoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID, paidAt, entryId: entry.id },
      });

      return { entry, updated };
    });

    await prisma.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId: session.sub,
        action: "supplier-invoice.pay",
        entityType: "SupplierInvoice",
        entityId: invoice.id,
        metadata: {
          amount: Number(invoice.amountTtc),
          entryId: result.entry.id,
          reference: ref,
        },
      },
    });

    return NextResponse.json({ ok: true, entryId: result.entry.id, reference: ref });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
