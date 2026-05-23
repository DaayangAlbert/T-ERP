import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const SCOPE_LABEL: Record<string, string> = {
  CHANTIER: "Chantier",
  DIRECTION: "Direction",
  CENTRAL: "Magasin central",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: { in: scopeIds } },
    select: {
      id: true, name: true, scope: true,
      site: { select: { code: true, name: true } },
      stocks: { select: { quantity: true, totalValue: true, minThreshold: true, article: { select: { name: true, unit: true } } } },
    },
    orderBy: { name: "asc" },
  });

  let valeurTotale = 0n;
  let articlesTotal = 0;
  let alertesTotal = 0;
  const ruptures: { article: string; magasin: string; quantite: number; seuil: number; unite: string }[] = [];

  const magasins = warehouses.map((w) => {
    let valeur = 0n;
    let alertes = 0;
    for (const s of w.stocks) {
      valeur += s.totalValue;
      const low = s.minThreshold != null && s.quantity <= s.minThreshold;
      if (low) {
        alertes++;
        if (ruptures.length < 50) {
          ruptures.push({ article: s.article.name, magasin: w.name, quantite: s.quantity, seuil: s.minThreshold ?? 0, unite: s.article.unit });
        }
      }
    }
    valeurTotale += valeur;
    articlesTotal += w.stocks.length;
    alertesTotal += alertes;
    return {
      nom: w.name,
      type: SCOPE_LABEL[w.scope] ?? w.scope,
      chantier: w.site ? `${w.site.code} · ${w.site.name}` : null,
      nbArticles: w.stocks.length,
      valeur: valeur.toString(),
      alertes,
    };
  });

  return NextResponse.json({
    resume: {
      valeurTotale: valeurTotale.toString(),
      nbMagasins: warehouses.length,
      nbArticles: articlesTotal,
      nbAlertes: alertesTotal,
    },
    magasins,
    ruptures: ruptures.sort((a, b) => a.quantite / (a.seuil || 1) - b.quantite / (b.seuil || 1)),
  });
}
