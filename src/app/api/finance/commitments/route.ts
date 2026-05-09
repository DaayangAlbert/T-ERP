import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createCommitmentSchema } from "@/schemas/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.financialCommitment.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: "asc" }, { maturityDate: "asc" }],
  });

  const totalActive = items
    .filter((c) => c.status === "ACTIVE")
    .reduce((s, c) => s + c.amount, 0n);

  // Approxime "capitaux propres" depuis le dernier FinancialPeriod si dispo
  const latest = await prisma.financialPeriod.findFirst({
    where: { tenantId: session.tenantId, period: { not: { contains: "BUDGET" } } },
    orderBy: { period: "desc" },
  });
  const equity = latest
    ? (latest.balance as unknown as { passif?: { equity?: number } }).passif?.equity ?? 1
    : 1;
  const ratioToEquity = equity > 0 ? Number(totalActive) / equity : 0;

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      type: c.type,
      reference: c.reference,
      bank: c.bank,
      beneficiary: c.beneficiary,
      amount: c.amount.toString(),
      siteId: c.siteId,
      issueDate: c.issueDate.toISOString(),
      maturityDate: c.maturityDate.toISOString(),
      status: c.status,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
    summary: {
      total: items.length,
      active: items.filter((c) => c.status === "ACTIVE").length,
      expired: items.filter((c) => c.status === "EXPIRED").length,
      totalActiveAmount: totalActive.toString(),
      equityProxy: equity.toString(),
      ratioToEquity: Number((ratioToEquity * 100).toFixed(1)),
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createCommitmentSchema.parse(await req.json());
    const created = await prisma.financialCommitment.create({
      data: {
        tenantId: session.tenantId,
        type: data.type,
        reference: data.reference,
        bank: data.bank,
        beneficiary: data.beneficiary,
        amount: BigInt(data.amount),
        siteId: data.siteId ?? null,
        issueDate: new Date(data.issueDate),
        maturityDate: new Date(data.maturityDate),
        notes: data.notes,
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
