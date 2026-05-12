import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, PoStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const supplier = searchParams.get("supplier");
  const site = searchParams.get("site");
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const where: Record<string, unknown> = { tenantId: { in: scopeIds } };
  if (status && Object.values(PoStatus).includes(status as PoStatus)) where.status = status;
  if (supplier) where.supplierId = supplier;
  if (site) where.siteId = site;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { label: { contains: search, mode: "insensitive" } },
    ];
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, items, allYtd, suppliers] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseOrder.findMany({
      where: { tenantId: { in: scopeIds }, createdAt: { gte: yearStart } },
      select: { status: true, amount: true, updatedAt: true },
    }),
    prisma.supplier.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Fetch sites for label only
  const sites = await prisma.site.findMany({
    where: { id: { in: items.map((i) => i.siteId).filter((x): x is string => !!x) } },
    select: { id: true, code: true, name: true },
  });
  const siteMap = new Map(sites.map((s) => [s.id, s]));

  const inProgress = allYtd.filter(
    (p) => p.status === "DRAFT" || p.status === "PENDING_DAF" || p.status === "PENDING_DG" || p.status === "APPROVED"
  );
  const toValidate = allYtd.filter((p) => p.status === "DRAFT" || p.status === "PENDING_DAF");
  const n2Daf = allYtd.filter((p) => p.status === "PENDING_DAF" && Number(p.amount) > 5_000_000);
  const receivedMonth = allYtd.filter(
    (p) => (p.status === "APPROVED" || p.status === "CANCELLED") && p.updatedAt >= monthStart
  );

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      reference: p.reference,
      label: p.label,
      category: p.category,
      amount: Number(p.amount),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      supplier: p.supplier.name,
      supplierId: p.supplier.id,
      site: p.siteId ? siteMap.get(p.siteId)?.name ?? null : null,
      siteCode: p.siteId ? siteMap.get(p.siteId)?.code ?? null : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    facets: {
      suppliers: suppliers.map((s) => ({ id: s.id, name: s.name })),
    },
    kpis: {
      inProgressCount: inProgress.length,
      toValidateCount: toValidate.length,
      n2DafCount: n2Daf.length,
      receivedMonthCount: receivedMonth.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.LOGISTICS && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.supplierId || !body.label || !body.amount || !body.category) {
    return NextResponse.json({ error: "Champs requis : supplierId, label, amount, category" }, { status: 400 });
  }

  // Workflow : > 5M => PENDING_DAF, sinon APPROVED (N1 LOG = émission directe)
  const status: PoStatus = Number(body.amount) > 5_000_000 ? "PENDING_DAF" : "APPROVED";

  const ref = `BC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: session.tenantId,
      supplierId: body.supplierId,
      siteId: body.siteId ?? null,
      reference: ref,
      label: body.label,
      amount: BigInt(body.amount),
      category: body.category,
      initiatorId: session.sub,
      status,
    },
  });

  return NextResponse.json({ id: po.id, reference: po.reference, status: po.status }, { status: 201 });
}
