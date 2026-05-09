import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { evaluateSupplierSchema } from "@/schemas/purchase";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = evaluateSupplierSchema.parse(await req.json());
    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!supplier) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const evaluation = await prisma.supplierEvaluation.create({
      data: {
        supplierId: supplier.id,
        evaluatorId: session.sub,
        period: data.period,
        ratingQuality: data.ratingQuality,
        ratingDelay: data.ratingDelay,
        ratingPrice: data.ratingPrice,
        comments: data.comments,
      },
    });

    // Met à jour les ratings agrégés sur le fournisseur (moyenne des évaluations)
    const all = await prisma.supplierEvaluation.findMany({
      where: { supplierId: supplier.id },
    });
    const avg = (k: "ratingQuality" | "ratingDelay" | "ratingPrice") =>
      all.reduce((s, e) => s + e[k], 0) / all.length;
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        ratingQuality: avg("ratingQuality"),
        ratingDelay: avg("ratingDelay"),
        ratingPrice: avg("ratingPrice"),
      },
    });

    return NextResponse.json({ id: evaluation.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
