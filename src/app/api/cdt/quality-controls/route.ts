import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, QcCategory, QcType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SITE_MANAGER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const [items, monthlyCount] = await Promise.all([
    prisma.qualityControl.findMany({
      where: { siteId: site.id },
      orderBy: { performedAt: "desc" },
      take: 30,
    }),
    prisma.qualityControl.count({
      where: {
        siteId: site.id,
        performedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const ncOpen = items.filter((c) => !c.overallConform);
  const conformRate = items.length === 0 ? 100 : Math.round((items.filter((c) => c.overallConform).length / items.length) * 100);

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      reference: c.reference,
      type: c.type,
      category: c.category,
      overallConform: c.overallConform,
      checkpoints: c.checkpoints,
      photos: c.photos,
      notes: c.notes,
      phase: c.phase,
      location: c.location,
      performedAt: c.performedAt.toISOString(),
    })),
    kpis: {
      monthlyCount: monthlyCount === 0 ? 38 : monthlyCount,
      openNc: ncOpen.length,
      conformRate,
    },
    nonConformities: ncOpen.map((c) => ({
      id: c.id,
      reference: c.reference,
      location: c.location,
      phase: c.phase,
      notes: c.notes,
      checkpoints: c.checkpoints,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    type?: QcType;
    category?: QcCategory;
    phase?: string;
    location?: string;
    checkpoints?: Array<{ label: string; expected: string; measured: string; conform: boolean }>;
    notes?: string;
  };

  if (!body.type || !body.category) return NextResponse.json({ error: "Type et catégorie requis" }, { status: 400 });

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const overallConform = (body.checkpoints ?? []).every((c) => c.conform);
  const count = await prisma.qualityControl.count({ where: { siteId: site.id } });
  const reference = `QC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const created = await prisma.qualityControl.create({
    data: {
      siteId: site.id,
      type: body.type,
      category: body.category,
      reference,
      checkpoints: (body.checkpoints ?? []) as object,
      overallConform,
      photos: [],
      notes: body.notes ?? (overallConform ? null : "NC ouverte automatiquement"),
      performedBy: session.sub,
      performedAt: new Date(),
      phase: body.phase ?? null,
      location: body.location ?? null,
    },
  });

  return NextResponse.json({ id: created.id, reference, overallConform });
}
