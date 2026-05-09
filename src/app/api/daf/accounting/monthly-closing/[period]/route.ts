import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

const DEFAULT_ITEMS = [
  { key: "invoices", label: "Toutes factures fournisseurs comptabilisées", status: "DONE" },
  { key: "salaries", label: "Salaires du mois provisionnés", status: "DONE" },
  { key: "social", label: "Charges sociales du mois provisionnées", status: "PENDING" },
  { key: "ccav", label: "Charges constatées d'avance (loyers, assurances)", status: "PENDING" },
  { key: "amortissements", label: "Amortissements du mois calculés", status: "PENDING" },
  { key: "depreciation", label: "Dépréciation créances douteuses (>90j)", status: "PENDING" },
  { key: "stock", label: "Inventaire stock effectué", status: "DONE" },
  { key: "cutoff", label: "Cut-off ventes (factures émises avant 5 du mois suivant)", status: "PENDING" },
];

export async function GET(_req: Request, { params }: { params: { period: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  let checklist = await prisma.monthlyClosingChecklist.findFirst({
    where: { tenantId: session.tenantId, period: params.period },
  });

  if (!checklist) {
    checklist = await prisma.monthlyClosingChecklist.create({
      data: {
        tenantId: session.tenantId,
        period: params.period,
        items: DEFAULT_ITEMS as object,
        status: "OPEN",
      },
    });
  }

  return NextResponse.json({
    id: checklist.id,
    period: checklist.period,
    items: checklist.items,
    status: checklist.status,
  });
}
