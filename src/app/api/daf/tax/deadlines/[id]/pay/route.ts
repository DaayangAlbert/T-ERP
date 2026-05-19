import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, CptEntryStatus, TaxType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT];

// Mapping type fiscal → compte SYSCOHADA (classe 4 - dettes État/organismes).
// Fallback 447100 (autres impôts) si le type n'est pas mappé.
const TAX_ACCOUNT: Record<TaxType, string> = {
  VAT: "443000", // TVA collectée à reverser
  IRPP: "447100", // IRPP retenu à reverser
  CNPS_DIPE: "431000", // Sécurité sociale (CNPS)
  CFC: "447100",
  FNE: "447100",
  RAV: "447100",
  TC: "447100",
  CAC: "447100",
  IS_INSTALLMENT: "444000", // État - impôt sur résultat (si présent)
  IS_BALANCE: "444000",
  DSF_FILING: "447100",
  TAXES_ANNEXES: "447100",
  OTHER: "447100",
};

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  const t = await prisma.taxDeadline.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!t) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });
  if (t.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Déjà payée" }, { status: 409 });
  }

  const paidAt = new Date();
  const amount = t.amount ?? 0n;
  const taxAccount = TAX_ACCOUNT[t.type] ?? "447100";
  const ref = `IMP-${t.type}-${t.period}-${Date.now().toString().slice(-4)}`;

  const result = await prisma.$transaction(async (tx) => {
    await tx.taxDeadline.update({
      where: { id: t.id },
      data: { paymentStatus: "PAID", paidAt },
    });

    // Si pas de montant, on ne génère pas d'écriture (rare mais possible
    // pour les déclarations à zéro).
    if (amount === 0n) return { entryId: null };

    const entry = await tx.entry.create({
      data: {
        tenantId: session.tenantId!,
        siteId: null,
        journalCode: "BQ",
        entryDate: paidAt,
        reference: ref,
        description: `Règlement ${t.type} période ${t.period} (${t.authority})`,
        status: CptEntryStatus.VALIDATED,
        createdById: session.sub,
        validatedById: session.sub,
        validatedAt: paidAt,
        lines: {
          create: [
            {
              accountCode: taxAccount,
              description: `Solde ${t.type} ${t.period}`,
              debit: amount,
              credit: BigInt(0),
            },
            {
              accountCode: "521000",
              description: `Règlement ${t.authority}`,
              debit: BigInt(0),
              credit: amount,
            },
          ],
        },
      },
    });
    return { entryId: entry.id };
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "tax.pay",
      entityType: "TaxDeadline",
      entityId: t.id,
      metadata: {
        type: t.type,
        period: t.period,
        amount: amount.toString(),
        entryId: result.entryId,
        reference: ref,
      },
    },
  });

  return NextResponse.json({ ok: true, entryId: result.entryId });
}
