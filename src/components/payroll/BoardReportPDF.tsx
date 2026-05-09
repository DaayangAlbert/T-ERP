import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BoardReportData } from "@/lib/board-report-generator";

interface Props {
  report: {
    period: string;
    boardDate: string;
    type: string;
    tenantName: string;
    authorName: string;
    chapters: Record<string, boolean>;
    comments: Record<string, string>;
    data: BoardReportData;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1F2A3D",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottom: "2pt solid #A855F7",
  },
  brand: { color: "#7E22CE", fontSize: 9, fontWeight: 700, letterSpacing: 1.2 },
  title: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 4 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#7E22CE",
    marginTop: 12,
    marginBottom: 6,
  },

  // KPI grid 2x2
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kpiCard: {
    width: "48%",
    border: "1pt solid #E5E7EB",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  kpiLabel: { fontSize: 8, color: "#6B7280", textTransform: "uppercase" },
  kpiValue: { fontSize: 16, fontWeight: 700, marginTop: 2 },
  kpiUnit: { fontSize: 9, color: "#6B7280" },

  table: { borderTop: "1pt solid #E5E7EB", marginTop: 4 },
  tr: {
    flexDirection: "row",
    borderBottom: "1pt solid #E5E7EB",
    paddingVertical: 4,
  },
  th: { fontWeight: 700, fontSize: 9, color: "#6B7280" },
  td: { fontSize: 9 },
  cCode: { width: "16%" },
  cName: { width: "44%" },
  cProgress: { width: "12%", textAlign: "right" },
  cMargin: { width: "12%", textAlign: "right" },
  cBudget: { width: "16%", textAlign: "right" },

  comment: {
    backgroundColor: "#FAF5FF",
    borderLeft: "2pt solid #A855F7",
    padding: 6,
    marginVertical: 4,
    fontSize: 9,
    color: "#1F2A3D",
  },

  riskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2,
  },
  riskBullet: { color: "#B91C1C", fontWeight: 700, marginRight: 4, fontSize: 11 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9CA3AF",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #E5E7EB",
    paddingTop: 6,
  },
});

function fmtCFA(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} Md FCFA`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} M FCFA`;
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

const TYPE_LABEL: Record<string, string> = {
  MONTHLY: "mensuel",
  QUARTERLY: "trimestriel",
  ANNUAL: "annuel",
  EXTRAORDINARY: "extraordinaire",
};

export function BoardReportPDF({ report }: Props) {
  const { data, comments, chapters } = report;
  const boardDateLabel = new Date(report.boardDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fileNote = `Rapport ${TYPE_LABEL[report.type] ?? report.type} · Période ${report.period} · CA du ${boardDateLabel}`;

  return (
    <Document title={`Reporting CA ${report.tenantName} ${report.period}`} author={report.authorName}>
      {/* Page 1 — Synthèse + KPIs */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>T-ERP · REPORTING CONSEIL D'ADMINISTRATION</Text>
          <Text style={styles.title}>{report.tenantName}</Text>
          <Text style={styles.meta}>{fileNote}</Text>
          <Text style={styles.meta}>Auteur : {report.authorName}</Text>
        </View>

        {chapters.synthesis !== false && (
          <>
            <Text style={styles.sectionTitle}>Synthèse exécutive</Text>
            <View style={styles.comment}>
              <Text>{comments.synthesis || "—"}</Text>
            </View>
          </>
        )}

        {chapters.financial !== false && (
          <>
            <Text style={styles.sectionTitle}>Performance financière</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Chiffre d'affaires</Text>
                <Text style={styles.kpiValue}>{fmtCFA(data.kpis.revenue)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Marge consolidée</Text>
                <Text style={styles.kpiValue}>{data.kpis.margin.toFixed(1).replace(".", ",")} %</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Trésorerie</Text>
                <Text style={styles.kpiValue}>{fmtCFA(data.kpis.treasury)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Carnet de commandes</Text>
                <Text style={styles.kpiValue}>{fmtCFA(data.kpis.backlog)}</Text>
              </View>
            </View>
            {comments.financial && (
              <View style={styles.comment}>
                <Text>{comments.financial}</Text>
              </View>
            )}
          </>
        )}

        {chapters.operational !== false && (
          <>
            <Text style={styles.sectionTitle}>Performance opérationnelle — Top chantiers</Text>
            <View style={styles.table}>
              <View style={[styles.tr, { backgroundColor: "#F9FAFB" }]}>
                <Text style={[styles.th, styles.cCode]}>Code</Text>
                <Text style={[styles.th, styles.cName]}>Libellé</Text>
                <Text style={[styles.th, styles.cProgress]}>Avanc.</Text>
                <Text style={[styles.th, styles.cMargin]}>Marge</Text>
                <Text style={[styles.th, styles.cBudget]}>Budget</Text>
              </View>
              {data.topSites.map((s) => (
                <View key={s.code} style={styles.tr}>
                  <Text style={[styles.td, styles.cCode]}>{s.code}</Text>
                  <Text style={[styles.td, styles.cName]}>{s.name}</Text>
                  <Text style={[styles.td, styles.cProgress]}>{s.progress} %</Text>
                  <Text style={[styles.td, styles.cMargin]}>
                    {s.margin.toFixed(1).replace(".", ",")} %
                  </Text>
                  <Text style={[styles.td, styles.cBudget]}>{fmtCFA(Number(s.budget))}</Text>
                </View>
              ))}
            </View>
            {comments.operational && (
              <View style={styles.comment}>
                <Text>{comments.operational}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text>Confidentiel — usage interne CA</Text>
          <Text>Page 1 / 2 · Généré le {new Date(data.generatedAt).toLocaleDateString("fr-FR")}</Text>
        </View>
      </Page>

      {/* Page 2 — RH, stratégique, risques, perspectives */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>T-ERP · REPORTING CA — SUITE</Text>
          <Text style={styles.title}>{report.tenantName} — {report.period}</Text>
        </View>

        {chapters.hr !== false && (
          <>
            <Text style={styles.sectionTitle}>Ressources humaines</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Effectif total</Text>
                <Text style={styles.kpiValue}>{data.hr.headcount}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Permanents / temporaires</Text>
                <Text style={styles.kpiValue}>
                  {data.hr.permanentCount} / {data.hr.temporaryCount}
                </Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Masse salariale mensuelle moy.</Text>
                <Text style={styles.kpiValue}>{fmtCFA(data.hr.salaryMassMonthly)}</Text>
              </View>
            </View>
            {comments.hr && (
              <View style={styles.comment}>
                <Text>{comments.hr}</Text>
              </View>
            )}
          </>
        )}

        {chapters.strategic !== false && (
          <>
            <Text style={styles.sectionTitle}>Projets stratégiques — Avancement objectifs</Text>
            <View style={styles.table}>
              <View style={[styles.tr, { backgroundColor: "#F9FAFB" }]}>
                <Text style={[styles.th, { width: "60%" }]}>Objectif</Text>
                <Text style={[styles.th, { width: "20%" }]}>Catégorie</Text>
                <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Avancement</Text>
              </View>
              {data.strategic.objectives.map((o) => (
                <View key={o.title} style={styles.tr}>
                  <Text style={[styles.td, { width: "60%" }]}>{o.title}</Text>
                  <Text style={[styles.td, { width: "20%" }]}>{o.category}</Text>
                  <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{o.progress} %</Text>
                </View>
              ))}
            </View>
            {comments.strategic && (
              <View style={styles.comment}>
                <Text>{comments.strategic}</Text>
              </View>
            )}
          </>
        )}

        {chapters.risks !== false && (
          <>
            <Text style={styles.sectionTitle}>Risques identifiés</Text>
            {data.risks.length === 0 ? (
              <Text style={styles.td}>Aucun risque significatif identifié.</Text>
            ) : (
              data.risks.map((r, i) => (
                <View key={i} style={styles.riskItem}>
                  <Text style={styles.riskBullet}>!</Text>
                  <Text style={styles.td}>{r}</Text>
                </View>
              ))
            )}
            {comments.risks && (
              <View style={styles.comment}>
                <Text>{comments.risks}</Text>
              </View>
            )}
          </>
        )}

        {chapters.outlook !== false && (
          <>
            <Text style={styles.sectionTitle}>Perspectives et plan d'action</Text>
            <View style={styles.comment}>
              <Text>{comments.outlook || "À détailler par le DG."}</Text>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text>Confidentiel — usage interne CA</Text>
          <Text>Page 2 / 2 · CA du {boardDateLabel}</Text>
        </View>
      </Page>
    </Document>
  );
}
