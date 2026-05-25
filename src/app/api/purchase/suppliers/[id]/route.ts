import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// Mêmes rôles que la création d'un fournisseur.
const MANAGE_ROLES: Role[] = [Role.PURCHASING_OFFICER, Role.DAF, Role.DG, Role.TENANT_ADMIN];

const updateSupplierSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().min(2).max(60).optional(),
  taxId: z.string().max(40).optional().nullable(),
  rccm: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  strategic: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  const [pos, evaluations, contracts] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.supplierEvaluation.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.frameworkContract.findMany({
      where: { supplierId: supplier.id, status: "ACTIVE" },
    }),
  ]);

  return NextResponse.json({
    id: supplier.id,
    name: supplier.name,
    category: supplier.category,
    taxId: supplier.taxId,
    rccm: supplier.rccm,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    paymentTerms: supplier.paymentTerms,
    ratingQuality: supplier.ratingQuality,
    ratingDelay: supplier.ratingDelay,
    ratingPrice: supplier.ratingPrice,
    strategic: supplier.strategic,
    blocked: supplier.blocked,
    blockReason: supplier.blockReason,
    volumeYTD: supplier.volumeYTD.toString(),
    poCount: supplier.poCount,
    history: pos.map((p) => ({
      id: p.id,
      reference: p.reference,
      label: p.label,
      amount: p.amount.toString(),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    evaluations: evaluations.map((e) => ({
      id: e.id,
      period: e.period,
      ratingQuality: e.ratingQuality,
      ratingDelay: e.ratingDelay,
      ratingPrice: e.ratingPrice,
      comments: e.comments,
      createdAt: e.createdAt.toISOString(),
    })),
    activeContracts: contracts.map((c) => ({
      id: c.id,
      reference: c.reference,
      subject: c.subject,
      maxAmount: c.maxAmount.toString(),
      usedAmount: c.usedAmount.toString(),
      endDate: c.endDate.toISOString(),
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé aux achats / direction" }, { status: 403 });
  }

  const existing = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  try {
    const data = updateSupplierSchema.parse(await req.json());
    // Normalise les chaînes vides en null pour les champs de contact.
    const norm = (v: string | null | undefined) => (v === undefined ? undefined : v ? v.trim() : null);
    const updated = await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() } : {}),
        ...(data.taxId !== undefined ? { taxId: norm(data.taxId) } : {}),
        ...(data.rccm !== undefined ? { rccm: norm(data.rccm) } : {}),
        ...(data.phone !== undefined ? { phone: norm(data.phone) } : {}),
        ...(data.email !== undefined ? { email: norm(data.email) } : {}),
        ...(data.city !== undefined ? { city: norm(data.city) } : {}),
        ...(data.address !== undefined ? { address: norm(data.address) } : {}),
        ...(data.strategic !== undefined ? { strategic: data.strategic } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "purchase.supplier.update",
        entityType: "Supplier",
        entityId: updated.id,
        metadata: { name: updated.name },
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[PATCH /api/purchase/suppliers/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
