import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { PurchaseOrderPDF, type PoPdfData } from "@/components/purchase/PurchaseOrderPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.PURCHASING_OFFICER, Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.OWNER];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      supplier: { select: { name: true, taxId: true, rccm: true, phone: true, address: true, city: true } },
      tenant: { select: { name: true, contactAddress: true, contactPhone: true, contactEmail: true, taxId: true, primaryColor: true } },
    },
  });
  if (!po) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });

  const [initiator, site] = await Promise.all([
    prisma.user.findUnique({ where: { id: po.initiatorId }, select: { firstName: true, lastName: true } }),
    po.siteId ? prisma.site.findUnique({ where: { id: po.siteId }, select: { code: true } }) : Promise.resolve(null),
  ]);

  const data: PoPdfData = {
    reference: po.reference,
    date: po.createdAt.toISOString(),
    label: po.label,
    category: po.category,
    amount: po.amount.toString(),
    status: po.status,
    chantier: site?.code ?? null,
    initiator: initiator ? `${initiator.firstName} ${initiator.lastName}` : "—",
    supplier: {
      name: po.supplier.name,
      taxId: po.supplier.taxId,
      rccm: po.supplier.rccm,
      phone: po.supplier.phone,
      address: po.supplier.address,
      city: po.supplier.city,
    },
    tenant: {
      name: po.tenant.name,
      address: po.tenant.contactAddress,
      phone: po.tenant.contactPhone,
      email: po.tenant.contactEmail,
      taxId: po.tenant.taxId,
      primaryColor: po.tenant.primaryColor,
    },
  };

  try {
    const element = createElement(PurchaseOrderPDF, { po: data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${po.reference}.pdf"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/purchase/orders/:id/pdf]", (err as Error).message);
    return NextResponse.json({ error: "Génération du PDF échouée" }, { status: 500 });
  }
}
