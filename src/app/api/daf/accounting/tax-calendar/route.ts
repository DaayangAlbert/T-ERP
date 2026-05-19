import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { DeclarationStatus, PaymentStatus, Role, TaxType, TaxAuthority } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  VAT: "TVA",
  IRPP: "IRPP",
  CNPS_DIPE: "CNPS / DIPE",
  CFC: "CFC",
  FNE: "FNE",
  RAV: "RAV",
  TC: "Taxe communale",
  CAC: "CAC",
  IS_INSTALLMENT: "IS acompte",
  IS_BALANCE: "IS solde",
  DSF_FILING: "Dépôt DSF",
  TAXES_ANNEXES: "Taxes annexes",
  OTHER: "Autre",
};

const AUTHORITY_LABELS: Record<TaxAuthority, string> = {
  DGI: "DGI",
  CNPS: "CNPS",
  COMMUNE: "Commune",
  CNAM_OCCUPATIONAL: "CNAM",
  OTHER: "Autre",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 45); // fenêtre 45 j à venir

  // On veut les déclarations à venir + les retards récents non encore payés.
  const deadlines = await prisma.taxDeadline.findMany({
    where: {
      tenantId: session.tenantId,
      OR: [
        { dueDate: { gte: now, lte: horizon } },
        { paymentStatus: { not: PaymentStatus.PAID }, dueDate: { lt: now } },
      ],
    },
    orderBy: { dueDate: "asc" },
    take: 30,
  });

  const items = deadlines.map((d) => {
    const daysUntil = Math.ceil((d.dueDate.getTime() - now.getTime()) / 86_400_000);
    const overdue = daysUntil < 0;
    return {
      id: d.id,
      type: d.type,
      typeLabel: TAX_TYPE_LABELS[d.type],
      authority: d.authority,
      authorityLabel: AUTHORITY_LABELS[d.authority],
      period: d.period,
      dueDate: d.dueDate.toISOString(),
      daysUntil,
      overdue,
      amount: d.amount?.toString() ?? null,
      declarationStatus: d.declarationStatus,
      paymentStatus: d.paymentStatus,
    };
  });

  const summary = {
    total: items.length,
    overdueCount: items.filter((i) => i.overdue).length,
    next7Days: items.filter((i) => !i.overdue && i.daysUntil <= 7).length,
    pendingAmount: deadlines
      .filter((d) => d.paymentStatus !== PaymentStatus.PAID && d.amount)
      .reduce((s, d) => s + (d.amount ?? 0n), 0n)
      .toString(),
  };

  return NextResponse.json({ items, summary });
}
