import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG];

const STATE_LABEL: Record<string, string> = {
  full: "État complet de paie",
  "wire-order": "Ordre de virement multi-banques",
  dipe: "DIPE CNPS",
  irpp: "État IRPP",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  header: { borderBottomWidth: 2, borderBottomColor: "#A855F7", paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 8, color: "#7E22CE", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 6 },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  warning: { backgroundColor: "#FEF3C7", borderColor: "#B45309", borderWidth: 1, padding: 8, marginBottom: 16, fontSize: 9, color: "#B45309" },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  label: { fontSize: 10, flex: 2 },
  value: { fontSize: 10, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
});

function StatePDF({ stateType, period, tenantName, cycle }: { stateType: string; period: string; tenantName: string; cycle: { totalBulletins: number; grossAmount: string; employerCharges: string; netToPay: string } }) {
  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.brand }, "T-ERP · ÉTAT PAIE"),
        createElement(Text, { style: styles.title }, STATE_LABEL[stateType] ?? stateType),
        createElement(Text, { style: styles.meta }, `${tenantName} · Période ${period}`)
      ),
      createElement(
        View,
        { style: styles.warning },
        createElement(Text, {}, "⚠ V1 BROUILLON — la conformité officielle CNPS / DGI requiert validation expert paie agréé.")
      ),
      createElement(
        View,
        { style: styles.row },
        createElement(Text, { style: styles.label }, "Bulletins"),
        createElement(Text, { style: styles.value }, String(cycle.totalBulletins))
      ),
      createElement(
        View,
        { style: styles.row },
        createElement(Text, { style: styles.label }, "Brut total"),
        createElement(Text, { style: styles.value }, `${new Intl.NumberFormat("fr-FR").format(Number(cycle.grossAmount))} FCFA`)
      ),
      createElement(
        View,
        { style: styles.row },
        createElement(Text, { style: styles.label }, "Charges patronales"),
        createElement(Text, { style: styles.value }, `${new Intl.NumberFormat("fr-FR").format(Number(cycle.employerCharges))} FCFA`)
      ),
      createElement(
        View,
        { style: styles.row },
        createElement(Text, { style: styles.label }, "Net à virer"),
        createElement(Text, { style: styles.value }, `${new Intl.NumberFormat("fr-FR").format(Number(cycle.netToPay))} FCFA`)
      )
    )
  );
}

export async function GET(req: Request, { params }: { params: { period: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const stateType = url.searchParams.get("type") ?? "full";

  const [cycle, tenant] = await Promise.all([
    prisma.payrollCycle.findFirst({ where: { tenantId: session.tenantId, period: params.period } }),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true } }),
  ]);

  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  const element = StatePDF({
    stateType,
    period: params.period,
    tenantName: tenant?.name ?? "—",
    cycle: {
      totalBulletins: cycle.totalBulletins,
      grossAmount: cycle.grossAmount.toString(),
      employerCharges: cycle.employerCharges.toString(),
      netToPay: cycle.netToPay.toString(),
    },
  }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="paie_${params.period}_${stateType}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
