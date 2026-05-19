import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Role, CommitmentType, CommitmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

const createCommitmentSchema = z.object({
  type: z.enum(["BANK_GUARANTEE", "FIRST_DEMAND_GUARANTEE", "LETTER_CREDIT", "PURCHASE_COMMITMENT"]),
  reference: z.string().max(80).optional().nullable(),
  bank: z.string().max(160).optional().nullable(),
  beneficiary: z.string().max(240).optional().nullable(),
  amount: z.coerce.string(),
  siteId: z.string().optional().nullable(),
  issueDate: z.string().min(1),
  maturityDate: z.string().min(1),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const items = await prisma.financialCommitment.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ status: "asc" }, { maturityDate: "asc" }],
    take: 300,
  });

  const now = new Date();
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
      daysUntilMaturity: Math.ceil((c.maturityDate.getTime() - now.getTime()) / 86_400_000),
      status: c.status,
      notes: c.notes,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DAF && session.role !== Role.TENANT_ADMIN && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Financière" }, { status: 403 });
  }

  try {
    const body = createCommitmentSchema.parse(await req.json());
    const maturity = new Date(body.maturityDate);
    const status: CommitmentStatus = maturity < new Date() ? "EXPIRED" : "ACTIVE";

    const created = await prisma.financialCommitment.create({
      data: {
        tenantId: session.tenantId,
        type: body.type as CommitmentType,
        reference: body.reference || null,
        bank: body.bank || null,
        beneficiary: body.beneficiary || null,
        amount: BigInt(body.amount || "0"),
        siteId: body.siteId || null,
        issueDate: new Date(body.issueDate),
        maturityDate: maturity,
        status,
        notes: body.notes || null,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/daf/financial-commitments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
