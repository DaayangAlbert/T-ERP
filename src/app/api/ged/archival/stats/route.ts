import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ArchivalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantId = session.tenantId;
  const tenantDocs = { document: { tenantId } };

  const [active, semiActive, finalArch, pendingDestr, withoutRecord, totalDocs] = await Promise.all([
    prisma.documentRetentionRecord.count({ where: { archivalStatus: ArchivalStatus.ACTIVE, ...tenantDocs } }),
    prisma.documentRetentionRecord.count({ where: { archivalStatus: ArchivalStatus.SEMI_ACTIVE, ...tenantDocs } }),
    prisma.documentRetentionRecord.count({ where: { archivalStatus: ArchivalStatus.FINAL_ARCHIVE, ...tenantDocs } }),
    prisma.documentRetentionRecord.count({ where: { archivalStatus: ArchivalStatus.PENDING_DESTRUCTION, ...tenantDocs } }),
    prisma.document.count({ where: { tenantId, retentionRecord: null } }),
    prisma.document.count({ where: { tenantId } }),
  ]);

  return NextResponse.json({
    totals: {
      all: totalDocs,
      active: active + withoutRecord, // sans record = considéré actif par défaut
      semiActive,
      finalArchive: finalArch,
      pendingDestruction: pendingDestr,
    },
  });
}
