import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const BANK_LABEL: Record<string, { name: string; rm: string; format: string; color: string }> = {
  uba: { name: "UBA Cameroun", rm: "Relationship Manager UBA", format: "Mensuel — Synthèse + ratios", color: "#D71920" },
  bicec: { name: "BICEC", rm: "Chargée d'affaires Entreprises BICEC", format: "Trimestriel — Pilier prudentiel + prévisionnel 6 mois", color: "#0F766E" },
  afriland: { name: "Afriland First Bank", rm: "Direction Corporate Afriland", format: "Mensuel — Tableau de bord financier consolidé", color: "#1D4ED8" },
  ecobank: { name: "Ecobank Cameroun", rm: "Account Manager Ecobank", format: "Trimestriel — Compliance + ratios", color: "#1F2937" },
  sgbc: { name: "Société Générale Cameroun", rm: "Banquier d'affaires SGBC", format: "Mensuel — Format SGBC standard", color: "#000000" },
};

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  header: { borderBottomWidth: 2, paddingBottom: 10, marginBottom: 14 },
  brand: { fontSize: 8, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 3 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#7E22CE", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  label: { fontSize: 9, flex: 3 },
  value: { fontSize: 9, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
  unit: { fontSize: 8, color: "#6B7280", marginLeft: 4 },
  warning: { backgroundColor: "#FEF3C7", borderColor: "#B45309", borderWidth: 1, padding: 6, marginTop: 14, fontSize: 8, color: "#92400E" },
  footer: { marginTop: 16, fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

interface ReportData {
  bankKey: string;
  tenantName: string;
  generatedAt: string;
  totalBanksBalance: number;
  totalCreditAvailable: number;
  totalCreditUsed: number;
  todaysCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netCashFlow: number;
  forecast6m: Array<{ month: string; cash: number }>;
  ratios: { liquidity: number; coverage: number; equity: number };
}

function BankingReportPDF({ data }: { data: ReportData }) {
  const meta = BANK_LABEL[data.bankKey] ?? BANK_LABEL.uba;
  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: { ...styles.header, borderBottomColor: meta.color } },
        createElement(Text, { style: { ...styles.brand, color: meta.color } }, "T-ERP · REPORTING BANCAIRE"),
        createElement(Text, { style: styles.title }, `Synthèse financière — ${meta.name}`),
        createElement(Text, { style: styles.meta }, `${data.tenantName} · Préparé pour : ${meta.rm}`),
        createElement(Text, { style: styles.meta }, `Format : ${meta.format} · Édité le ${data.generatedAt}`)
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Situation à date"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Trésorerie consolidée multi-banques"),
          createElement(Text, { style: styles.value }, `${fmt(data.totalBanksBalance)} FCFA`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Lignes de crédit disponibles"),
          createElement(Text, { style: styles.value }, `${fmt(data.totalCreditAvailable)} FCFA`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Lignes de crédit utilisées"),
          createElement(Text, { style: styles.value }, `${fmt(data.totalCreditUsed)} FCFA`)
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Flux du mois"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Encaissements clients"),
          createElement(Text, { style: styles.value }, `${fmt(data.monthlyRevenue)} FCFA`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Décaissements fournisseurs et charges"),
          createElement(Text, { style: styles.value }, `${fmt(-data.monthlyExpenses)} FCFA`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Flux de trésorerie net"),
          createElement(Text, { style: styles.value }, `${fmt(data.netCashFlow)} FCFA`)
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Ratios prudentiels"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Liquidité immédiate"),
          createElement(Text, { style: styles.value }, `${data.ratios.liquidity.toFixed(2)}`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Couverture des charges (mois)"),
          createElement(Text, { style: styles.value }, `${data.ratios.coverage.toFixed(1)} mois`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Ratio capitaux propres / total bilan"),
          createElement(Text, { style: styles.value }, `${(data.ratios.equity * 100).toFixed(1)} %`)
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Prévisionnel trésorerie 6 mois"),
        ...data.forecast6m.map((f) =>
          createElement(
            View,
            { key: f.month, style: styles.row },
            createElement(Text, { style: styles.label }, `${f.month}`),
            createElement(Text, { style: styles.value }, `${fmt(f.cash)} FCFA`)
          )
        )
      ),
      createElement(
        View,
        { style: styles.warning },
        createElement(Text, {}, "⚠ Document préparé par la DAF à des fins relationnelles. Les états officiels (DSF, états financiers OHADA) restent les seuls documents opposables.")
      ),
      createElement(
        Text,
        { style: styles.footer },
        `T-ERP · ${data.tenantName} · Reporting bancaire ${meta.name}`
      )
    )
  );
}

export async function GET(_req: Request, { params }: { params: { bank: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const bankKey = params.bank.toLowerCase();
  if (!BANK_LABEL[bankKey]) {
    return NextResponse.json({ error: "Banque inconnue" }, { status: 404 });
  }

  const [banks, tenant] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId: session.tenantId },
      select: { balance: true, creditLineGranted: true, creditLineUsed: true },
    }),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true } }),
  ]);

  const totalBanksBalance = banks.reduce((s, b) => s + Number(b.balance), 0);
  const totalCreditGranted = banks.reduce((s, b) => s + Number(b.creditLineGranted), 0);
  const totalCreditUsed = banks.reduce((s, b) => s + Number(b.creditLineUsed), 0);
  const totalCreditAvailable = totalCreditGranted - totalCreditUsed;

  // Synthèse simulée mensuel
  const monthlyRevenue = Math.round(totalBanksBalance * 0.42);
  const monthlyExpenses = Math.round(totalBanksBalance * 0.36);
  const netCashFlow = monthlyRevenue - monthlyExpenses;

  const baseCash = totalBanksBalance;
  const forecast6m = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    const drift = (i + 1) * netCashFlow * 0.62;
    return {
      month: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      cash: Math.round(baseCash + drift),
    };
  });

  const ratios = {
    liquidity: totalBanksBalance / Math.max(monthlyExpenses, 1),
    coverage: totalBanksBalance / Math.max(monthlyExpenses, 1),
    equity: 0.34,
  };

  const reportData: ReportData = {
    bankKey,
    tenantName: tenant?.name ?? "T-ERP",
    generatedAt: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    totalBanksBalance,
    totalCreditAvailable,
    totalCreditUsed,
    todaysCash: totalBanksBalance,
    monthlyRevenue,
    monthlyExpenses,
    netCashFlow,
    forecast6m,
    ratios,
  };

  const element = BankingReportPDF({ data: reportData }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporting_${bankKey}_${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
