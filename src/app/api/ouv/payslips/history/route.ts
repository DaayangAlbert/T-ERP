import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/payslips/history?year=2026&limit=12
// Historique des bulletins, par défaut les 12 derniers mois (toutes années).
// Si `year` fourni, filtre sur cette année calendaire.
export async function GET(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 12), 60);

  const where: { userId: string; period?: { gte: Date; lt: Date } } = {
    userId: session.sub,
  };
  if (yearParam) {
    const year = Number(yearParam);
    if (Number.isInteger(year) && year >= 2020 && year <= 2100) {
      where.period = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      };
    }
  }

  const payslips = await prisma.payslip.findMany({
    where,
    orderBy: { period: "desc" },
    take: limit,
    select: {
      id: true,
      period: true,
      periodLabel: true,
      paymentDate: true,
      grossAmount: true,
      netAmount: true,
      status: true,
      overtimeHours: true,
    },
  });

  const cumulNet = payslips.reduce((s, p) => s + Number(p.netAmount), 0);

  return NextResponse.json({
    total: payslips.length,
    cumulNet,
    payslips: payslips.map((p) => ({
      id: p.id,
      period: p.period.toISOString(),
      periodLabel: p.periodLabel,
      paymentDate: p.paymentDate.toISOString(),
      grossAmount: Number(p.grossAmount),
      netAmount: Number(p.netAmount),
      status: p.status,
      overtimeHours: p.overtimeHours,
    })),
  });
}
