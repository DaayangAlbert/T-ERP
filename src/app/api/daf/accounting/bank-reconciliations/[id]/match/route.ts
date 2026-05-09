import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT];
const schema = z.object({
  reconciledItems: z.array(z.string()),
  bookBalance: z.string().optional(),
  bankBalance: z.string().optional(),
  complete: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());
    const reco = await prisma.bankReconciliation.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!reco) return NextResponse.json({ error: "Rapprochement introuvable" }, { status: 404 });

    const bookBalance = data.bookBalance ? BigInt(data.bookBalance) : reco.bookBalance;
    const bankBalance = data.bankBalance ? BigInt(data.bankBalance) : reco.bankBalance;
    const gap = bookBalance - bankBalance;

    await prisma.bankReconciliation.update({
      where: { id: reco.id },
      data: {
        reconciledItems: data.reconciledItems as object,
        bookBalance,
        bankBalance,
        gap,
        status: data.complete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: data.complete ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
