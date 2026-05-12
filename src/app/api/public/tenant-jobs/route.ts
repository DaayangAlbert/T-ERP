import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicTenant } from "@/lib/public-tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tenant = await resolvePublicTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const contractType = url.searchParams.get("contractType") ?? "";
  const region = url.searchParams.get("region")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";

  const where: Record<string, unknown> = {
    tenantId: tenant.id,
    status: "PUBLISHED",
  };
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  if (contractType) where.contractType = contractType;
  if (region) where.region = { contains: region, mode: "insensitive" };
  if (category) where.category = { contains: category, mode: "insensitive" };

  const jobs = await prisma.jobOffer.findMany({
    where,
    select: {
      id: true,
      reference: true,
      slug: true,
      title: true,
      department: true,
      contractType: true,
      category: true,
      summary: true,
      region: true,
      salaryMin: true,
      salaryMax: true,
      experienceMin: true,
      publishedAt: true,
      positions: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json({
    tenant,
    jobs: jobs.map((j) => ({
      ...j,
      salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
      salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
      publishedAt: j.publishedAt?.toISOString() ?? null,
    })),
    total: jobs.length,
  });
}
