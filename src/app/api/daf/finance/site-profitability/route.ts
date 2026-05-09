import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

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

  const rows: ProfitabilityRow[] = sites.map((s) => {
    const budget = Number(s.budget);
    const revenueYtd = Math.round(budget * (s.progress / 100) * 0.85);
    const totalCostBase = revenueYtd * (1 - Math.max(s.margin, 0) / 100);
    const directCosts = Math.round(totalCostBase * 0.78);
    const indirectCosts = Math.round(totalCostBase * 0.22);
    const grossMargin = revenueYtd - directCosts - indirectCosts;
    const marginPercent = revenueYtd === 0 ? 0 : (grossMargin / revenueYtd) * 100;
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
