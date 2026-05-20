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
function fmtMoney(n: string | number | bigint): string { return `${fmtN(n)} FCFA`; }
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

export interface DtravReportPdfData {
  id: string;
  reportNumber: number;
  period: string;
  periodLabel: string | null;
  status: string;

  revenueProducedXAF: string;
  revenueDeliveredXAF: string;
  marginPercent: number;
  sitesDelivered: number;

  receivablesXAF: string;
  overdueReceivablesXAF: string;
  dso: number;
  decompteIssuedCount: number;
  decompteIssuedXAF: string;

  amendmentsCount: number;
  penaltiesAppliedXAF: string;
  litigationsOpen: number;

  cdtCount: number;
  cdtReportsValidated: number;
  cdtUnderperforming: number;

  workforceTotal: number;
  workforceOvertimeHours: number;
  workforceCostXAF: string;

  executiveSummary: string | null;
  productionAnalysis: string | null;
  collectionsAnalysis: string | null;
  contractualSituation: string | null;
  cdtPerformance: string | null;
  workforceAnalysis: string | null;
  majorIssues: string | null;
  arbitragesRequested: string | null;
  nextMonthStrategy: string | null;

  author: { name: string; position: string | null };
  validatedBy: string | null;
  validatedByPosition?: string | null;
  validatedBySignatureUrl?: string | null;
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
    stampImageUrl?: string | null;
  };
}

export function DtravMonthlyReportPDF({ report }: { report: DtravReportPdfData }) {
  return (
    <Document
      title={`Rapport mensuel DTrav — ${report.periodLabel ?? fmtMonth(report.period)}`}
      author={report.author.name}
      subject="Rapport mensuel directeur travaux"
    >
      <CoverPage report={report} />
      <BodyPage report={report} />
    </Document>
  );
}

function CoverPage({ report }: { report: DtravReportPdfData }) {
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
          <Text style={styles.coverTenantInfo}>{[report.tenant.contactPhone, report.tenant.contactEmail].filter(Boolean).join(" · ")}</Text>
          {report.tenant.taxId && <Text style={styles.coverTenantInfo}>N° Contribuable : {report.tenant.taxId}</Text>}
        </View>
      </View>

      <View style={styles.coverDivider} />

      <View style={styles.coverCenter}>
        <Text style={styles.coverKicker}>RAPPORT MENSUEL — DIRECTION DES TRAVAUX</Text>
        <Text style={styles.coverTitle}>{report.periodLabel ?? fmtMonth(report.period)}</Text>
        <Text style={styles.coverSubtitle}>Synthèse production · recouvrement · CDT</Text>

        <View style={styles.coverFactsRow}>
          <CoverFact label="N° rapport" value={`#${String(report.reportNumber).padStart(3, "0")}`} />
          <CoverFact label="CA produit" value={fmtMoney(report.revenueProducedXAF)} />
          <CoverFact label="Marge" value={`${report.marginPercent.toFixed(1)} %`} />
          <CoverFact label="Encours client" value={fmtMoney(report.receivablesXAF)} />
        </View>
      </View>

      <View style={styles.coverPartiesBox}>
        <Text style={styles.coverPartiesTitle}>Cadrage du mois</Text>
        <Party label="Chantiers livrés" value={String(report.sitesDelivered)} />
        <Party label="Décomptes émis (nb / montant)" value={`${report.decompteIssuedCount} / ${fmtMoney(report.decompteIssuedXAF)}`} />
        <Party label="DSO moyen" value={`${report.dso} jours`} />
        <Party label="CDT supervisés / rapports validés" value={`${report.cdtCount} / ${report.cdtReportsValidated}`} />
        <Party label="Effectif / heures sup." value={`${report.workforceTotal} / ${report.workforceOvertimeHours.toFixed(0)} h`} />
        <Party label="Statut" value={STATUS_LABEL[report.status] ?? report.status} />
      </View>

      <View style={styles.coverFooter}>
        <View>
          <Text style={styles.coverFooterLabel}>Établi par</Text>
          <Text style={styles.coverFooterValue}>{report.author.name}</Text>
          <Text style={styles.coverFooterSub}>{report.author.position ?? "Directeur de Travaux"}</Text>
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
  return (<View style={styles.coverFact}><Text style={styles.coverFactLabel}>{label}</Text><Text style={styles.coverFactValue}>{value}</Text></View>);
}
function Party({ label, value }: { label: string; value: string }) {
  return (<View style={styles.partyRow}><Text style={styles.partyLabel}>{label}</Text><Text style={styles.partyValue}>{value || "—"}</Text></View>);
}

function BodyPage({ report }: { report: DtravReportPdfData }) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View fixed style={styles.runHeader}>
        <Text style={styles.runHeaderL}>{report.tenant.name} · Rapport DTrav #{String(report.reportNumber).padStart(3, "0")}</Text>
        <Text style={styles.runHeaderR}>{report.periodLabel ?? fmtMonth(report.period)}</Text>
      </View>

      <Section index={1} title="Synthèse direction">
        <ParagraphLines text={report.executiveSummary} placeholder="—" />
      </Section>

      <Section index={2} title="Production">
        <Table rows={[
          ["CA produit", fmtMoney(report.revenueProducedXAF)],
          ["CA livré", fmtMoney(report.revenueDeliveredXAF)],
          ["Marge", `${report.marginPercent.toFixed(1)} %`],
          ["Chantiers livrés sur le mois", String(report.sitesDelivered)],
        ]} />
        <View style={{ marginTop: 6 }}><ParagraphLines text={report.productionAnalysis} placeholder="" /></View>
      </Section>

      <Section index={3} title="Recouvrement">
        <Table rows={[
          ["Encours client", fmtMoney(report.receivablesXAF)],
          ["Créances en retard", fmtMoney(report.overdueReceivablesXAF)],
          ["DSO (jours moyen recouvrement)", `${report.dso} j`],
          ["Décomptes émis (nb)", String(report.decompteIssuedCount)],
          ["Décomptes émis (montant)", fmtMoney(report.decompteIssuedXAF)],
        ]} />
        <View style={{ marginTop: 6 }}><ParagraphLines text={report.collectionsAnalysis} placeholder="" /></View>
      </Section>

      <Section index={4} title="Situation contractuelle">
        <Table rows={[
          ["Avenants signés", String(report.amendmentsCount)],
          ["Pénalités appliquées", fmtMoney(report.penaltiesAppliedXAF)],
          ["Litiges ouverts", String(report.litigationsOpen)],
        ]} />
        <View style={{ marginTop: 6 }}><ParagraphLines text={report.contractualSituation} placeholder="" /></View>
      </Section>

      <Section index={5} title="Performance équipes CDT">
        <Table rows={[
          ["CDT supervisés", String(report.cdtCount)],
          ["Rapports CDT validés sur le mois", String(report.cdtReportsValidated)],
          ["CDT sous-performants", String(report.cdtUnderperforming)],
        ]} />
        <View style={{ marginTop: 6 }}><ParagraphLines text={report.cdtPerformance} placeholder="" /></View>
      </Section>

      <Section index={6} title="Effectifs et coûts main d'œuvre">
        <Table rows={[
          ["Effectif total", String(report.workforceTotal)],
          ["Heures supplémentaires totales", `${report.workforceOvertimeHours.toFixed(1)} h`],
          ["Coût total main d'œuvre", fmtMoney(report.workforceCostXAF)],
        ]} />
        <View style={{ marginTop: 6 }}><ParagraphLines text={report.workforceAnalysis} placeholder="" /></View>
      </Section>

      <NarrativeSection index={7} title="Difficultés majeures rencontrées" text={report.majorIssues} />

      {report.arbitragesRequested && report.arbitragesRequested.trim() ? (
        <View style={styles.arbBox} wrap={false}>
          <Text style={styles.arbTitle}>08. ARBITRAGES DEMANDÉS AU DG</Text>
          <ParagraphLines text={report.arbitragesRequested} />
        </View>
      ) : (
        <NarrativeSection index={8} title="Arbitrages demandés au DG" text={null} />
      )}

      <NarrativeSection index={9} title="Plan stratégique du mois suivant" text={report.nextMonthStrategy} />

      {report.status === "REJECTED" && report.rejectionReason && (
        <View style={styles.rejectedBox} wrap={false}>
          <Text style={styles.rejectedTitle}>RAPPORT REFUSÉ — Motif du DG</Text>
          <Text style={styles.body}>{report.rejectionReason}</Text>
        </View>
      )}

      <View style={styles.sigWrapper} wrap={false}>
        <Text style={styles.sigTitle}>Cadre de validation</Text>
        <View style={styles.sigGrid}>
          <SigBox role="Directeur de Travaux" name={report.author.name} date={report.submittedAt ? fmtShortDate(report.submittedAt) : "—"} mark="Émetteur" dateLabel="Date d'émission" />
          <SigBox
            role="Directeur Général"
            name={report.status === "VALIDATED" ? report.validatedBy ?? "—" : "—"}
            date={report.status === "VALIDATED" && report.validatedAt ? fmtShortDate(report.validatedAt) : "—"}
            mark={report.status === "VALIDATED" ? "VISA APPOSÉ" : "À viser"}
            markTone={report.status === "VALIDATED" ? "ok" : "mute"}
            dateLabel="Date du visa"
            signatureUrl={report.status === "VALIDATED" ? report.validatedBySignatureUrl : null}
            stampUrl={report.status === "VALIDATED" ? report.tenant.stampImageUrl : null}
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
  return <Section index={index} title={title}><ParagraphLines text={text} placeholder="—" /></Section>;
}

function ParagraphLines({ text, placeholder }: { text: string | null; placeholder?: string }) {
  if (!text || !text.trim()) return <Text style={styles.bodyMute}>{placeholder ?? ""}</Text>;
  return <View>{text.split(/\n+/).map((line, i) => line.trim() ? <Text key={i} style={styles.body}>{line.trim()}</Text> : null)}</View>;
}

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionIndex}>{String(index).padStart(2, "0")}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View>{children}</View>
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

function SigBox({ role, name, date, mark, markTone, dateLabel, signatureUrl, stampUrl }: { role: string; name: string; date: string; mark: string; markTone?: "ok" | "mute"; dateLabel: string; signatureUrl?: string | null; stampUrl?: string | null }) {
  const markColor = markTone === "ok" ? C.ok : C.mute;
  const hasVisual = Boolean(signatureUrl || stampUrl);
  return (
    <View style={styles.sigBox}>
      <Text style={styles.sigRole}>{role}</Text>
      <Text style={styles.sigName}>{name}</Text>
      <View style={styles.sigArea}>
        {hasVisual ? (
          <View style={{ position: "relative", width: "100%", height: "100%" }}>
            {signatureUrl ? (
              <Image src={signatureUrl} style={{ position: "absolute", left: 6, top: 6, width: 110, height: 40, objectFit: "contain" }} />
            ) : null}
            {stampUrl ? (
              <Image src={stampUrl} style={{ position: "absolute", right: 6, top: 2, width: 46, height: 46, objectFit: "contain", opacity: 0.85 }} />
            ) : null}
          </View>
        ) : null}
      </View>
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
  coverCenter: { marginTop: 70, alignItems: "center" },
  coverKicker: { fontSize: 11, color: C.primary, letterSpacing: 2, fontFamily: FONT_BOLD, marginBottom: 18, textAlign: "center" },
  coverTitle: { fontSize: 28, fontFamily: FONT_BOLD, color: C.ink, textAlign: "center", marginBottom: 4 },
  coverSubtitle: { fontSize: 13, color: C.mute, marginBottom: 28 },
  coverFactsRow: { flexDirection: "row", gap: 8, width: "100%" },
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
  body: { fontSize: 10, color: C.ink2, lineHeight: 1.55, marginBottom: 3 },
  bodyMute: { fontSize: 10, color: C.mute, fontFamily: FONT_OBL, lineHeight: 1.5 },

  table: { borderWidth: 0.5, borderColor: C.line, marginVertical: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.lineSoft, paddingVertical: 5, paddingHorizontal: 8 },
  tableRowLast: { borderBottomWidth: 0 },
  tableLabel: { flex: 1, fontSize: 9.5, color: C.ink2 },
  tableValue: { width: 200, fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink, textAlign: "right" },

  arbBox: { marginBottom: 14, padding: 10, borderLeftWidth: 3, borderLeftColor: C.warn, backgroundColor: C.warnSoft },
  arbTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.warn, marginBottom: 6, letterSpacing: 0.5 },

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
