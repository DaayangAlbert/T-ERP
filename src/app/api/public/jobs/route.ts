import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10) || 12));
  const region = url.searchParams.get("region")?.trim() || undefined;
  const search = url.searchParams.get("q")?.trim() || undefined;

  const where = {
    status: JobStatus.PUBLISHED,
    ...(region ? { region: { contains: region, mode: "insensitive" as const } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { department: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.jobOffer.count({ where }),
    prisma.jobOffer.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        reference: true,
        title: true,
        department: true,
        contractType: true,
        category: true,
        positions: true,
        salaryMin: true,
        salaryMax: true,
        region: true,
        publishedAt: true,
        expiresAt: true,
        tenant: { select: { id: true, slug: true, name: true, primaryColor: true, logoUrl: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((j) => ({
      ...j,
      salaryMin: j.salaryMin?.toString() ?? null,
      salaryMax: j.salaryMax?.toString() ?? null,
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
}
