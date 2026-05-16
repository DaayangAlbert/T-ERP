import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const createSchema = z.object({
  supplierId: z.string(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string(),
  amountHt: z.coerce.number().nonnegative(),
  vatAmount: z.coerce.number().nonnegative(),
  amountTtc: z.coerce.number().nonnegative(),
  siteId: z.string().nullable().optional(),
  poRef: z.string().optional().nullable(),
  deliveryRef: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as InvoiceStatus | null;
  const allowed = await getAccessibleSiteIds(session.sub);

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (status) where.status = status;
  if (allowed !== null) where.siteId = { in: allowed };

  const items = await prisma.supplierInvoice.findMany({
    where,
    orderBy: { invoiceDate: "desc" },
    take: 200,
    include: {
      supplier: { select: { name: true } },
      site: { select: { code: true, name: true } },
    },
  });

  const today = new Date();
  const sevenDays = new Date(today.getTime() + 7 * 86_400_000);

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      supplier: i.supplier.name,
      invoiceDate: i.invoiceDate.toISOString(),
      dueDate: i.dueDate.toISOString(),
      amountHt: Number(i.amountHt),
      vatAmount: Number(i.vatAmount),
      amountTtc: Number(i.amountTtc),
      siteCode: i.site?.code ?? null,
      siteName: i.site?.name ?? null,
      siteId: i.siteId,
      status: i.status,
      poRef: i.poRef,
      deliveryRef: i.deliveryRef,
    })),
    counts: {
      toAccount: items.filter((i) => i.status === "RECEIVED" || i.status === "PENDING_3WAY_MATCH").length,
      dueSoon: items.filter(
        (i) =>
          (i.status === "ACCOUNTED" || i.status === "PENDING_PAYMENT") &&
          i.dueDate <= sevenDays
      ).length,
      disputed: items.filter((i) => i.status === "DISPUTED").length,
      paid: items.filter((i) => i.status === "PAID").length,
    },
    scope: { isDirection: allowed === null },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  if (parsed.data.siteId && !isSiteAllowed(allowed, parsed.data.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  const created = await prisma.supplierInvoice.create({
    data: {
      tenantId: session.tenantId,
      supplierId: parsed.data.supplierId,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate: new Date(parsed.data.invoiceDate),
      dueDate: new Date(parsed.data.dueDate),
      amountHt: BigInt(Math.round(parsed.data.amountHt)),
      vatAmount: BigInt(Math.round(parsed.data.vatAmount)),
      amountTtc: BigInt(Math.round(parsed.data.amountTtc)),
      siteId: parsed.data.siteId ?? null,
      poRef: parsed.data.poRef ?? null,
      deliveryRef: parsed.data.deliveryRef ?? null,
      status: parsed.data.poRef ? InvoiceStatus.PENDING_3WAY_MATCH : InvoiceStatus.RECEIVED,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "supplier-invoice.create",
      entityType: "SupplierInvoice",
      entityId: created.id,
      metadata: { supplierId: parsed.data.supplierId, amountTtc: parsed.data.amountTtc },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
