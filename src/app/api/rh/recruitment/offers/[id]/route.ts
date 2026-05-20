/**
 * Offre d'emploi RH — détail (édition), mise à jour (édition + publier/fermer),
 * suppression (uniquement sans candidature).
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, JobStatus } from "@prisma/client";
import { updateJobOfferSchema, slugify } from "@/schemas/recruitment";

export const dynamic = "force-dynamic";

const VIEW_ROLES: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];
const MANAGE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const o = await prisma.jobOffer.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!o) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

  return NextResponse.json({
    id: o.id,
    reference: o.reference,
    slug: o.slug,
    title: o.title,
    department: o.department ?? "",
    contractType: o.contractType,
    category: o.category,
    positions: o.positions,
    region: o.region ?? "",
    experienceMin: o.experienceMin,
    salaryMin: o.salaryMin?.toString() ?? "",
    salaryMax: o.salaryMax?.toString() ?? "",
    summary: o.summary ?? "",
    description: o.description,
    requirements: o.requirements,
    missions: asStringArray(o.missions),
    profileItems: asStringArray(o.profileItems),
    benefits: asStringArray(o.benefits),
    siteId: o.siteId,
    expiresAt: o.expiresAt?.toISOString().slice(0, 10) ?? "",
    status: o.status,
    applicationsCount: await prisma.application.count({ where: { jobOfferId: o.id } }),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  try {
    const data = updateJobOfferSchema.parse(await req.json());
    const o = await prisma.jobOffer.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!o) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });

    const nextStatus = data.status ?? o.status;
    const becomingPublished = nextStatus === JobStatus.PUBLISHED && o.status !== JobStatus.PUBLISHED;

    await prisma.jobOffer.update({
      where: { id: o.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.department !== undefined && { department: data.department || null }),
        ...(data.contractType !== undefined && { contractType: data.contractType }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.positions !== undefined && { positions: data.positions }),
        ...(data.region !== undefined && { region: data.region || null }),
        ...(data.experienceMin !== undefined && { experienceMin: data.experienceMin ?? null }),
        ...(data.salaryMin !== undefined && { salaryMin: data.salaryMin ? BigInt(data.salaryMin) : null }),
        ...(data.salaryMax !== undefined && { salaryMax: data.salaryMax ? BigInt(data.salaryMax) : null }),
        ...(data.summary !== undefined && { summary: data.summary || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.requirements !== undefined && { requirements: data.requirements }),
        ...(data.missions !== undefined && { missions: data.missions ?? [] }),
        ...(data.profileItems !== undefined && { profileItems: data.profileItems ?? [] }),
        ...(data.benefits !== undefined && { benefits: data.benefits ?? [] }),
        ...(data.siteId !== undefined && { siteId: data.siteId || null }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
        ...(data.status !== undefined && { status: data.status }),
        // À la première publication, on garantit slug + date de publication.
        ...(becomingPublished && {
          publishedAt: o.publishedAt ?? new Date(),
          slug: o.slug ?? slugify(data.title ?? o.title),
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action:
          data.status && data.status !== o.status
            ? `joboffer.status.${data.status.toLowerCase()}`
            : "joboffer.update",
        entityType: "JobOffer",
        entityId: o.id,
        metadata: { from: o.status, to: nextStatus },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/rh/recruitment/offers/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  const o = await prisma.jobOffer.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, _count: { select: { applications: true } } },
  });
  if (!o) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (o._count.applications > 0) {
    return NextResponse.json(
      { error: "Cette offre a des candidatures — fermez-la plutôt que de la supprimer." },
      { status: 409 }
    );
  }

  await prisma.jobOffer.delete({ where: { id: o.id } });
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "joboffer.delete",
      entityType: "JobOffer",
      entityId: o.id,
      metadata: {},
    },
  });

  return NextResponse.json({ ok: true });
}
