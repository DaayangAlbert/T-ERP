import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// Rôles autorisés à créer un fournisseur (ACHATS en édition).
const MANAGE_ROLES: Role[] = [Role.PURCHASING_OFFICER, Role.DAF, Role.DG, Role.TENANT_ADMIN];

const createSupplierSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  taxId: z.string().max(40).optional(),
  rccm: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(80).optional(),
  address: z.string().max(200).optional(),
  strategic: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé aux achats / direction" }, { status: 403 });
  }
  try {
    const data = createSupplierSchema.parse(await req.json());
    const created = await prisma.supplier.create({
      data: {
        tenantId: session.tenantId,
        name: data.name.trim(),
        category: data.category.trim(),
        taxId: data.taxId || null,
        rccm: data.rccm || null,
        phone: data.phone || null,
        email: data.email || null,
        city: data.city || null,
        address: data.address || null,
        strategic: data.strategic ?? false,
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "purchase.supplier.create",
        entityType: "Supplier",
        entityId: created.id,
        metadata: { name: created.name, category: created.category },
      },
    });
    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/purchase/suppliers]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const strategic = url.searchParams.get("strategic") === "true";
  const search = url.searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (strategic) where.strategic = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.supplier.findMany({
    where,
    orderBy: [{ strategic: "desc" }, { volumeYTD: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      paymentTerms: s.paymentTerms,
      ratingQuality: s.ratingQuality,
      ratingDelay: s.ratingDelay,
      ratingPrice: s.ratingPrice,
      strategic: s.strategic,
      blocked: s.blocked,
      blockReason: s.blockReason,
      volumeYTD: s.volumeYTD.toString(),
      poCount: s.poCount,
    })),
    summary: {
      total: items.length,
      strategic: items.filter((s) => s.strategic).length,
      blocked: items.filter((s) => s.blocked).length,
      totalVolumeYTD: items.reduce((sum, s) => sum + s.volumeYTD, 0n).toString(),
    },
  });
}
