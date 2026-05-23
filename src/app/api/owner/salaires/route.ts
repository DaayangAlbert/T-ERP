import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, PayslipStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const users = await prisma.user.findMany({
    where: { tenantId: { in: scopeIds }, status: "ACTIVE", role: { notIn: [Role.CANDIDATE] } },
    select: {
      id: true, firstName: true, lastName: true, position: true, baseSalary: true,
      payslips: {
        where: { period: { gte: since }, status: { not: PayslipStatus.CANCELLED } },
        select: { periodLabel: true, period: true, status: true, netAmount: true },
        orderBy: { period: "desc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const label = (p: { periodLabel: string | null; period: Date }) =>
    p.periodLabel ?? `${p.period.getFullYear()}-${String(p.period.getMonth() + 1).padStart(2, "0")}`;

  let masseImpayee = 0n;
  const items = users.map((u) => {
    const payes: string[] = [];
    const impayes: string[] = [];
    let resteAPayer = 0n;
    for (const p of u.payslips) {
      if (p.status === PayslipStatus.PAID) payes.push(label(p));
      else {
        impayes.push(label(p));
        resteAPayer += p.netAmount;
      }
    }
    masseImpayee += resteAPayer;
    return {
      id: u.id,
      nom: `${u.firstName} ${u.lastName}`,
      poste: u.position,
      salaire: (u.baseSalary ?? 0n).toString(),
      moisPayes: payes.length,
      moisImpayes: impayes.length,
      impayes: impayes.slice(0, 12),
      resteAPayer: resteAPayer.toString(),
    };
  });

  return NextResponse.json({
    resume: {
      effectif: items.length,
      avecImpayes: items.filter((i) => i.moisImpayes > 0).length,
      masseImpayee: masseImpayee.toString(),
    },
    items,
  });
}
