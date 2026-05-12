import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicTenant } from "@/lib/public-tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const tenant = await resolvePublicTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  const job = await prisma.jobOffer.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ slug: params.slug }, { id: params.slug }, { reference: params.slug }],
      status: "PUBLISHED",
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  // Incrémenter le compteur de vue (best-effort, sans bloquer)
  prisma.jobOffer
    .update({ where: { id: job.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json({
    tenant,
    job: {
      ...job,
      salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
      salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
      publishedAt: job.publishedAt?.toISOString() ?? null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
    },
  });
}
