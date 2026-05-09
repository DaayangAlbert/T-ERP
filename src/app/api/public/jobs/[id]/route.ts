import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = await prisma.jobOffer.findFirst({
    where: { id: params.id, status: JobStatus.PUBLISHED },
    include: {
      tenant: { select: { id: true, slug: true, name: true, primaryColor: true, logoUrl: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Offre introuvable ou retirée" }, { status: 404 });
  }

  return NextResponse.json({
    ...job,
    salaryMin: job.salaryMin?.toString() ?? null,
    salaryMax: job.salaryMax?.toString() ?? null,
  });
}
