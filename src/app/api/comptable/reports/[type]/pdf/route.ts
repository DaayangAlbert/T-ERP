import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { AccountingReportPDF, type AccountingReportData, type BalanceRow } from "@/components/comptable/reports/AccountingReportPDF";
import { ProfitLossReportPDF, type ProfitLossData, type PnLAccountRow, type BilanRow } from "@/components/comptable/reports/ProfitLossReportPDF";

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

  // Compte de résultat (P&L) : classes 6 (charges) et 7 (produits).
  if (params.type === "CPT_MONTHLY_SYNTHESIS") {
    return renderProfitLoss(session.tenantId, entryWhere, period, periodLabel, params.type);
  }

  const cfg = BALANCE_REPORTS[params.type];
  if (!cfg) {
    return NextResponse.json({ error: "Ce rapport n'est pas encore disponible en PDF." }, { status: 400 });
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

async function renderProfitLoss(
  tenantId: string,
  entryWhere: Record<string, unknown>,
  period: string | null,
  periodLabel: string,
  reportType: string,
) {
  const lines = await prisma.entryLine.findMany({
    where: { entry: entryWhere, OR: [{ accountCode: { startsWith: "6" } }, { accountCode: { startsWith: "7" } }] },
    select: { accountCode: true, debit: true, credit: true },
  });

  // Agrégation par sous-compte (4 chiffres).
  const charges = new Map<string, bigint>();
  const produits = new Map<string, bigint>();
  for (const l of lines) {
    const key = l.accountCode.slice(0, 4);
    const amt = l.accountCode.startsWith("6")
      ? BigInt(l.debit) - BigInt(l.credit) // charge = solde débiteur
      : BigInt(l.credit) - BigInt(l.debit); // produit = solde créditeur
    const map = l.accountCode.startsWith("6") ? charges : produits;
    map.set(key, (map.get(key) ?? 0n) + amt);
  }

  // Libellés depuis le plan comptable (préfixe match : on prend le 1er match).
  const allCodes = Array.from(new Set([...charges.keys(), ...produits.keys()]));
  const labels = new Map<string, string>();
  if (allCodes.length > 0) {
    const accs = await prisma.chartOfAccounts.findMany({
      where: { tenantId, OR: allCodes.map((c) => ({ code: { startsWith: c } })) },
      select: { code: true, name: true },
    });
    for (const a of accs) {
      const key = a.code.slice(0, 4);
      if (!labels.has(key)) labels.set(key, a.name);
    }
  }

  const toRows = (m: Map<string, bigint>): PnLAccountRow[] =>
    Array.from(m.entries())
      .filter(([, v]) => v !== 0n)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, v]) => ({ code, label: labels.get(code) ?? null, amount: v.toString() }));

  const chargesRows = toRows(charges);
  const produitsRows = toRows(produits);
  const totalCharges = chargesRows.reduce((s, r) => s + BigInt(r.amount), 0n);
  const totalProduits = produitsRows.reduce((s, r) => s + BigInt(r.amount), 0n);

  // --- Bilan provisoire (classes 1 à 5) ---
  const bilanLines = await prisma.entryLine.findMany({
    where: {
      entry: entryWhere,
      OR: [
        { accountCode: { startsWith: "1" } },
        { accountCode: { startsWith: "2" } },
        { accountCode: { startsWith: "3" } },
        { accountCode: { startsWith: "4" } },
        { accountCode: { startsWith: "5" } },
      ],
    },
    select: { accountCode: true, debit: true, credit: true },
  });

  const balByAccount = new Map<string, { cls: string; bal: bigint }>();
  for (const l of bilanLines) {
    const key = l.accountCode.slice(0, 4);
    const cls = l.accountCode.slice(0, 1);
    const cur = balByAccount.get(key) ?? { cls, bal: 0n };
    cur.bal += BigInt(l.debit) - BigInt(l.credit);
    balByAccount.set(key, cur);
  }

  // Libellés pour les comptes du bilan (premier match par préfixe 4 chiffres).
  const bilanCodes = Array.from(balByAccount.keys());
  const bilanLabels = new Map<string, string>();
  if (bilanCodes.length > 0) {
    const accs = await prisma.chartOfAccounts.findMany({
      where: { tenantId, OR: bilanCodes.map((c) => ({ code: { startsWith: c } })) },
      select: { code: true, name: true },
    });
    for (const a of accs) {
      const k = a.code.slice(0, 4);
      if (!bilanLabels.has(k)) bilanLabels.set(k, a.name);
    }
  }

  const immobilisations: BilanRow[] = [];
  const stocks: BilanRow[] = [];
  const creances: BilanRow[] = [];
  const tresorerieA: BilanRow[] = [];
  const capitaux: BilanRow[] = [];
  const dettes: BilanRow[] = [];
  const decouverts: BilanRow[] = [];

  for (const [code, { cls, bal }] of balByAccount) {
    if (bal === 0n) continue;
    const label = bilanLabels.get(code) ?? null;
    const abs = bal < 0n ? -bal : bal;
    const row: BilanRow = { code, label, amount: abs.toString() };
    if (cls === "2" && bal > 0n) immobilisations.push(row);
    else if (cls === "3" && bal > 0n) stocks.push(row);
    else if (cls === "4") (bal > 0n ? creances : dettes).push(row);
    else if (cls === "5") (bal > 0n ? tresorerieA : decouverts).push(row);
    else if (cls === "1" && bal < 0n) capitaux.push(row);
    // class 1 solde débiteur (anormal) ou class 2/3 solde créditeur (anormal) → ignorés.
  }

  const sumRows = (rows: BilanRow[]) => rows.reduce((s, r) => s + BigInt(r.amount), 0n);
  const resultat = totalProduits - totalCharges;
  const totalActif = sumRows(immobilisations) + sumRows(stocks) + sumRows(creances) + sumRows(tresorerieA);
  const totalPassif = sumRows(capitaux) + resultat + sumRows(dettes) + sumRows(decouverts);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  const data: ProfitLossData = {
    title: "Compte de résultat",
    periodLabel,
    tenantName: tenant?.name ?? "—",
    generatedAt: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    charges: chargesRows,
    produits: produitsRows,
    totalCharges: totalCharges.toString(),
    totalProduits: totalProduits.toString(),
    bilan: {
      actif: {
        immobilisations: immobilisations.sort((a, b) => a.code.localeCompare(b.code)),
        stocks: stocks.sort((a, b) => a.code.localeCompare(b.code)),
        creances: creances.sort((a, b) => a.code.localeCompare(b.code)),
        tresorerie: tresorerieA.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalActif.toString(),
      },
      passif: {
        capitaux: capitaux.sort((a, b) => a.code.localeCompare(b.code)),
        resultat: resultat.toString(),
        dettes: dettes.sort((a, b) => a.code.localeCompare(b.code)),
        decouverts: decouverts.sort((a, b) => a.code.localeCompare(b.code)),
        total: totalPassif.toString(),
      },
    },
  };

  try {
    const element = createElement(ProfitLossReportPDF, { data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${reportType}${period ? `-${period}` : ""}.pdf"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/comptable/reports/CPT_MONTHLY_SYNTHESIS/pdf]", (err as Error).message);
    return NextResponse.json({ error: "Génération du PDF échouée" }, { status: 500 });
  }
}
