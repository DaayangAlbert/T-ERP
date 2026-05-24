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

const lineSchema = z.object({
  designation: z.string().min(1).max(200),
  unit: z.string().max(20).optional(),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.string().regex(/^\d+$/, "Prix invalide"),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  category: z.string().min(2).max(60),
  lines: z.array(lineSchema).min(1, "Au moins un article"),
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

    // Calcule chaque ligne (montant = quantité × prix unitaire) et le total.
    let amount = 0n;
    const lines = data.lines.map((l) => {
      const lineAmount = BigInt(Math.round(l.quantity * Number(BigInt(l.unitPrice))));
      amount += lineAmount;
      return { designation: l.designation.trim(), unit: l.unit ?? "", quantity: l.quantity, unitPrice: l.unitPrice, amount: lineAmount.toString() };
    });
    if (amount <= 0n) return NextResponse.json({ error: "Le montant total doit être positif" }, { status: 400 });

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

    // Libellé synthétique du bon (1er article + nombre).
    const label = lines.length === 1 ? lines[0].designation : `${lines[0].designation} +${lines.length - 1} article(s)`;

    // ≤ seuil : émis directement (APPROVED). Au-delà : soumis au DAF.
    const status = amount <= SEUIL_DIRECT ? PoStatus.APPROVED : PoStatus.PENDING_DAF;
    const reference = await nextReference(session.tenantId);

    const created = await prisma.purchaseOrder.create({
      data: {
        tenantId: session.tenantId,
        supplierId: supplier.id,
        siteId: data.siteId || null,
        reference,
        label,
        amount,
        category: data.category.trim(),
        lines: lines as object,
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
        metadata: { reference, amount: amount.toString(), articles: lines.length, supplier: supplier.name, status },
      },
    });

    return NextResponse.json({ id: created.id, reference, status });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/purchase/orders]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
