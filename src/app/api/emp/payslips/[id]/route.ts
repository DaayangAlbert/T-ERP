import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Détail d'un bulletin. Le `userId` côté Prisma DOIT correspondre au sujet
 * de la session : c'est la garde RBAC ownership de l'espace EMP — un ouvrier
 * ne peut JAMAIS consulter le bulletin d'un collègue.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const payslip = await prisma.payslip.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      periodEnd: true,
      paymentDate: true,
      paymentMethod: true,
      paymentMode: true,
      paymentBankAccount: true,
      paymentReference: true,
      baseSalary: true,
      overtimeAmount: true,
      overtimeHours: true,
      overtimeHours125: true,
      overtimeHours150: true,
      overtimeHours200: true,
      seniorityBonus: true,
      transportAllowance: true,
      otherBonuses: true,
      grossAmount: true,
      cnpsAmount: true,
      irppAmount: true,
      otherDeductions: true,
      netAmount: true,
      workedDays: true,
      reportedHours: true,
      status: true,
      validatedN1At: true,
      validatedN2At: true,
      paidAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          matricule: true,
          employeeId: true,
          position: true,
          professionalCategory: true,
          cnpsNumber: true,
          niu: true,
          hireDate: true,
          bankName: true,
          bankAgency: true,
          rib: true,
        },
      },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: "Bulletin introuvable ou hors périmètre" }, { status: 403 });
  }

  return NextResponse.json({
    payslip: {
      ...payslip,
      baseSalary: payslip.baseSalary ? Number(payslip.baseSalary) : null,
      overtimeAmount: Number(payslip.overtimeAmount),
      seniorityBonus: Number(payslip.seniorityBonus),
      transportAllowance: Number(payslip.transportAllowance),
      grossAmount: Number(payslip.grossAmount),
      cnpsAmount: Number(payslip.cnpsAmount),
      irppAmount: Number(payslip.irppAmount),
      otherDeductions: Number(payslip.otherDeductions),
      netAmount: Number(payslip.netAmount),
    },
  });
}
