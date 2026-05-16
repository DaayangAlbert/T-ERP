import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, BillingStatus } from "@prisma/client";

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
    // En production : générer PDF + envoyer email MOA. Ici stub.
    await prisma.progressBilling.update({
      where: { id: billing.id },
      data: { status: BillingStatus.ISSUED, pdfUrl: `/stub/billing-${billing.id}.pdf` },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: billing.tenantId,
        userId: session.sub,
        action: "progress-billing.issue",
        entityType: "ProgressBilling",
        entityId: billing.id,
        metadata: { billingNumber: billing.billingNumber },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "payment") {
    const amount = parsed.data.paidAmount ?? Number(billing.netToReceive);
    const newStatus =
      amount >= Number(billing.netToReceive) ? BillingStatus.PAID : BillingStatus.PARTIALLY_PAID;
    await prisma.progressBilling.update({
      where: { id: billing.id },
      data: {
        status: newStatus,
        paidAmount: BigInt(Math.round(amount)),
        paidAt: newStatus === BillingStatus.PAID ? new Date() : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: billing.tenantId,
        userId: session.sub,
        action: "progress-billing.payment",
        entityType: "ProgressBilling",
        entityId: billing.id,
        metadata: { amount, billingNumber: billing.billingNumber },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
