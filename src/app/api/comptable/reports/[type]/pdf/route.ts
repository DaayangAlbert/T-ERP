import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { AccountingReportPDF, type AccountingReportData, type BalanceRow } from "@/components/comptable/reports/AccountingReportPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

// Rapports actuellement disponibles en PDF (balances). Les autres (grand-livre
// complet, journal, DSF…) arriveront dans un second temps.
const BALANCE_REPORTS: Record<string, { title: string; mode: "general" | "auxiliary"; prefix?: string }> = {
  CPT_BALANCE_GENERAL: { title: "Balance générale", mode: "general" },
  CPT_BALANCE_AUX_SUPPLIERS: { title: "Balance auxiliaire fournisseurs", mode: "auxiliary", prefix: "401" },
  CPT_BALANCE_AUX_CUSTOMERS: { title: "Balance auxiliaire clients", mode: "auxiliary", prefix: "411" },
  CPT_SITE_BALANCE: { title: "Balance analytique chantier", mode: "general" },
};

export async function GET(req: Request, { params }: { params: { type: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const cfg = BALANCE_REPORTS[params.type];
  if (!cfg) {
    return NextResponse.json({ error: "Ce rapport n'est pas encore disponible en PDF." }, { status: 400 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period");
  const allowed = await getAccessibleSiteIds(session.sub);

  const entryWhere: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowed !== null) entryWhere.siteId = { in: allowed };
  let periodLabel = "Cumul (toutes périodes)";
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [yy, mm] = period.split("-").map(Number);
    entryWhere.entryDate = { gte: new Date(yy, mm - 1, 1), lt: new Date(yy, mm, 1) };
    periodLabel = `Période ${period}`;
  }

  const lines = await prisma.entryLine.findMany({
    where: { entry: entryWhere },
    select: { accountCode: true, debit: true, credit: true },
  });

  const map = new Map<string, { debit: bigint; credit: bigint }>();
  for (const l of lines) {
    if (cfg.prefix && !l.accountCode.startsWith(cfg.prefix)) continue;
    const key = cfg.mode === "general" ? l.accountCode.slice(0, 4) : l.accountCode;
    const cur = map.get(key) ?? { debit: 0n, credit: 0n };
    cur.debit += BigInt(l.debit);
    cur.credit += BigInt(l.credit);
    map.set(key, cur);
  }

  // Libellés : seulement en auxiliaire (code complet présent au plan comptable).
  const labels = new Map<string, string>();
  if (cfg.mode === "auxiliary" && map.size > 0) {
    const accs = await prisma.chartOfAccounts.findMany({
      where: { tenantId: session.tenantId, code: { in: Array.from(map.keys()) } },
      select: { code: true, name: true },
    });
    for (const a of accs) labels.set(a.code, a.name);
  }

  const rows: BalanceRow[] = Array.from(map.entries())
    .map(([code, v]) => ({
      code,
      label: labels.get(code) ?? null,
      debit: v.debit.toString(),
      credit: v.credit.toString(),
      balance: (v.debit - v.credit).toString(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = rows.reduce((s, r) => s + BigInt(r.debit), 0n);
  const totalCredit = rows.reduce((s, r) => s + BigInt(r.credit), 0n);

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true } });

  const data: AccountingReportData = {
    title: cfg.title,
    periodLabel,
    tenantName: tenant?.name ?? "—",
    generatedAt: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    rows,
    totals: { debit: totalDebit.toString(), credit: totalCredit.toString() },
  };

  try {
    const element = createElement(AccountingReportPDF, { data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${params.type}${period ? `-${period}` : ""}.pdf"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/comptable/reports/:type/pdf]", (err as Error).message);
    return NextResponse.json({ error: "Génération du PDF échouée" }, { status: 500 });
  }
}
