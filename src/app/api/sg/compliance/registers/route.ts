import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { RegisterStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const registers = await prisma.regulatoryRegister.findMany({
    where: { tenantId },
    orderBy: { registerType: "asc" },
    include: {
      responsibleUser: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  const items = registers.map((r) => {
    const d = daysUntil(r.nextReviewDate);
    return {
      id: r.id,
      registerType: r.registerType,
      name: r.name,
      description: r.description,
      legalBasis: r.legalBasis,
      status: r.status,
      entriesCount: r.entriesCount,
      lastEntryDate: r.lastEntryDate?.toISOString() ?? null,
      nextReviewDate: r.nextReviewDate.toISOString(),
      daysToReview: d,
      responsible: {
        id: r.responsibleUser.id,
        fullName: `${r.responsibleUser.firstName} ${r.responsibleUser.lastName}`,
        role: r.responsibleUser.role,
      },
      severity:
        r.status === RegisterStatus.OVERDUE
          ? "rose"
          : r.status === RegisterStatus.TO_UPDATE || d <= 15
            ? "amber"
            : "emerald",
    };
  });

  return NextResponse.json({
    items,
    counts: {
      total: items.length,
      upToDate: items.filter((i) => i.status === RegisterStatus.UP_TO_DATE).length,
      toUpdate: items.filter((i) => i.status === RegisterStatus.TO_UPDATE).length,
      overdue: items.filter((i) => i.status === RegisterStatus.OVERDUE).length,
    },
  });
}
