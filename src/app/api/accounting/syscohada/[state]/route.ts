import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { classOf } from "@/lib/syscohada";

export const dynamic = "force-dynamic";

const VALID_STATES = ["balance", "pnl", "bs", "cashflow", "notes", "dsf"] as const;

export async function GET(req: Request, { params }: { params: { state: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(VALID_STATES as readonly string[]).includes(params.state)) {
    return NextResponse.json({ error: "État inconnu" }, { status: 400 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  // Récupère toutes les lignes de la période
  const lines = await prisma.accountingLine.findMany({
    where: { entry: { tenantId: session.tenantId, period: { startsWith: period.slice(0, 4) } } },
  });

  if (params.state === "pnl") {
    const charges = lines.filter((l) => classOf(l.account) === "6").reduce((s, l) => s + (l.debit - l.credit), 0n);
    const produits = lines.filter((l) => classOf(l.account) === "7").reduce((s, l) => s + (l.credit - l.debit), 0n);
    return NextResponse.json({
      state: "pnl",
      period,
      charges: charges.toString(),
      produits: produits.toString(),
      result: (produits - charges).toString(),
      draft: true,
    });
  }

  if (params.state === "bs") {
    const actif = lines.filter((l) => ["2", "3", "4", "5"].includes(classOf(l.account))).reduce((s, l) => s + (l.debit - l.credit), 0n);
    const passif = lines.filter((l) => ["1"].includes(classOf(l.account))).reduce((s, l) => s + (l.credit - l.debit), 0n);
    return NextResponse.json({
      state: "bs",
      period,
      actif: actif.toString(),
      passif: passif.toString(),
      balanced: actif === passif,
      draft: true,
    });
  }

  // Pour les autres états, on retourne juste un placeholder JSON
  return NextResponse.json({
    state: params.state,
    period,
    draft: true,
    note: "État disponible en téléchargement PDF",
  });
}
