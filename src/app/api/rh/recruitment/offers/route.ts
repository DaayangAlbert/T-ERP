/**
 * Offres d'emploi RH — liste (tous statuts) + création.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, JobStatus } from "@prisma/client";
import { createJobOfferSchema, slugify } from "@/schemas/recruitment";

export const dynamic = "force-dynamic";

const VIEW_ROLES: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];
const MANAGE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const offers = await prisma.jobOffer.findMany({
    where: { tenantId: session.tenantId },
    select: {
      id: true,
      reference: true,
      slug: true,
      title: true,
      department: true,
      contractType: true,
      category: true,
      positions: true,
      region: true,
      status: true,
      publishedAt: true,
      expiresAt: true,
      viewCount: true,
      _count: { select: { applications: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: offers.map((o) => ({
      id: o.id,
      reference: o.reference,
      slug: o.slug,
      title: o.title,
      department: o.department ?? "—",
      contractType: o.contractType,
      category: o.category,
      positions: o.positions,
      region: o.region ?? "—",
      status: o.status,
      publishedAt: o.publishedAt?.toISOString().slice(0, 10) ?? null,
      expiresAt: o.expiresAt?.toISOString().slice(0, 10) ?? null,
      viewCount: o.viewCount,
      applicationsCount: o._count.applications,
    })),
  });
}

async function uniqueSlug(tenantId: string, title: string): Promise<string> {
  const base = slugify(title) || "offre";
  let candidate = base;
  for (let i = 0; i < 6; i++) {
    const clash = await prisma.jobOffer.findFirst({
      where: { tenantId, slug: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function nextReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.jobOffer.count({
    where: { tenantId, reference: { startsWith: `REC-${year}-` } },
  });
  return `REC-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  try {
    const data = createJobOfferSchema.parse(await req.json());
    const tenantId = session.tenantId;

    const slug = await uniqueSlug(tenantId, data.title);
    const publishing = data.status === JobStatus.PUBLISHED;

    // Réessaie sur collision de référence (concurrence).
    let created;
    for (let attempt = 0; attempt < 3; attempt++) {
      const reference =
        attempt === 0
          ? await nextReference(tenantId)
          : `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      try {
        created = await prisma.jobOffer.create({
          data: {
            tenantId,
            reference,
            slug,
            title: data.title,
            department: data.department || null,
            contractType: data.contractType,
            category: data.category,
            positions: data.positions,
            region: data.region || null,
            experienceMin: data.experienceMin ?? null,
            salaryMin: data.salaryMin ? BigInt(data.salaryMin) : null,
            salaryMax: data.salaryMax ? BigInt(data.salaryMax) : null,
            summary: data.summary || null,
            description: data.description,
            requirements: data.requirements,
            missions: data.missions ?? [],
            profileItems: data.profileItems ?? [],
            benefits: data.benefits ?? [],
            siteId: data.siteId || null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            status: data.status,
            publishedAt: publishing ? new Date() : null,
          },
          select: { id: true },
        });
        break;
      } catch (e) {
        if (attempt === 2) throw e;
      }
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: publishing ? "joboffer.create.published" : "joboffer.create.draft",
        entityType: "JobOffer",
        entityId: created!.id,
        metadata: { title: data.title, status: data.status },
      },
    });

    return NextResponse.json({ id: created!.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/rh/recruitment/offers]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
