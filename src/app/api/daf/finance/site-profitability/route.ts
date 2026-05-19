import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

interface ProfitabilityRow {
  siteId: string;
  code: string;
  name: string;
  client: string;
  region: string | null;
  status: string;
  progress: number;
  budget: string;
  revenueYtd: string;
  directCosts: string;
  indirectCosts: string;
  grossMargin: string;
  marginPercent: number;
}

function classify(marginPercent: number): "danger" | "warn" | "ok" {
  if (marginPercent < 10) return "danger";
  if (marginPercent < 15) return "warn";
  return "ok";
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sortBy = url.searchParams.get("sortBy") ?? "margin";
  const order = url.searchParams.get("order") ?? "asc";

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: { in: ["ACTIVE", "AT_RISK", "DRIFTING"] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      region: true,
      status: true,
      progress: true,
      budget: true,
      margin: true,
    },
  });

  // Agrégation des EntryLine YTD par siteId :
  //   revenueYtd     = somme crédits sur 70x/75x (ventes & produits)
  //   directCosts    = somme débits sur 60x / 611 (achats + sous-traitance)
  //   indirectCosts  = somme débits sur autres 6xx
  const siteIds = sites.map((s) => s.id);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const lines =
    siteIds.length === 0
      ? []
      : await prisma.entryLine.findMany({
          where: {
            siteId: { in: siteIds },
            entry: {
              tenantId: { in: scopeIds },
              status: CptEntryStatus.VALIDATED,
              entryDate: { gte: yearStart },
            },
          },
          select: { siteId: true, accountCode: true, debit: true, credit: true },
        });

  type SiteAgg = { revenue: bigint; direct: bigint; indirect: bigint };
  const aggBySite = new Map<string, SiteAgg>();
  for (const l of lines) {
    if (!l.siteId) continue;
    const cur = aggBySite.get(l.siteId) ?? { revenue: 0n, direct: 0n, indirect: 0n };
    const cls = l.accountCode.slice(0, 1);
    const class2 = l.accountCode.slice(0, 2);
    const class3 = l.accountCode.slice(0, 3);
    if (cls === "7") {
      cur.revenue += l.credit - l.debit; // produit : crédit positif
    } else if (cls === "6") {
      const isDirect = class2 === "60" || class3 === "611";
      const amount = l.debit - l.credit; // charge : débit positif
      if (isDirect) cur.direct += amount;
      else cur.indirect += amount;
    }
    aggBySite.set(l.siteId, cur);
  }

  const rows: ProfitabilityRow[] = sites.map((s) => {
    const agg = aggBySite.get(s.id) ?? { revenue: 0n, direct: 0n, indirect: 0n };
    const revenueYtd = agg.revenue;
    const directCosts = agg.direct;
    const indirectCosts = agg.indirect;
    const grossMargin = revenueYtd - directCosts - indirectCosts;
    const marginPercent =
      revenueYtd === 0n ? 0 : (Number(grossMargin) / Number(revenueYtd)) * 100;
    return {
      siteId: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      region: s.region,
      status: s.status,
      progress: s.progress,
      budget: s.budget.toString(),
      revenueYtd: revenueYtd.toString(),
      directCosts: directCosts.toString(),
      indirectCosts: indirectCosts.toString(),
      grossMargin: grossMargin.toString(),
      marginPercent,
    };
  });

  rows.sort((a, b) => {
    const dir = order === "desc" ? -1 : 1;
    if (sortBy === "revenue") return dir * (Number(a.revenueYtd) - Number(b.revenueYtd));
    if (sortBy === "code") return dir * a.code.localeCompare(b.code);
    return dir * (a.marginPercent - b.marginPercent);
  });

  const summary = {
    totalSites: rows.length,
    inDanger: rows.filter((r) => classify(r.marginPercent) === "danger").length,
    inWarn: rows.filter((r) => classify(r.marginPercent) === "warn").length,
    inOk: rows.filter((r) => classify(r.marginPercent) === "ok").length,
    weightedMargin: (() => {
      const totalRev = rows.reduce((s, r) => s + Number(r.revenueYtd), 0);
      const totalGm = rows.reduce((s, r) => s + Number(r.grossMargin), 0);
      return totalRev === 0 ? 0 : (totalGm / totalRev) * 100;
    })(),
  };

  return NextResponse.json({ items: rows, summary });
}
