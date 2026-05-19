import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [Role.DG, Role.DAF, Role.SUPER_ADMIN, Role.TENANT_ADMIN];

const createSupplierSchema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  city: z.string().min(2).max(80).optional().nullable(),
  taxId: z.string().max(40).optional().nullable(),
  rccm: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(120).optional().nullable().or(z.literal("")),
  address: z.string().max(240).optional().nullable(),
  paymentTerms: z.coerce.number().int().min(0).max(180).optional(),
  strategic: z.boolean().optional(),
  isSubcontractor: z.boolean().optional(),
});

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      address: true,
      taxId: true,
      phone: true,
      email: true,
      strategic: true,
      blocked: true,
      isSubcontractor: true,
      paymentTerms: true,
      ratingQuality: true,
      ratingDelay: true,
      ratingPrice: true,
      volumeYTD: true,
      poCount: true,
    },
  });

  // Group par ville
  const cityMap = new Map<string, { city: string; count: number; strategic: number; volumeYTD: number }>();
  for (const s of suppliers) {
    const city = s.city ?? "Non renseignée";
    const acc = cityMap.get(city) ?? { city, count: 0, strategic: 0, volumeYTD: 0 };
    acc.count += 1;
    if (s.strategic) acc.strategic += 1;
    acc.volumeYTD += Number(s.volumeYTD);
    cityMap.set(city, acc);
  }

  const cities = Array.from(cityMap.values())
    .map((c) => ({ ...c, volumeYTD: String(c.volumeYTD) }))
    .sort((a, b) => Number(b.volumeYTD) - Number(a.volumeYTD));

  const categories = Array.from(new Set(suppliers.map((s) => s.category))).sort();

  return NextResponse.json({
    summary: {
      total: suppliers.length,
      strategic: suppliers.filter((s) => s.strategic).length,
      blocked: suppliers.filter((s) => s.blocked).length,
      subcontractors: suppliers.filter((s) => s.isSubcontractor).length,
      citiesCount: cityMap.size,
      totalVolumeYTD: String(suppliers.reduce((s, x) => s + Number(x.volumeYTD), 0)),
    },
    cities,
    categories,
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      city: s.city,
      address: s.address,
      taxId: s.taxId,
      phone: s.phone,
      email: s.email,
      strategic: s.strategic,
      blocked: s.blocked,
      isSubcontractor: s.isSubcontractor,
      paymentTerms: s.paymentTerms,
      ratingQuality: s.ratingQuality,
      ratingDelay: s.ratingDelay,
      ratingPrice: s.ratingPrice,
      volumeYTD: s.volumeYTD.toString(),
      poCount: s.poCount,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = createSupplierSchema.parse(await req.json());

    const exists = await prisma.supplier.findFirst({
      where: { tenantId: session.tenantId, name: { equals: body.name, mode: "insensitive" } },
    });
    if (exists) {
      return NextResponse.json({ error: "Un fournisseur portant ce nom existe déjà." }, { status: 409 });
    }

    const created = await prisma.supplier.create({
      data: {
        tenantId: session.tenantId,
        name: body.name,
        category: body.category,
        city: body.city || null,
        taxId: body.taxId || null,
        rccm: body.rccm || null,
        phone: body.phone || null,
        email: body.email && body.email.length > 0 ? body.email : null,
        address: body.address || null,
        paymentTerms: body.paymentTerms ?? 45,
        strategic: body.strategic ?? false,
        isSubcontractor: body.isSubcontractor ?? false,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/dg/suppliers]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
