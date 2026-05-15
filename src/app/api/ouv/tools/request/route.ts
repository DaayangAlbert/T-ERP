import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { toolRequestSchema } from "@/schemas/ouv-profile";
import { ToolLoanStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/tools/request — Demande d'outil au magasinier.
// Crée un ToolLoan en status REQUESTED ; le magasinier confirme la
// remise depuis son espace MAG (transition vers ISSUED).
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = toolRequestSchema.parse(body);

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { tenantId: true },
    });
    if (!me?.tenantId) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
    }

    const created = await prisma.toolLoan.create({
      data: {
        tenantId: me.tenantId,
        userId: session.sub,
        toolName: input.toolName,
        toolCategory: input.toolCategory ?? null,
        requestReason: input.reason,
        isPermanent: input.isPermanent ?? false,
        status: ToolLoanStatus.REQUESTED,
      },
      select: { id: true, toolName: true, status: true, requestedAt: true },
    });

    // TODO fn 1.6 / intégration WA : notif Magasinier (Lucas TIENTCHEU)

    return NextResponse.json(
      {
        loan: {
          id: created.id,
          toolName: created.toolName,
          status: created.status,
          requestedAt: created.requestedAt.toISOString(),
        },
        message: "Demande envoyée — le magasinier prépare l'outil",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/tools/request]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
