import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Liste des bulletins de l'utilisateur connecté pour l'année courante par
 * défaut, ou pour `?year=YYYY`. Renvoie un cumul net + un dernier bulletin
 * mis en avant pour le header de la page paie.
 */
export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const payslips = await prisma.payslip.findMany({
    where: { userId: session.sub, period: { gte: yearStart, lt: yearEnd } },
    orderBy: { period: "desc" },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      paymentDate: true,
      grossAmount: true,
      netAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      overtimeHours: true,
      paymentReference: true,
      paymentBankAccount: true,
      status: true,
    },
  });

  const cumulNet = payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);

  return NextResponse.json({
    year,
    total: payslips.length,
    cumulNet,
    payslips: payslips.map((p) => ({
      ...p,
      grossAmount: Number(p.grossAmount),
      netAmount: Number(p.netAmount),
      cnpsAmount: Number(p.cnpsAmount),
      irppAmount: Number(p.irppAmount),
    })),
  });
}
