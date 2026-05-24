import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, PoStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VIEW_ROLES: Role[] = [Role.PURCHASING_OFFICER, Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.OWNER];
const MANAGE_ROLES: Role[] = [Role.PURCHASING_OFFICER, Role.DAF, Role.TENANT_ADMIN];

// Seuil d'engagement direct (FCFA). Au-delà → validation DAF (puis DG).
const SEUIL_DIRECT = 2_000_000n;

const createSchema = z.object({
  supplierId: z.string().min(1),
  label: z.string().min(2).max(200),
  amount: z.string().regex(/^\d+$/, "Montant invalide").refine((v) => BigInt(v) > 0n, "Montant > 0 requis"),
  category: z.string().min(2).max(60),
  siteId: z.string().optional().nullable(),
});

// Génère le prochain numéro : BC-0001-2026 (4 chiffres, année courante, par tenant).
async function nextReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await prisma.purchaseOrder.findMany({
    where: { tenantId, reference: { startsWith: "BC-", endsWith: `-${year}` } },
    select: { reference: true },
  });
  let max = 0;
  for (const { reference } of existing) {
    const m = reference.match(/^BC-(\d{4})-(\d{4})$/);
    if (m && Number(m[2]) === year) max = Math.max(max, Number(m[1]));
  }
  return `BC-${String(max + 1).padStart(4, "0")}-${year}`;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const items = await prisma.purchaseOrder.findMany({
    where: { tenantId: session.tenantId },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // PurchaseOrder n'a pas de relation site (siteId seul) → résolution des codes.
  const siteIds = Array.from(new Set(items.map((o) => o.siteId).filter(Boolean))) as string[];
  const sites = siteIds.length
    ? await prisma.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, code: true } })
    : [];
  const siteCode = new Map(sites.map((s) => [s.id, s.code]));
  return NextResponse.json({
    items: items.map((o) => ({
      id: o.id,
      reference: o.reference,
      label: o.label,
      supplier: o.supplier.name,
      category: o.category,
      chantier: o.siteId ? siteCode.get(o.siteId) ?? null : null,
      amount: o.amount.toString(),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    canManage: MANAGE_ROLES.includes(session.role as Role),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au chargé des achats / DAF" }, { status: 403 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const amount = BigInt(data.amount);

    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId: session.tenantId },
      select: { id: true, blocked: true, name: true },
    });
    if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    if (supplier.blocked) return NextResponse.json({ error: "Ce fournisseur est bloqué" }, { status: 400 });

    if (data.siteId) {
      const site = await prisma.site.findFirst({ where: { id: data.siteId, tenantId: session.tenantId }, select: { id: true } });
      if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
    }

    // ≤ seuil : émis directement (APPROVED). Au-delà : soumis au DAF.
    const status = amount <= SEUIL_DIRECT ? PoStatus.APPROVED : PoStatus.PENDING_DAF;
    const reference = await nextReference(session.tenantId);

    const created = await prisma.purchaseOrder.create({
      data: {
        tenantId: session.tenantId,
        supplierId: supplier.id,
        siteId: data.siteId || null,
        reference,
        label: data.label.trim(),
        amount,
        category: data.category.trim(),
        initiatorId: session.sub,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "purchase.order.create",
        entityType: "PurchaseOrder",
        entityId: created.id,
        metadata: { reference, amount: data.amount, supplier: supplier.name, status },
      },
    });

    return NextResponse.json({ id: created.id, reference, status });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/purchase/orders]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
