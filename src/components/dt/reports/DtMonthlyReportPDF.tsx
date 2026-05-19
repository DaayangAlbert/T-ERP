import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_OBL = "Helvetica-Oblique";

const C = {
  ink: "#1f2937",
  ink2: "#374151",
  mute: "#6b7280",
  line: "#d1d5db",
  lineSoft: "#e5e7eb",
  bg: "#f8fafc",
  primary: "#5b21b6",
  primarySoft: "#ede9fe",
  ok: "#047857",
  okSoft: "#d1fae5",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
};

function fmtN(n: number | bigint | string): string {
  const v = typeof n === "string" ? Number(n) : typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}
function fmtMoney(n: string | number | bigint): string {
  return `${fmtN(n)} FCFA`;
}
function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(dt);
}
function fmtShortDate(d: string | Date | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
}
function fmtMonth(iso: string): string {
  const s = new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis au DG",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const RISK_LABEL: Record<string, { label: string; color: string }> = {
  LOW: { label: "Faible", color: C.ok },
  MEDIUM: { label: "Moyen", color: C.warn },
  HIGH: { label: "Élevé", color: C.danger },
};

export interface DtReportPdfData {
  id: string;
  reportNumber: number;
  period: string;
  periodLabel: string | null;
  status: string;

  sitesActiveCount: number;
  sitesCompletedCount: number;
  sitesAtRiskCount: number;
  avgPhysicalProgress: number;
  avgFinancialProgress: number;
  totalRevenueXAF: string;
  totalSpentXAF: string;
  portfolioMarginPercent: number;

  hseTotalIncidents: number;
  hseTf1: number;
  hseAuditsConducted: number;
  hseNcOpen: number;

  subcontractorsActive: number;
  subcontractorsAtRisk: number;

  executiveSummary: string | null;
  financialAnalysis: string | null;
  qhseAnalysis: string | null;
  subcontractingAnalysis: string | null;
  majorRisks: string | null;
  technicalDecisions: string | null;
  recommendations: string | null;
  nextMonthOutlook: string | null;

  sites: Array<{
    siteId: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    physicalProgressPercent: number;
    financialProgressPercent: number;
    marginPercent: number;
    revenueMonthXAF: string;
    hseIncidentsCount: number;
    ncOpenCount: number;
    riskLevel: string | null;
    notes: string | null;
  }>;

  author: { name: string; position: string | null };
  validatedBy: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;

  tenant: {
    name: string;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    taxId: string | null;
    logoUrl: string | null;
  };
}

interface Props {
  report: DtReportPdfData;
}

export function DtMonthlyReportPDF({ report }: Props) {
  return (
    <Document
      title={`Rapport mensuel DT — ${report.periodLabel ?? fmtMonth(report.period)}`}
      author={report.author.name}
      subject="Rapport mensuel technique"
    >
      <CoverPage report={report} />
      <BodyPage report={report} />
    </Document>
  );
}

// ============================== COVER ==============================
function CoverPage({ report }: { report: DtReportPdfData }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        {report.tenant.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={report.tenant.logoUrl} style={styles.coverLogo} />
        ) : (
          <View style={styles.coverLogoPlaceholder}>
            <Text style={styles.coverLogoText}>{report.tenant.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.coverTenant}>{report.tenant.name}</Text>
          {report.tenant.contactAddress && <Text style={styles.coverTenantInfo}>{report.tenant.contactAddress}</Text>}
          <Text style={styles.coverTenantInfo}>
            {[report.tenant.contactPhone, report.tenant.contactEmail].filter(Boolean).join(" · ")}
          </Text>
          {report.tenant.taxId && <Text style={styles.coverTenantInfo}>N° Contribuable : {report.tenant.taxId}</Text>}
        </View>
      </View>

      <View style={styles.coverDivider} />

      <View style={styles.coverCenter}>
        <Text style={styles.coverKicker}>RAPPORT MENSUEL TECHNIQUE — DIRECTION TECHNIQUE</Text>
        <Text style={styles.coverTitle}>{report.periodLabel ?? fmtMonth(report.period)}</Text>
        <Text style={styles.coverSubtitle}>Consolidation du portefeuille chantiers</Text>

        <View style={styles.coverPeriodBox}>
          <Text style={styles.coverPeriodLabel}>Vue d&apos;ensemble</Text>
          <Text style={styles.coverPeriodValue}>{report.sitesActiveCount} chantiers actifs · {report.avgPhysicalProgress.toFixed(1)} % avct moyen</Text>
        </View>

        <View style={styles.coverFactsRow}>
          <CoverFact label="N° rapport" value={`#${String(report.reportNumber).padStart(3, "0")}`} />
          <CoverFact label="CA produit (mois)" value={fmtMoney(report.totalRevenueXAF)} />
          <CoverFact label="Marge portefeuille" value={`${report.portfolioMarginPercent.toFixed(1)} %`} />
          <CoverFact label="Incidents HSE" value={String(report.hseTotalIncidents)} />
        </View>
      </View>

      <View style={styles.coverPartiesBox}>
        <Text style={styles.coverPartiesTitle}>Cadrage du portefeuille</Text>
        <View>
          <Party label="Chantiers actifs / terminés / à risque" value={`${report.sitesActiveCount} / ${report.sitesCompletedCount} / ${report.sitesAtRiskCount}`} />
          <Party label="TF1 (taux de fréquence)" value={report.hseTf1.toFixed(2)} />
          <Party label="Audits réalisés / NC ouvertes" value={`${report.hseAuditsConducted} / ${report.hseNcOpen}`} />
          <Party label="Sous-traitants actifs / à risque" value={`${report.subcontractorsActive} / ${report.subcontractorsAtRisk}`} />
          <Party label="Statut du rapport" value={STATUS_LABEL[report.status] ?? report.status} />
        </View>
      </View>

      <View style={styles.coverFooter}>
        <View>
          <Text style={styles.coverFooterLabel}>Établi par</Text>
          <Text style={styles.coverFooterValue}>{report.author.name}</Text>
          <Text style={styles.coverFooterSub}>{report.author.position ?? "Directeur Technique"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.coverFooterLabel}>Émis le</Text>
          <Text style={styles.coverFooterValue}>{fmtDate(report.submittedAt ?? new Date().toISOString())}</Text>
          <Text style={styles.coverFooterSub}>Réf. doc : {report.id.slice(-10).toUpperCase()}</Text>
        </View>
      </View>
    </Page>
  );
}

function CoverFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coverFact}>
      <Text style={styles.coverFactLabel}>{label}</Text>
      <Text style={styles.coverFactValue}>{value}</Text>
    </View>
  );
}
function Party({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.partyRow}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyValue}>{value || "—"}</Text>
    </View>
  );
}

// ============================== BODY ==============================
function BodyPage({ report }: { report: DtReportPdfData }) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View fixed style={styles.runHeader}>
        <Text style={styles.runHeaderL}>{report.tenant.name} · Rapport DT #{String(report.reportNumber).padStart(3, "0")}</Text>
        <Text style={styles.runHeaderR}>{report.periodLabel ?? fmtMonth(report.period)}</Text>
      </View>

      {/* 1 — Synthèse direction */}
      <Section index={1} title="Synthèse direction">
        <ParagraphLines text={report.executiveSummary} placeholder="—" />
      </Section>

      {/* 2 — KPI portefeuille */}
      <Section index={2} title="Indicateurs portefeuille consolidés">
        <Table
          rows={[
            ["Chantiers actifs", String(report.sitesActiveCount)],
            ["Chantiers terminés sur le mois", String(report.sitesCompletedCount)],
            ["Chantiers identifiés à risque", String(report.sitesAtRiskCount)],
            ["Avancement physique moyen", `${report.avgPhysicalProgress.toFixed(1)} %`],
            ["Avancement financier moyen", `${report.avgFinancialProgress.toFixed(1)} %`],
            ["CA produit cumulé du mois", fmtMoney(report.totalRevenueXAF)],
            ["Dépenses cumulées du mois", fmtMoney(report.totalSpentXAF)],
            ["Marge portefeuille", `${report.portfolioMarginPercent.toFixed(1)} %`],
          ]}
        />
      </Section>

      {/* 3 — Tableau chantiers détaillé */}
      <Section index={3} title="Tableau de bord chantiers">
        {report.sites.length === 0 ? (
          <Text style={styles.bodyMute}>Aucun chantier renseigné.</Text>
        ) : (
          <View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 1.4 }]}>Chantier</Text>
              <Text style={[styles.thCell, { width: 45, textAlign: "right" }]}>% phys.</Text>
              <Text style={[styles.thCell, { width: 45, textAlign: "right" }]}>% fin.</Text>
              <Text style={[styles.thCell, { width: 45, textAlign: "right" }]}>Marge</Text>
              <Text style={[styles.thCell, { width: 80, textAlign: "right" }]}>CA mois</Text>
              <Text style={[styles.thCell, { width: 30, textAlign: "right" }]}>HSE</Text>
              <Text style={[styles.thCell, { width: 28, textAlign: "right" }]}>NC</Text>
              <Text style={[styles.thCell, { width: 45, textAlign: "right" }]}>Risque</Text>
            </View>
            {report.sites.map((s, i) => {
              const risk = s.riskLevel ? RISK_LABEL[s.riskLevel] : null;
              return (
                <View
                  key={s.siteId}
                  style={i === report.sites.length - 1 ? [styles.tdRow, styles.tdRowLast] : styles.tdRow}
                >
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.tdCellBold}>{s.code}</Text>
                    <Text style={styles.tdCellMute}>{s.name}</Text>
                  </View>
                  <Text style={[styles.tdCell, { width: 45, textAlign: "right" }]}>{s.physicalProgressPercent.toFixed(1)}</Text>
                  <Text style={[styles.tdCell, { width: 45, textAlign: "right" }]}>{s.financialProgressPercent.toFixed(1)}</Text>
                  <Text
                    style={[
                      styles.tdCell,
                      {
                        width: 45,
                        textAlign: "right",
                        color: s.marginPercent < 0 ? C.danger : s.marginPercent < 5 ? C.warn : C.ink,
                        fontFamily: s.marginPercent < 5 ? FONT_BOLD : FONT,
                      },
                    ]}
                  >
                    {s.marginPercent.toFixed(1)}
                  </Text>
                  <Text style={[styles.tdCell, { width: 80, textAlign: "right" }]}>{fmtN(s.revenueMonthXAF)}</Text>
                  <Text
                    style={[
                      styles.tdCell,
                      {
                        width: 30,
                        textAlign: "right",
                        color: s.hseIncidentsCount > 0 ? C.danger : C.ink,
                        fontFamily: s.hseIncidentsCount > 0 ? FONT_BOLD : FONT,
                      },
                    ]}
                  >
                    {s.hseIncidentsCount}
                  </Text>
                  <Text style={[styles.tdCell, { width: 28, textAlign: "right" }]}>{s.ncOpenCount}</Text>
                  <Text style={[styles.tdCell, { width: 45, textAlign: "right", color: risk?.color ?? C.mute, fontFamily: risk ? FONT_BOLD : FONT_OBL }]}>
                    {risk?.label ?? "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      {/* Sections narratives */}
      <NarrativeSection index={4} title="Analyse financière" text={report.financialAnalysis} />
      <NarrativeSection index={5} title="Analyse QHSE" text={report.qhseAnalysis} />
      <NarrativeSection index={6} title="Sous-traitance &amp; sinistralité" text={report.subcontractingAnalysis} />
      <NarrativeSection index={7} title="Risques majeurs portefeuille" text={report.majorRisks} />
      <NarrativeSection index={8} title="Décisions techniques engagées" text={report.technicalDecisions} />

      {/* Recommandations COMEX — encadré */}
      {report.recommendations && report.recommendations.trim() ? (
        <View style={styles.recoBox} wrap={false}>
          <Text style={styles.recoTitle}>09. RECOMMANDATIONS / ARBITRAGES COMEX</Text>
          <ParagraphLines text={report.recommendations} />
        </View>
      ) : (
        <NarrativeSection index={9} title="Recommandations / arbitrages COMEX" text={null} />
      )}

      <NarrativeSection index={10} title="Vision du mois suivant" text={report.nextMonthOutlook} />

      {report.status === "REJECTED" && report.rejectionReason && (
        <View style={styles.rejectedBox} wrap={false}>
          <Text style={styles.rejectedTitle}>RAPPORT REFUSÉ — Motif du DG</Text>
          <Text style={styles.body}>{report.rejectionReason}</Text>
        </View>
      )}

      <View style={styles.sigWrapper} wrap={false}>
        <Text style={styles.sigTitle}>Cadre de validation</Text>
        <View style={styles.sigGrid}>
          <SigBox
            role="Directeur Technique"
            name={report.author.name}
            date={report.submittedAt ? fmtShortDate(report.submittedAt) : "—"}
            mark="Émetteur"
            dateLabel="Date d'émission"
          />
          <SigBox
            role="Directeur Général"
            name={report.status === "VALIDATED" ? report.validatedBy ?? "—" : "—"}
            date={report.status === "VALIDATED" && report.validatedAt ? fmtShortDate(report.validatedAt) : "—"}
            mark={report.status === "VALIDATED" ? "VISA APPOSÉ" : "À viser"}
            markTone={report.status === "VALIDATED" ? "ok" : "mute"}
            dateLabel="Date du visa"
          />
        </View>
      </View>

      <View fixed style={styles.runFooter}>
        <Text style={styles.runFooterL}>{report.tenant.name}</Text>
        <Text style={styles.runFooterR} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function NarrativeSection({ index, title, text }: { index: number; title: string; text: string | null }) {
  return (
    <Section index={index} title={title}>
      <ParagraphLines text={text} placeholder="—" />
    </Section>
  );
}

function ParagraphLines({ text, placeholder }: { text: string | null; placeholder?: string }) {
  if (!text || !text.trim()) {
    return <Text style={styles.bodyMute}>{placeholder ?? "—"}</Text>;
  }
  return (
    <View>
      {text.split(/\n+/).map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        return <Text key={i} style={styles.body}>{t}</Text>;
      })}
    </View>
  );
}

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionIndex}>{String(index).padStart(2, "0")}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Table({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={styles.table}>
      {rows.map(([label, value], i) => (
        <View key={i} style={i === rows.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}>
          <Text style={styles.tableLabel}>{label}</Text>
          <Text style={styles.tableValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function SigBox({
  role,
  name,
  date,
  mark,
  markTone,
  dateLabel,
}: {
  role: string;
  name: string;
  date: string;
  mark: string;
  markTone?: "ok" | "mute";
  dateLabel: string;
}) {
  const markColor = markTone === "ok" ? C.ok : C.mute;
  return (
    <View style={styles.sigBox}>
      <Text style={styles.sigRole}>{role}</Text>
      <Text style={styles.sigName}>{name}</Text>
      <View style={styles.sigArea} />
      <View style={styles.sigMetaRow}>
        <Text style={styles.sigMeta}>{dateLabel} : {date}</Text>
        <Text style={{ ...styles.sigMark, color: markColor }}>{mark}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverPage: { padding: 50, paddingBottom: 60, fontFamily: FONT, color: C.ink, fontSize: 10 },
  coverHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
  coverLogo: { width: 56, height: 56, objectFit: "contain" },
  coverLogoPlaceholder: { width: 56, height: 56, backgroundColor: C.primary, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  coverLogoText: { color: "white", fontSize: 28, fontFamily: FONT_BOLD },
  coverTenant: { fontSize: 13, fontFamily: FONT_BOLD, color: C.ink, marginBottom: 1 },
  coverTenantInfo: { fontSize: 9, color: C.mute, lineHeight: 1.4 },
  coverDivider: { marginTop: 18, height: 2, backgroundColor: C.primary },
  coverCenter: { marginTop: 60, alignItems: "center" },
  coverKicker: { fontSize: 11, color: C.primary, letterSpacing: 2, fontFamily: FONT_BOLD, marginBottom: 18, textAlign: "center" },
  coverTitle: { fontSize: 28, fontFamily: FONT_BOLD, color: C.ink, textAlign: "center", marginBottom: 4 },
  coverSubtitle: { fontSize: 13, color: C.mute, marginBottom: 26 },
  coverPeriodBox: { backgroundColor: C.primarySoft, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 3, marginBottom: 22, alignItems: "center" },
  coverPeriodLabel: { fontSize: 9, color: C.primary, letterSpacing: 1.5, marginBottom: 4 },
  coverPeriodValue: { fontSize: 14, fontFamily: FONT_BOLD, color: C.primary },
  coverFactsRow: { flexDirection: "row", gap: 8, width: "100%", marginTop: 4 },
  coverFact: { flex: 1, borderWidth: 0.5, borderColor: C.line, padding: 8, alignItems: "center" },
  coverFactLabel: { fontSize: 7.5, color: C.mute, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  coverFactValue: { fontSize: 11, fontFamily: FONT_BOLD, color: C.ink, textAlign: "center" },
  coverPartiesBox: { marginTop: 36, borderWidth: 0.7, borderColor: C.line, padding: 14 },
  coverPartiesTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  partyRow: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 0.3, borderTopColor: C.lineSoft },
  partyLabel: { width: 240, fontSize: 9.5, color: C.mute },
  partyValue: { flex: 1, fontSize: 9.5, color: C.ink, fontFamily: FONT_BOLD },
  coverFooter: { marginTop: "auto", paddingTop: 26, borderTopWidth: 0.7, borderTopColor: C.line, flexDirection: "row", justifyContent: "space-between" },
  coverFooterLabel: { fontSize: 8, color: C.mute, textTransform: "uppercase", letterSpacing: 0.7 },
  coverFooterValue: { fontSize: 11, fontFamily: FONT_BOLD, color: C.ink, marginTop: 2 },
  coverFooterSub: { fontSize: 9, color: C.mute, marginTop: 1 },

  page: { paddingTop: 60, paddingBottom: 50, paddingHorizontal: 45, fontFamily: FONT, color: C.ink, fontSize: 10 },
  runHeader: { position: "absolute", top: 24, left: 45, right: 45, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 6 },
  runHeaderL: { fontSize: 8.5, color: C.mute, fontFamily: FONT_BOLD },
  runHeaderR: { fontSize: 8.5, color: C.mute },
  runFooter: { position: "absolute", bottom: 24, left: 45, right: 45, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 6 },
  runFooterL: { fontSize: 8, color: C.mute },
  runFooterR: { fontSize: 8, color: C.mute },

  section: { marginBottom: 14 },
  sectionTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8, borderBottomWidth: 0.5, borderBottomColor: C.primary, paddingBottom: 3, marginBottom: 6 },
  sectionIndex: { fontSize: 10, fontFamily: FONT_BOLD, color: C.primary, letterSpacing: 1 },
  sectionTitle: { fontSize: 11.5, fontFamily: FONT_BOLD, color: C.ink, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionBody: {},
  body: { fontSize: 10, color: C.ink2, lineHeight: 1.55, marginBottom: 3 },
  bodyMute: { fontSize: 10, color: C.mute, fontFamily: FONT_OBL, lineHeight: 1.5 },

  table: { borderWidth: 0.5, borderColor: C.line, marginVertical: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.lineSoft, paddingVertical: 5, paddingHorizontal: 8 },
  tableRowLast: { borderBottomWidth: 0 },
  tableLabel: { flex: 1, fontSize: 9.5, color: C.ink2 },
  tableValue: { width: 200, fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink, textAlign: "right" },

  tableHeaderRow: { flexDirection: "row", backgroundColor: C.bg, paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.7, borderBottomColor: C.line },
  thCell: { fontSize: 8, fontFamily: FONT_BOLD, color: C.mute, textTransform: "uppercase", letterSpacing: 0.3 },
  tdRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft, alignItems: "center" },
  tdRowLast: { borderBottomWidth: 0.7, borderBottomColor: C.line },
  tdCell: { fontSize: 9, color: C.ink2 },
  tdCellBold: { fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink },
  tdCellMute: { fontSize: 8.5, color: C.mute },

  recoBox: { marginBottom: 14, padding: 10, borderLeftWidth: 3, borderLeftColor: C.warn, backgroundColor: C.warnSoft },
  recoTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.warn, marginBottom: 6, letterSpacing: 0.5 },

  rejectedBox: { marginTop: 14, padding: 10, borderLeftWidth: 3, borderLeftColor: C.danger, backgroundColor: C.dangerSoft },
  rejectedTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.danger, marginBottom: 4, letterSpacing: 0.5 },

  sigWrapper: { marginTop: 18 },
  sigTitle: { fontSize: 11, fontFamily: FONT_BOLD, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: C.primary },
  sigGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sigBox: { width: "48%", borderWidth: 0.5, borderColor: C.line, padding: 8 },
  sigRole: { fontSize: 9, fontFamily: FONT_BOLD, color: C.ink, textTransform: "uppercase", letterSpacing: 0.5 },
  sigName: { fontSize: 10, color: C.ink2, marginTop: 2 },
  sigArea: { marginTop: 8, height: 52, borderWidth: 0.5, borderColor: C.lineSoft, borderStyle: "dashed" },
  sigMetaRow: { marginTop: 5, flexDirection: "row", justifyContent: "space-between" },
  sigMeta: { fontSize: 8, color: C.mute },
  sigMark: { fontSize: 8, fontFamily: FONT_BOLD, letterSpacing: 0.4 },
});
