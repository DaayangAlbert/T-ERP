import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { EpiStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/epi/mine
// Liste des EPI assignés à l'ouvrier (5 standards : casque, lunettes,
// gants, chaussures, gilet — variations possibles selon RH).
// Calcule un flag "needsReplacement" si expectedReplacementAt < +30 j.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const items = await prisma.epiAssignment.findMany({
    where: {
      userId: session.sub,
      status: { in: [EpiStatus.OK, EpiStatus.WORN_OUT, EpiStatus.DEFECTIVE] },
    },
    orderBy: [{ assignedAt: "desc" }],
    select: {
      id: true,
      epiType: true,
      name: true,
      serialNumber: true,
      assignedAt: true,
      expectedReplacementAt: true,
      status: true,
      replacementReason: true,
    },
  });

  const now = Date.now();
  const soonMs = 30 * 24 * 3600 * 1000;

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      epiType: e.epiType,
      name: e.name,
      serialNumber: e.serialNumber,
      assignedAt: e.assignedAt.toISOString(),
      expectedReplacementAt: e.expectedReplacementAt?.toISOString() ?? null,
      status: e.status,
      replacementReason: e.replacementReason,
      // soft alert : à renouveler dans < 30 j
      needsReplacementSoon: e.expectedReplacementAt
        ? e.expectedReplacementAt.getTime() - now < soonMs
        : false,
      isOverdue: e.expectedReplacementAt
        ? e.expectedReplacementAt.getTime() < now
        : false,
    })),
  });
}
