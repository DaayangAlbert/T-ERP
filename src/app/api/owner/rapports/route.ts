import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import {
  Role,
  BoardReportStatus,
  DafMonthlyFinancialReportStatus,
  DtMonthlyTechReportStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const BOARD_TYPE: Record<string, string> = { MONTHLY: "Mensuel", QUARTERLY: "Trimestriel", ANNUAL: "Annuel" };

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const tid = session.tenantId;
  const [board, financier, technique] = await Promise.all([
    prisma.boardReport.findMany({
      where: { tenantId: tid, status: BoardReportStatus.PUBLISHED },
      orderBy: { boardDate: "desc" },
      take: 24,
      select: { id: true, type: true, period: true, boardDate: true, pdfUrl: true, author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.dafMonthlyFinancialReport.findMany({
      where: { tenantId: tid, status: { not: DafMonthlyFinancialReportStatus.DRAFT } },
      orderBy: { period: "desc" },
      take: 24,
      select: { id: true, periodLabel: true, period: true, status: true, pdfUrl: true, author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.dtMonthlyTechReport.findMany({
      where: { tenantId: tid, status: { not: DtMonthlyTechReportStatus.DRAFT } },
      orderBy: { period: "desc" },
      take: 24,
      select: { id: true, periodLabel: true, period: true, status: true, pdfUrl: true, author: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const label = (p: { periodLabel: string | null; period: Date }) =>
    p.periodLabel ?? `${p.period.getFullYear()}-${String(p.period.getMonth() + 1).padStart(2, "0")}`;

  return NextResponse.json({
    conseil: board.map((b) => ({
      id: b.id,
      titre: `Rapport ${BOARD_TYPE[b.type] ?? b.type} — ${b.period}`,
      date: b.boardDate.toISOString(),
      auteur: `${b.author.firstName} ${b.author.lastName}`,
      pdfUrl: b.pdfUrl,
    })),
    financier: financier.map((r) => ({
      id: r.id,
      titre: `Rapport financier — ${label(r)}`,
      date: r.period.toISOString(),
      auteur: `${r.author.firstName} ${r.author.lastName}`,
      pdfUrl: r.pdfUrl,
    })),
    technique: technique.map((r) => ({
      id: r.id,
      titre: `Rapport technique — ${label(r)}`,
      date: r.period.toISOString(),
      auteur: `${r.author.firstName} ${r.author.lastName}`,
      pdfUrl: r.pdfUrl,
    })),
  });
}
