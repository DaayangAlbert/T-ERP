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
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

// ---- Types ----
export interface CdtReportPdfData {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string | null;
  status: string;
  workingDays: number;
  weatherDays: number;
  subcontractorsPresent: number;
  globalSummary: string | null;
  keyAchievements: string | null;
  transverseIssues: string | null;
  scheduleSlippages: string | null;
  arbitrationsNeeded: string | null;
  nextWeekPlan: string | null;
  sites: Array<{
    siteId: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    physicalProgressPercent: number;
    financialProgressPercent: number;
    valueProducedXAF: string;
    avgWorkforce: number;
    hseIncidentsCount: number;
    milestonesAchieved: string | null;
    milestonesAtRisk: string | null;
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
  reportNumber: number;
}

interface Props {
  report: CdtReportPdfData;
}

// ====================================================================
export function CdtWeeklyReportPDF({ report }: Props) {
  return (
    <Document
      title={`Rapport hebdo CDT — ${report.weekLabel ?? `${fmtShortDate(report.weekStart)} → ${fmtShortDate(report.weekEnd)}`}`}
      author={report.author.name}
      subject="Rapport hebdomadaire CDT"
    >
      <CoverPage report={report} />
      <BodyPage report={report} />
    </Document>
  );
}

// ============================== COVER ==============================
function CoverPage({ report }: { report: CdtReportPdfData }) {
  const weekNum = isoWeek(new Date(report.weekStart));
  const totalValueProduced = report.sites.reduce((sum, s) => sum + Number(s.valueProducedXAF), 0);
  const totalIncidents = report.sites.reduce((sum, s) => sum + s.hseIncidentsCount, 0);
  const avgPhysical =
    report.sites.length > 0
      ? report.sites.reduce((s, x) => s + x.physicalProgressPercent, 0) / report.sites.length
      : 0;

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
        <Text style={styles.coverKicker}>RAPPORT HEBDOMADAIRE — CONDUCTEUR DE TRAVAUX</Text>
        <Text style={styles.coverTitle}>Semaine {String(weekNum).padStart(2, "0")}</Text>
        <Text style={styles.coverSubtitle}>
          {fmtDate(report.weekStart)} → {fmtDate(report.weekEnd)}
        </Text>

        <View style={styles.coverPeriodBox}>
          <Text style={styles.coverPeriodLabel}>{report.weekLabel ?? "Période couverte"}</Text>
          <Text style={styles.coverPeriodValue}>
            {report.sites.length} chantier{report.sites.length > 1 ? "s" : ""} consolidés
          </Text>
        </View>

        <View style={styles.coverFactsRow}>
          <CoverFact label="N° rapport" value={`#${String(report.reportNumber).padStart(3, "0")}`} />
          <CoverFact label="Avancement moyen" value={`${avgPhysical.toFixed(1)} %`} />
          <CoverFact label="Valeur produite" value={fmtMoney(totalValueProduced)} />
          <CoverFact label="Incidents HSE" value={String(totalIncidents)} />
        </View>
      </View>

      <View style={styles.coverPartiesBox}>
        <Text style={styles.coverPartiesTitle}>Cadre de la semaine</Text>
        <View>
          <Party label="Jours travaillés" value={`${report.workingDays} / 7`} />
          <Party label="Jours intempéries" value={`${report.weatherDays} / 7`} />
          <Party label="Sous-traitants présents (cumul)" value={String(report.subcontractorsPresent)} />
          <Party label="Statut du rapport" value={STATUS_LABEL[report.status] ?? report.status} />
        </View>
      </View>

      <View style={styles.coverFooter}>
        <View>
          <Text style={styles.coverFooterLabel}>Établi par</Text>
          <Text style={styles.coverFooterValue}>{report.author.name}</Text>
          <Text style={styles.coverFooterSub}>{report.author.position ?? "Conducteur de Travaux"}</Text>
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
function BodyPage({ report }: { report: CdtReportPdfData }) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View fixed style={styles.runHeader}>
        <Text style={styles.runHeaderL}>
          {report.tenant.name} · Rapport hebdo CDT #{String(report.reportNumber).padStart(3, "0")}
        </Text>
        <Text style={styles.runHeaderR}>
          {fmtShortDate(report.weekStart)} → {fmtShortDate(report.weekEnd)}
        </Text>
      </View>

      {/* 1. Tableau de bord des chantiers */}
      <Section index={1} title="Tableau de bord — chantiers couverts">
        {report.sites.length === 0 ? (
          <Text style={styles.bodyMute}>Aucun chantier renseigné.</Text>
        ) : (
          <View>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Chantier</Text>
              <Text style={[styles.thCell, { width: 55, textAlign: "right" }]}>% phys.</Text>
              <Text style={[styles.thCell, { width: 55, textAlign: "right" }]}>% fin.</Text>
              <Text style={[styles.thCell, { width: 90, textAlign: "right" }]}>Val. produite</Text>
              <Text style={[styles.thCell, { width: 40, textAlign: "right" }]}>Effct.</Text>
              <Text style={[styles.thCell, { width: 35, textAlign: "right" }]}>HSE</Text>
            </View>
            {report.sites.map((s, i) => (
              <View
                key={s.siteId}
                style={i === report.sites.length - 1 ? [styles.tdRow, styles.tdRowLast] : styles.tdRow}
              >
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.tdCellBold}>{s.code}</Text>
                  <Text style={styles.tdCellMute}>{s.name}</Text>
                </View>
                <Text style={[styles.tdCell, { width: 55, textAlign: "right" }]}>{s.physicalProgressPercent.toFixed(1)}</Text>
                <Text style={[styles.tdCell, { width: 55, textAlign: "right" }]}>{s.financialProgressPercent.toFixed(1)}</Text>
                <Text style={[styles.tdCell, { width: 90, textAlign: "right" }]}>{fmtN(s.valueProducedXAF)}</Text>
                <Text style={[styles.tdCell, { width: 40, textAlign: "right" }]}>{s.avgWorkforce}</Text>
                <Text
                  style={[
                    styles.tdCell,
                    {
                      width: 35,
                      textAlign: "right",
                      color: s.hseIncidentsCount > 0 ? C.danger : C.ink,
                      fontFamily: s.hseIncidentsCount > 0 ? FONT_BOLD : FONT,
                    },
                  ]}
                >
                  {s.hseIncidentsCount}
                </Text>
              </View>
            ))}
            {/* Total */}
            {report.sites.length > 1 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalCell, { flex: 1.2 }]}>TOTAL {report.sites.length} chantiers</Text>
                <Text style={[styles.totalCell, { width: 55, textAlign: "right" }]}>
                  {(report.sites.reduce((s, x) => s + x.physicalProgressPercent, 0) / report.sites.length).toFixed(1)}
                </Text>
                <Text style={[styles.totalCell, { width: 55, textAlign: "right" }]}>
                  {(report.sites.reduce((s, x) => s + x.financialProgressPercent, 0) / report.sites.length).toFixed(1)}
                </Text>
                <Text style={[styles.totalCell, { width: 90, textAlign: "right" }]}>
                  {fmtN(report.sites.reduce((s, x) => s + Number(x.valueProducedXAF), 0))}
                </Text>
                <Text style={[styles.totalCell, { width: 40, textAlign: "right" }]}>
                  {report.sites.reduce((s, x) => s + x.avgWorkforce, 0)}
                </Text>
                <Text style={[styles.totalCell, { width: 35, textAlign: "right" }]}>
                  {report.sites.reduce((s, x) => s + x.hseIncidentsCount, 0)}
                </Text>
              </View>
            )}
          </View>
        )}
      </Section>

      {/* 2. Détail jalons par chantier */}
      {report.sites.some((s) => s.milestonesAchieved || s.milestonesAtRisk || s.notes) && (
        <Section index={2} title="Jalons et notes par chantier">
          {report.sites
            .filter((s) => s.milestonesAchieved || s.milestonesAtRisk || s.notes)
            .map((s) => (
              <View key={s.siteId} style={styles.siteDetailBox} wrap={false}>
                <Text style={styles.siteDetailTitle}>
                  {s.code} — {s.name}
                </Text>
                {s.milestonesAchieved && (
                  <View style={styles.siteDetailSub}>
                    <Text style={styles.siteDetailLabel}>Jalons atteints</Text>
                    <ParagraphLines text={s.milestonesAchieved} />
                  </View>
                )}
                {s.milestonesAtRisk && (
                  <View style={styles.siteDetailSub}>
                    <Text style={[styles.siteDetailLabel, { color: C.warn }]}>Jalons à risque</Text>
                    <ParagraphLines text={s.milestonesAtRisk} />
                  </View>
                )}
                {s.notes && (
                  <View style={styles.siteDetailSub}>
                    <Text style={styles.siteDetailLabel}>Notes</Text>
                    <ParagraphLines text={s.notes} />
                  </View>
                )}
              </View>
            ))}
        </Section>
      )}

      {/* Sections narratives */}
      <NarrativeSection index={3} title="Synthèse globale" text={report.globalSummary} />
      <NarrativeSection index={4} title="Réalisations clés transverses" text={report.keyAchievements} />
      <NarrativeSection index={5} title="Difficultés et risques transverses" text={report.transverseIssues} />
      <NarrativeSection index={6} title="Glissements et jalons à risque" text={report.scheduleSlippages} />
      <NarrativeSection index={7} title="Arbitrages demandés au Directeur de Travaux" text={report.arbitrationsNeeded} />
      <NarrativeSection index={8} title="Programme de la semaine suivante" text={report.nextWeekPlan} />

      {report.status === "REJECTED" && report.rejectionReason && (
        <View style={styles.rejectedBox} wrap={false}>
          <Text style={styles.rejectedTitle}>RAPPORT REFUSÉ — Motif du Directeur de Travaux</Text>
          <Text style={styles.body}>{report.rejectionReason}</Text>
        </View>
      )}

      {/* Signatures */}
      <View style={styles.sigWrapper} wrap={false}>
        <Text style={styles.sigTitle}>Cadre de validation</Text>
        <View style={styles.sigGrid}>
          <SigBox
            role="Conducteur de Travaux"
            name={report.author.name}
            date={report.submittedAt ? fmtShortDate(report.submittedAt) : "—"}
            mark="Émetteur"
            dateLabel="Date d'émission"
          />
          <SigBox
            role="Directeur de Travaux"
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
        <Text
          style={styles.runFooterR}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

function NarrativeSection({ index, title, text }: { index: number; title: string; text: string | null }) {
  return (
    <Section index={index} title={title}>
      {text && text.trim() ? <ParagraphLines text={text} /> : <Text style={styles.bodyMute}>—</Text>}
    </Section>
  );
}

function ParagraphLines({ text }: { text: string }) {
  return (
    <View>
      {text.split(/\n+/).map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        return (
          <Text key={i} style={styles.body}>
            {t}
          </Text>
        );
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
        <Text style={styles.sigMeta}>
          {dateLabel} : {date}
        </Text>
        <Text style={{ ...styles.sigMark, color: markColor }}>{mark}</Text>
      </View>
    </View>
  );
}

// ============================== STYLES ==============================
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
  coverKicker: { fontSize: 11, color: C.primary, letterSpacing: 2, fontFamily: FONT_BOLD, marginBottom: 18 },
  coverTitle: { fontSize: 28, fontFamily: FONT_BOLD, color: C.ink, textAlign: "center", marginBottom: 4 },
  coverSubtitle: { fontSize: 13, color: C.mute, marginBottom: 26 },
  coverPeriodBox: { backgroundColor: C.primarySoft, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 3, marginBottom: 22, alignItems: "center" },
  coverPeriodLabel: { fontSize: 9, color: C.primary, letterSpacing: 1.5, marginBottom: 4 },
  coverPeriodValue: { fontSize: 14, fontFamily: FONT_BOLD, color: C.primary },
  coverFactsRow: { flexDirection: "row", gap: 8, width: "100%", marginTop: 4 },
  coverFact: { flex: 1, borderWidth: 0.5, borderColor: C.line, padding: 8, alignItems: "center" },
  coverFactLabel: { fontSize: 7.5, color: C.mute, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  coverFactValue: { fontSize: 12, fontFamily: FONT_BOLD, color: C.ink },
  coverPartiesBox: { marginTop: 36, borderWidth: 0.7, borderColor: C.line, padding: 14 },
  coverPartiesTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  partyRow: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 0.3, borderTopColor: C.lineSoft },
  partyLabel: { width: 200, fontSize: 9.5, color: C.mute },
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

  // Table
  tableHeaderRow: { flexDirection: "row", backgroundColor: C.bg, paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.7, borderBottomColor: C.line },
  thCell: { fontSize: 8.5, fontFamily: FONT_BOLD, color: C.mute, textTransform: "uppercase", letterSpacing: 0.3 },
  tdRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft, alignItems: "center" },
  tdRowLast: { borderBottomWidth: 0.7, borderBottomColor: C.line },
  tdCell: { fontSize: 9.5, color: C.ink2 },
  tdCellBold: { fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink },
  tdCellMute: { fontSize: 8.5, color: C.mute },
  totalRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.primarySoft, alignItems: "center" },
  totalCell: { fontSize: 9.5, fontFamily: FONT_BOLD, color: C.primary },

  // Site detail
  siteDetailBox: { borderLeftWidth: 2, borderLeftColor: C.primary, paddingLeft: 8, marginBottom: 8 },
  siteDetailTitle: { fontSize: 10.5, fontFamily: FONT_BOLD, color: C.ink, marginBottom: 3 },
  siteDetailSub: { marginTop: 3 },
  siteDetailLabel: { fontSize: 8.5, fontFamily: FONT_BOLD, color: C.primary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 1 },

  // Rejected
  rejectedBox: { marginTop: 14, padding: 10, borderLeftWidth: 3, borderLeftColor: C.danger, backgroundColor: C.dangerSoft },
  rejectedTitle: { fontSize: 10, fontFamily: FONT_BOLD, color: C.danger, marginBottom: 4, letterSpacing: 0.5 },

  // Signatures
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
