import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";

export const dynamic = "force-dynamic";

// Les recherches sont historisées dans GedAuditEvent avec action MODIFICATION
// + metadata.kind="SEARCH". On lit les 4 dernières de l'utilisateur courant.
export async function GET() {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  const events = await prisma.gedAuditEvent.findMany({
    where: {
      tenantId,
      actorId: userId,
      action: "MODIFICATION",
      metadata: { path: ["kind"], equals: "SEARCH" },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, createdAt: true, metadata: true },
  });

  return NextResponse.json({
    recent: events.map((e) => {
      const meta = (e.metadata ?? {}) as { query?: string; total?: number };
      return {
        id: e.id,
        query: meta.query ?? "(sans terme)",
        total: typeof meta.total === "number" ? meta.total : 0,
        timestamp: e.createdAt.toISOString(),
      };
    }),
  });
}
