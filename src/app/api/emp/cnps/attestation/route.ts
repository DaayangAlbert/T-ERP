import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Attestation CNPS — récapitulatif annuel des cotisations salariales.
 * Pour `?year=YYYY`, somme les `cnpsAmount` des 12 bulletins de l'année.
 * Renvoie aussi le cumul brut imposable et le cumul net pour vérification.
 *
 * À ce stade : payload JSON pour la fonction 1.5 (génération PDF de
 * l'attestation officielle). La signature DG (PDF tamponné) sera branchée
 * plus tard via le module RH (signature électronique).
 */
export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear() - 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      firstName: true,
      lastName: true,
      matricule: true,
      employeeId: true,
      cnpsNumber: true,
      hireDate: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const payslips = await prisma.payslip.findMany({
    where: { userId: session.sub, period: { gte: yearStart, lt: yearEnd } },
    orderBy: { period: "asc" },
    select: {
      period: true,
      periodLabel: true,
      grossAmount: true,
      cnpsAmount: true,
      netAmount: true,
      irppAmount: true,
    },
  });

  const totalGross = payslips.reduce((s, p) => s + Number(p.grossAmount), 0);
  const totalCnps = payslips.reduce((s, p) => s + Number(p.cnpsAmount), 0);
  const totalIrpp = payslips.reduce((s, p) => s + Number(p.irppAmount), 0);
  const totalNet = payslips.reduce((s, p) => s + Number(p.netAmount), 0);
  const isComplete = payslips.length === 12;

  return NextResponse.json({
    year,
    employee: {
      fullName: `${user.firstName} ${user.lastName}`,
      matricule: user.matricule ?? user.employeeId,
      cnpsNumber: user.cnpsNumber,
      hireDate: user.hireDate,
    },
    months: payslips.map((p) => ({
      periodLabel: p.periodLabel,
      grossAmount: Number(p.grossAmount),
      cnpsAmount: Number(p.cnpsAmount),
      irppAmount: Number(p.irppAmount),
      netAmount: Number(p.netAmount),
    })),
    totals: {
      months: payslips.length,
      grossAmount: totalGross,
      cnpsAmount: totalCnps,
      irppAmount: totalIrpp,
      netAmount: totalNet,
    },
    status: isComplete ? "COMPLETE" : "PARTIAL",
  });
}
