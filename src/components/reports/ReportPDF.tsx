/**
 * Template PDF des rapports stratégiques (Phase 2 / fn 2.2).
 * Layout multi-pages avec en-tête, KPIs, tables, footer signataire.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportSnapshot } from "@/lib/report-generator";
import { REPORT_TYPE_LABEL } from "@/lib/report-blocks";

interface Props {
  report: {
    type: string;
    title: string;
    period: string;
    tenantName: string;
    authorName: string;
    signature?: string | null;
    blocks: string[];
    data: ReportSnapshot;
    generatedAt: string;
  };
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  header: { borderBottomWidth: 2, borderBottomColor: "#A855F7", paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 8, color: "#7E22CE", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "bold", color: "#1F2A3D", marginTop: 4 },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#7E22CE", textTransform: "uppercase", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kpiCard: { width: "48%", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 4, padding: 8, marginBottom: 6 },
  kpiLabel: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", fontWeight: "bold" },
  kpiValue: { fontSize: 16, color: "#1F2A3D", fontWeight: "bold", marginTop: 2 },
  table: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 4, marginTop: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 5, paddingHorizontal: 8 },
  tableHead: { backgroundColor: "#F9FAFB", fontWeight: "bold", fontSize: 8, color: "#6B7280", textTransform: "uppercase" },
  tableCell: { fontSize: 9, color: "#1F2A3D" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#9CA3AF", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  paragraph: { fontSize: 10, lineHeight: 1.5, color: "#374151", marginBottom: 8 },
});

function fmtFCFA(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2).replace(".", ",")} Md FCFA`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(".", ",")} M FCFA`;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function ReportPDF({ report }: Props) {
  const blocks = new Set(report.blocks);
  const data = report.data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>T-ERP · {REPORT_TYPE_LABEL[report.type] ?? report.type}</Text>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.meta}>
            {report.tenantName} · Période {report.period} · Généré par {report.authorName}
          </Text>
        </View>

        {(blocks.has("kpi.revenue") || blocks.has("kpi.margin") || blocks.has("kpi.treasury") || blocks.has("kpi.backlog") || blocks.has("kpi.headcount") || blocks.has("kpi.activeSites")) && (
          <>
            <Text style={styles.sectionTitle}>Indicateurs clés</Text>
            <View style={styles.kpiGrid}>
              {blocks.has("kpi.revenue") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Chiffre d'affaires</Text>
                  <Text style={styles.kpiValue}>{fmtFCFA(data.kpis.revenue)}</Text>
                </View>
              )}
              {blocks.has("kpi.margin") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Marge consolidée</Text>
                  <Text style={styles.kpiValue}>{data.kpis.margin.toFixed(1).replace(".", ",")} %</Text>
                </View>
              )}
              {blocks.has("kpi.treasury") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Trésorerie</Text>
                  <Text style={styles.kpiValue}>{fmtFCFA(data.kpis.treasury)}</Text>
                </View>
              )}
              {blocks.has("kpi.backlog") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Carnet de commandes</Text>
                  <Text style={styles.kpiValue}>{fmtFCFA(data.kpis.backlog)}</Text>
                </View>
              )}
              {blocks.has("kpi.headcount") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Effectif total</Text>
                  <Text style={styles.kpiValue}>{data.kpis.headcount}</Text>
                </View>
              )}
              {blocks.has("kpi.activeSites") && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Chantiers actifs</Text>
                  <Text style={styles.kpiValue}>{data.kpis.activeSites}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {blocks.has("text.summary") && (
          <>
            <Text style={styles.sectionTitle}>Synthèse exécutive</Text>
            <Text style={styles.paragraph}>
              Le chiffre d'affaires consolidé s'établit à {fmtFCFA(data.kpis.revenue)} sur la période, avec une
              marge moyenne de {data.kpis.margin.toFixed(1).replace(".", ",")} %. {data.kpis.activeSites}{" "}
              chantiers sont actifs et la trésorerie disponible se situe à {fmtFCFA(data.kpis.treasury)}.
              L'activité reste dynamique, le carnet de commandes représentant {fmtFCFA(data.kpis.backlog)}
              de revenus à venir.
            </Text>
          </>
        )}

        {blocks.has("table.top_sites") && data.topSites.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top 5 chantiers</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>Code</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Libellé</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>Avancement</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>Marge</Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>Budget</Text>
              </View>
              {data.topSites.map((s) => (
                <View key={s.code} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.code}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{s.name}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{s.progress} %</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{s.margin} %</Text>
                  <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>
                    {fmtFCFA(Number(s.budget))}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text>{report.tenantName} — Document confidentiel</Text>
          <Text>Édité le {new Date(report.generatedAt).toLocaleDateString("fr-FR")}</Text>
        </View>
      </Page>

      {(blocks.has("table.subsidiaries") || blocks.has("text.actions")) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>T-ERP · suite</Text>
            <Text style={styles.title}>{report.title}</Text>
            <Text style={styles.meta}>Page 2 — Détails</Text>
          </View>

          {blocks.has("table.subsidiaries") && data.subsidiaries.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Comparatif filiales</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Filiale</Text>
                  <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>CA</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>Marge</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>Chantiers</Text>
                </View>
                {data.subsidiaries.map((s) => (
                  <View key={s.name} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{s.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right" }]}>{fmtFCFA(s.revenue)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{s.margin} %</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{s.sites}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {blocks.has("text.actions") && (
            <>
              <Text style={styles.sectionTitle}>Plan d'actions</Text>
              <Text style={styles.paragraph}>
                — Suivi rapproché des chantiers en dérive : revue mensuelle avec les directeurs de travaux.
              </Text>
              <Text style={styles.paragraph}>
                — Trésorerie : accélérer le recouvrement des créances marché public ({"> "}60 jours d'encours).
              </Text>
              <Text style={styles.paragraph}>
                — Renforcer le carnet de commandes : 3 appels d'offres prioritaires identifiés ce trimestre.
              </Text>
            </>
          )}

          {report.signature && (
            <View style={{ marginTop: 30 }}>
              <Text style={{ fontSize: 9, color: "#6B7280" }}>Signataire :</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 4 }}>{report.signature}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text>{report.tenantName} — Document confidentiel</Text>
            <Text>Édité le {new Date(report.generatedAt).toLocaleDateString("fr-FR")}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
