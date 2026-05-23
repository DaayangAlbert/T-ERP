import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

// Santé d'un chantier traduite en clair selon le statut.
function sante(status: string): { tone: "ok" | "warn" | "bad" | "neutral"; label: string } {
  switch (status) {
    case "ACTIVE": return { tone: "ok", label: "Va bien" };
    case "AT_RISK": return { tone: "warn", label: "À surveiller" };
    case "DRIFTING": return { tone: "bad", label: "En difficulté" };
    case "COMPLETED": return { tone: "neutral", label: "Clôturé" };
    case "PLANNED": return { tone: "neutral", label: "À démarrer" };
    case "ARCHIVED": return { tone: "neutral", label: "Archivé" };
    default: return { tone: "neutral", label: status };
  }
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: "ARCHIVED" } },
    select: {
      id: true, code: true, name: true, client: true, status: true,
      progress: true, margin: true, budget: true,
      plannedEndDate: true,
      contract: { select: { currentAmount: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });

  const items = sites.map((s) => {
    const h = sante(s.status);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      sante: h.label,
      tone: h.tone,
      progress: s.progress,
      margin: s.margin,
      montant: (s.contract?.currentAmount ?? s.budget).toString(),
      echeance: s.plannedEndDate.toISOString(),
      responsable: s.manager ? `${s.manager.firstName} ${s.manager.lastName}` : null,
    };
  });

  const actifs = items.filter((i) => ["Va bien", "À surveiller", "En difficulté"].includes(i.sante)).length;
  const enDifficulte = items.filter((i) => i.sante === "En difficulté" || i.sante === "À surveiller").length;
  const valeurTotale = sites.reduce((sum, s) => sum + (s.contract?.currentAmount ?? s.budget), 0n);
  const margins = items.filter((i) => i.tone === "ok" || i.tone === "warn" || i.tone === "bad").map((i) => i.margin);
  const margeMoyenne = margins.length ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10 : 0;

  return NextResponse.json({
    resume: {
      total: items.length,
      actifs,
      vontBien: actifs - enDifficulte,
      enDifficulte,
      valeurTotale: valeurTotale.toString(),
      margeMoyenne,
    },
    items,
  });
}
