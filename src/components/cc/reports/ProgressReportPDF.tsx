import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_OBL = "Helvetica-Oblique";

// Palette sobre, professionnelle (impression-friendly)
const C = {
  ink: "#1f2937",
  ink2: "#374151",
  mute: "#6b7280",
  mute2: "#94a3b8",
  line: "#d1d5db",
  lineSoft: "#e5e7eb",
  bg: "#f8fafc",
  primary: "#5b21b6", // violet T-ERP
  primarySoft: "#ede9fe",
  ok: "#047857",
  okSoft: "#d1fae5",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
};

// ---------- Helpers ----------
function fmtN(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}

function fmtMoney(n: string | number | bigint | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(v))} FCFA`;
}

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

function fmtShortDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function fmtPeriod(date: string, type: string, label: string | null): string {
  if (label) return label;
  const d = new Date(date);
  if (type === "MONTHLY") {
    const s = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (type === "WEEKLY") return `Semaine du ${fmtShortDate(d)}`;
  return fmtDate(d);
}

function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

const TYPE_LABEL: Record<string, string> = {
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  AD_HOC: "Exceptionnel",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

// ---------- Types ----------
export interface ReportPdfData {
  id: string;
  reportNumber: number;
  reportType: string;
  status: string;
  period: string;
  periodLabel: string | null;
  physicalProgressPercent: number;
  previousProgressPercent: number | null;
  mainAchievements: string | null;
  delaysIdentified: string | null;
  valueProducedXAF: string;
  valueProducedCumulXAF: string;
  avgWorkforce: number;
  maxWorkforce: number;
  overtimeHoursTotal: number;
  billingStatus: string | null;
  hseIncidentsCount: number;
  daysWithoutAccident: number;
  issuesEncountered: string | null;
  supportNeeded: string | null;
  nextPeriodPriorities: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  author: { name: string; position: string };
  validatedBy: string | null;
  site: {
    code: string;
    name: string;
    client: string;
    region: string | null;
    budget: string;
    startDate: string;
    plannedEndDate: string;
    progress: number;
    physicalProgress: number;
    financialProgress: number;
    moaName: string | null;
    manager: string | null;
  };
  contract: {
    reference: string;
    initialAmount: string;
    currentAmount: string;
    publicMarket: boolean;
    procuringEntity: string | null;
    signedAt: string | null;
  } | null;
  tenant: {
    name: string;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    taxId: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  attachments: Array<{ id: string; title: string; category: string }>;
}

interface Props {
  report: ReportPdfData;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
export function ProgressReportPDF({ report }: Props) {
  return (
    <Document
      title={`Rapport ${report.site.code} — ${fmtPeriod(report.period, report.reportType, report.periodLabel)}`}
      author={report.author.name}
      subject="Rapport d'avancement chantier"
    >
      <CoverPage report={report} />
      <BodyPage report={report} />
    </Document>
  );
}

// ============================================================================
// PAGE 1 — PAGE DE GARDE
// ============================================================================
function CoverPage({ report }: { report: ReportPdfData }) {
  const totalDelay = daysBetween(report.site.startDate, report.site.plannedEndDate);
  const elapsed = daysBetween(report.site.startDate, report.period);

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* En-tête entreprise */}
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
          {report.tenant.contactAddress && (
            <Text style={styles.coverTenantInfo}>{report.tenant.contactAddress}</Text>
          )}
          <Text style={styles.coverTenantInfo}>
            {[report.tenant.contactPhone, report.tenant.contactEmail].filter(Boolean).join(" · ")}
          </Text>
          {report.tenant.taxId && (
            <Text style={styles.coverTenantInfo}>N° Contribuable : {report.tenant.taxId}</Text>
          )}
        </View>
      </View>

      <View style={styles.coverDivider} />

      {/* Bloc central */}
      <View style={styles.coverCenter}>
        <Text style={styles.coverKicker}>RAPPORT D&apos;AVANCEMENT — {TYPE_LABEL[report.reportType]?.toUpperCase() ?? report.reportType}</Text>
        <Text style={styles.coverTitle}>{report.site.name}</Text>
        <Text style={styles.coverSubtitle}>Chantier {report.site.code}</Text>

        <View style={styles.coverPeriodBox}>
          <Text style={styles.coverPeriodLabel}>Période couverte</Text>
          <Text style={styles.coverPeriodValue}>
            {fmtPeriod(report.period, report.reportType, report.periodLabel)}
          </Text>
        </View>

        <View style={styles.coverFactsRow}>
          <CoverFact label="N° de rapport" value={`#${String(report.reportNumber).padStart(3, "0")}`} />
          <CoverFact label="Avancement physique" value={`${report.physicalProgressPercent.toFixed(1)} %`} />
          <CoverFact label="Statut" value={STATUS_LABEL[report.status] ?? report.status} />
        </View>
      </View>

      {/* Bloc identification rapide */}
      <View style={styles.coverPartiesBox}>
        <Text style={styles.coverPartiesTitle}>Identification du projet</Text>
        <View style={styles.coverPartiesGrid}>
          <Party label="Maître d&apos;ouvrage (MOA)" value={report.site.moaName ?? report.site.client} />
          <Party label="Entreprise (titulaire)" value={report.tenant.name} />
          <Party label="Région / Localisation" value={report.site.region ?? "—"} />
          <Party label="Référence marché" value={report.contract?.reference ?? "—"} />
          <Party
            label="Délai contractuel"
            value={`${totalDelay} jours (${fmtShortDate(report.site.startDate)} → ${fmtShortDate(report.site.plannedEndDate)})`}
          />
          <Party label="Jours écoulés à fin période" value={`${elapsed} jours`} />
        </View>
      </View>

      {/* Émission */}
      <View style={styles.coverFooter}>
        <View>
          <Text style={styles.coverFooterLabel}>Établi par</Text>
          <Text style={styles.coverFooterValue}>{report.author.name}</Text>
          <Text style={styles.coverFooterSub}>{report.author.position}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.coverFooterLabel}>Émis le</Text>
          <Text style={styles.coverFooterValue}>
            {fmtDate(report.submittedAt ?? new Date().toISOString())}
          </Text>
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

// ============================================================================
// PAGE 2+ — CORPS DU RAPPORT
// ============================================================================
function BodyPage({ report }: { report: ReportPdfData }) {
  const progressDelta =
    report.previousProgressPercent != null
      ? report.physicalProgressPercent - report.previousProgressPercent
      : null;

  const valueProduced = Number(report.valueProducedXAF);
  const valueCumul = Number(report.valueProducedCumulXAF);
  const budget = Number(report.site.budget);
  const cumulPct = budget > 0 ? (valueCumul / budget) * 100 : 0;

  return (
    <Page size="A4" style={styles.page} wrap>
      {/* En-tête pages corps */}
      <View fixed style={styles.runHeader}>
        <Text style={styles.runHeaderL}>{report.site.code} — {report.site.name}</Text>
        <Text style={styles.runHeaderR}>
          Rapport {TYPE_LABEL[report.reportType] ?? report.reportType} · {fmtPeriod(report.period, report.reportType, report.periodLabel)}
        </Text>
      </View>

      {/* Section 1 — Synthèse exécutive */}
      <Section index={1} title="Synthèse exécutive">
        <View style={styles.kpiGrid}>
          <Kpi
            label="Avancement physique"
            value={`${report.physicalProgressPercent.toFixed(1)} %`}
            sub={
              progressDelta !== null
                ? `${progressDelta >= 0 ? "+" : ""}${progressDelta.toFixed(1)} pts vs précédent`
                : "Période initiale"
            }
            tone="primary"
          />
          <Kpi
            label="Valeur produite (période)"
            value={fmtMoney(valueProduced)}
            sub={budget > 0 ? `${((valueProduced / budget) * 100).toFixed(1)} % du marché` : ""}
            tone="ok"
          />
          <Kpi
            label="Effectif moyen mobilisé"
            value={`${report.avgWorkforce}`}
            sub={`Pic : ${report.maxWorkforce} pers.`}
            tone="default"
          />
          <Kpi
            label="Incidents HSE"
            value={String(report.hseIncidentsCount)}
            sub={`${report.daysWithoutAccident} jours sans accident`}
            tone={report.hseIncidentsCount > 0 ? "danger" : "ok"}
          />
        </View>

        {/* Barre d'avancement */}
        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progression physique à fin période</Text>
            <Text style={styles.progressValue}>{report.physicalProgressPercent.toFixed(1)} %</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={{
                ...styles.progressBarFill,
                width: `${Math.min(100, Math.max(0, report.physicalProgressPercent))}%`,
              }}
            />
          </View>
          {report.previousProgressPercent != null && (
            <Text style={styles.progressNote}>
              Période précédente : {report.previousProgressPercent.toFixed(1)} %
              {progressDelta !== null && progressDelta < 0 && " ⚠ Glissement"}
            </Text>
          )}
        </View>
      </Section>

      {/* Section 2 — Avancement physique détaillé */}
      <Section index={2} title="Avancement physique du chantier">
        <Table
          rows={[
            ["Avancement physique (déclaratif CC)", `${report.physicalProgressPercent.toFixed(1)} %`],
            ["Avancement physique (réf. système DT)", `${report.site.physicalProgress.toFixed(1)} %`],
            ["Avancement financier (réf. système DT)", `${report.site.financialProgress.toFixed(1)} %`],
            ["Progression nette de la période", progressDelta !== null ? `${progressDelta >= 0 ? "+" : ""}${progressDelta.toFixed(1)} points` : "n/a"],
          ]}
        />
      </Section>

      {/* Section 3 — Réalisations majeures */}
      <Section index={3} title="Réalisations majeures de la période">
        <Paragraph text={report.mainAchievements} placeholder="Aucune réalisation majeure renseignée." />
      </Section>

      {/* Section 4 — Retards identifiés */}
      <Section index={4} title="Retards identifiés &amp; causes">
        <Paragraph text={report.delaysIdentified} placeholder="Aucun retard signalé sur la période." />
      </Section>

      {/* Section 5 — Avancement financier */}
      <Section index={5} title="Avancement financier">
        <Table
          rows={[
            ["Montant du marché (initial)", fmtMoney(report.contract?.initialAmount ?? report.site.budget)],
            ["Montant du marché (actuel, avenants compris)", fmtMoney(report.contract?.currentAmount ?? report.site.budget)],
            ["Valeur produite — période", fmtMoney(valueProduced)],
            ["Valeur produite — cumul à fin période", fmtMoney(valueCumul)],
            ["Taux d'avancement financier cumulé", budget > 0 ? `${cumulPct.toFixed(1)} %` : "n/a"],
          ]}
        />
        {report.billingStatus && (
          <View style={styles.subBlock}>
            <Text style={styles.subBlockTitle}>Situation facturation / décomptes</Text>
            <Text style={styles.body}>{report.billingStatus}</Text>
          </View>
        )}
      </Section>

      {/* Section 6 — Ressources humaines */}
      <Section index={6} title="Ressources humaines mobilisées">
        <Table
          rows={[
            ["Effectif moyen sur la période", `${report.avgWorkforce} personne${report.avgWorkforce > 1 ? "s" : ""}`],
            ["Effectif maximum (pic)", `${report.maxWorkforce} personne${report.maxWorkforce > 1 ? "s" : ""}`],
            ["Heures supplémentaires (total)", `${report.overtimeHoursTotal.toFixed(1)} h`],
          ]}
        />
      </Section>

      {/* Section 7 — Sécurité (HSE) */}
      <Section index={7} title="Hygiène, sécurité &amp; environnement (HSE)">
        <Table
          rows={[
            ["Incidents HSE déclarés sur la période", String(report.hseIncidentsCount)],
            ["Jours sans accident (à fin période)", String(report.daysWithoutAccident)],
          ]}
        />
        {report.hseIncidentsCount > 0 && (
          <Callout tone="warn" text="Un ou plusieurs incidents ont été déclarés. Se reporter aux fiches HSE détaillées." />
        )}
      </Section>

      {/* Section 8 — Difficultés rencontrées */}
      <Section index={8} title="Difficultés rencontrées">
        <Paragraph text={report.issuesEncountered} placeholder="Aucune difficulté particulière signalée." />
      </Section>

      {/* Section 9 — Support demandé */}
      <Section index={9} title="Support demandé / arbitrage">
        <Paragraph text={report.supportNeeded} placeholder="Aucune demande de support formulée." />
      </Section>

      {/* Section 10 — Priorités prochaine période */}
      <Section index={10} title="Priorités de la prochaine période">
        <Paragraph text={report.nextPeriodPriorities} placeholder="Priorités à définir." />
      </Section>

      {/* Section 11 — Pièces jointes */}
      {report.attachments.length > 0 && (
        <Section index={11} title="Pièces jointes au présent rapport">
          <View>
            {report.attachments.map((a, i) => (
              <View key={a.id} style={styles.attachmentRow}>
                <Text style={styles.attachmentNum}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachmentTitle}>{a.title}</Text>
                  <Text style={styles.attachmentCat}>Catégorie : {a.category}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Section 12 — Refus */}
      {report.status === "REJECTED" && report.rejectionReason && (
        <View style={styles.rejectedBox}>
          <Text style={styles.rejectedTitle}>RAPPORT REFUSÉ — Motif du Directeur de Travaux</Text>
          <Text style={styles.body}>{report.rejectionReason}</Text>
        </View>
      )}

      {/* Signatures */}
      <SignatureBlock report={report} />

      {/* Footer pages corps */}
      <View fixed style={styles.runFooter}>
        <Text style={styles.runFooterL}>
          {report.tenant.name} · Rapport #{String(report.reportNumber).padStart(3, "0")}
        </Text>
        <Text
          style={styles.runFooterR}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================
function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
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

function Paragraph({ text, placeholder }: { text: string | null; placeholder: string }) {
  if (!text || !text.trim()) {
    return <Text style={styles.bodyMute}>{placeholder}</Text>;
  }
  // Split lignes pour les listes naturelles
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

function Table({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={styles.table}>
      {rows.map(([label, value], i) => (
        <View
          key={i}
          style={i === rows.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}
        >
          <Text style={styles.tableLabel}>{label}</Text>
          <Text style={styles.tableValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "ok" | "danger" | "warn";
}) {
  const t =
    tone === "primary"
      ? { fg: C.primary, bg: C.primarySoft }
      : tone === "ok"
        ? { fg: C.ok, bg: C.okSoft }
        : tone === "danger"
          ? { fg: C.danger, bg: C.dangerSoft }
          : tone === "warn"
            ? { fg: C.warn, bg: C.warnSoft }
            : { fg: C.ink, bg: C.bg };

  return (
    <View style={{ ...styles.kpiCard, borderLeftColor: t.fg }}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={{ ...styles.kpiValue, color: t.fg }}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

function Callout({ tone, text }: { tone: "warn" | "danger" | "ok"; text: string }) {
  const t =
    tone === "warn"
      ? { fg: C.warn, bg: C.warnSoft }
      : tone === "danger"
        ? { fg: C.danger, bg: C.dangerSoft }
        : { fg: C.ok, bg: C.okSoft };
  return (
    <View style={{ ...styles.callout, backgroundColor: t.bg, borderLeftColor: t.fg }}>
      <Text style={{ ...styles.calloutText, color: t.fg }}>{text}</Text>
    </View>
  );
}

function SignatureBlock({ report }: { report: ReportPdfData }) {
  const showValidated = report.status === "VALIDATED";
  return (
    <View style={styles.sigWrapper} wrap={false}>
      <Text style={styles.sigTitle}>Cadre de validation</Text>
      <View style={styles.sigGrid}>
        <SigBox
          role="Chef de chantier"
          name={report.author.name}
          date={report.submittedAt ? fmtShortDate(report.submittedAt) : "—"}
          mark="Émetteur"
          dateLabel="Date d'émission"
        />
        <SigBox
          role="Directeur de travaux"
          name={showValidated ? report.validatedBy ?? "—" : "—"}
          date={showValidated && report.validatedAt ? fmtShortDate(report.validatedAt) : "—"}
          mark={showValidated ? "VISA APPOSÉ" : "À viser"}
          markTone={showValidated ? "ok" : "mute"}
          dateLabel="Date du visa"
        />
        <SigBox
          role="Maître d'œuvre"
          name="—"
          date="—"
          mark="À viser"
          markTone="mute"
          dateLabel="Date du visa"
        />
        <SigBox
          role="Maître d'ouvrage"
          name={report.site.moaName ?? report.site.client}
          date="—"
          mark="Pour information"
          markTone="mute"
          dateLabel="Date de réception"
        />
      </View>
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

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // ---------- COVER ----------
  coverPage: {
    padding: 50,
    paddingBottom: 60,
    fontFamily: FONT,
    color: C.ink,
    fontSize: 10,
  },
  coverHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  coverLogo: { width: 56, height: 56, objectFit: "contain" },
  coverLogoPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  coverLogoText: { color: "white", fontSize: 28, fontFamily: FONT_BOLD },
  coverTenant: { fontSize: 13, fontFamily: FONT_BOLD, color: C.ink, marginBottom: 1 },
  coverTenantInfo: { fontSize: 9, color: C.mute, lineHeight: 1.4 },
  coverDivider: {
    marginTop: 18,
    height: 2,
    backgroundColor: C.primary,
  },
  coverCenter: {
    marginTop: 70,
    alignItems: "center",
  },
  coverKicker: {
    fontSize: 11,
    color: C.primary,
    letterSpacing: 2,
    fontFamily: FONT_BOLD,
    marginBottom: 18,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: FONT_BOLD,
    color: C.ink,
    textAlign: "center",
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 13,
    color: C.mute,
    marginBottom: 26,
  },
  coverPeriodBox: {
    backgroundColor: C.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 3,
    marginBottom: 22,
    alignItems: "center",
  },
  coverPeriodLabel: { fontSize: 9, color: C.primary, letterSpacing: 1.5, marginBottom: 4 },
  coverPeriodValue: { fontSize: 16, fontFamily: FONT_BOLD, color: C.primary },
  coverFactsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  coverFact: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.line,
    padding: 9,
    alignItems: "center",
  },
  coverFactLabel: { fontSize: 8, color: C.mute, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  coverFactValue: { fontSize: 13, fontFamily: FONT_BOLD, color: C.ink },
  coverPartiesBox: {
    marginTop: 36,
    borderWidth: 0.7,
    borderColor: C.line,
    padding: 14,
  },
  coverPartiesTitle: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  coverPartiesGrid: {},
  partyRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderTopWidth: 0.3,
    borderTopColor: C.lineSoft,
  },
  partyLabel: { width: 200, fontSize: 9.5, color: C.mute },
  partyValue: { flex: 1, fontSize: 9.5, color: C.ink, fontFamily: FONT_BOLD },
  coverFooter: {
    marginTop: "auto",
    paddingTop: 26,
    borderTopWidth: 0.7,
    borderTopColor: C.line,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverFooterLabel: { fontSize: 8, color: C.mute, textTransform: "uppercase", letterSpacing: 0.7 },
  coverFooterValue: { fontSize: 11, fontFamily: FONT_BOLD, color: C.ink, marginTop: 2 },
  coverFooterSub: { fontSize: 9, color: C.mute, marginTop: 1 },

  // ---------- BODY ----------
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 45,
    fontFamily: FONT,
    color: C.ink,
    fontSize: 10,
  },
  runHeader: {
    position: "absolute",
    top: 24,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingBottom: 6,
  },
  runHeaderL: { fontSize: 8.5, color: C.mute, fontFamily: FONT_BOLD },
  runHeaderR: { fontSize: 8.5, color: C.mute },

  runFooter: {
    position: "absolute",
    bottom: 24,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  runFooterL: { fontSize: 8, color: C.mute },
  runFooterR: { fontSize: 8, color: C.mute },

  section: { marginBottom: 14 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.primary,
    paddingBottom: 3,
    marginBottom: 6,
  },
  sectionIndex: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: C.primary,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    color: C.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBody: {},

  body: { fontSize: 10, color: C.ink2, lineHeight: 1.55, marginBottom: 3 },
  bodyMute: { fontSize: 10, color: C.mute, fontFamily: FONT_OBL, lineHeight: 1.5 },

  // KPIs
  kpiGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.bg,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
  },
  kpiLabel: { fontSize: 8, color: C.mute, textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: { fontSize: 14, fontFamily: FONT_BOLD, marginTop: 2 },
  kpiSub: { fontSize: 8.5, color: C.mute, marginTop: 1 },

  // Progress bar
  progressBlock: { marginTop: 4 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  progressLabel: { fontSize: 9.5, color: C.ink2 },
  progressValue: { fontSize: 10, fontFamily: FONT_BOLD, color: C.primary },
  progressBarBg: {
    height: 7,
    backgroundColor: C.lineSoft,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 7,
    backgroundColor: C.primary,
  },
  progressNote: { fontSize: 8.5, color: C.mute, marginTop: 3, fontFamily: FONT_OBL },

  // Table
  table: {
    borderWidth: 0.5,
    borderColor: C.line,
    marginVertical: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.lineSoft,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableLabel: { flex: 1, fontSize: 9.5, color: C.ink2 },
  tableValue: { width: 200, fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink, textAlign: "right" },

  // Sub-block
  subBlock: { marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.lineSoft },
  subBlockTitle: { fontSize: 9.5, fontFamily: FONT_BOLD, color: C.ink, marginBottom: 3 },

  // Callout
  callout: {
    marginTop: 6,
    padding: 6,
    borderLeftWidth: 2,
  },
  calloutText: { fontSize: 9, fontFamily: FONT_BOLD },

  // Attachments
  attachmentRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: C.lineSoft,
  },
  attachmentNum: { fontSize: 9, fontFamily: FONT_BOLD, color: C.primary, width: 20 },
  attachmentTitle: { fontSize: 10, color: C.ink, fontFamily: FONT_BOLD },
  attachmentCat: { fontSize: 8.5, color: C.mute, marginTop: 1 },

  // Rejected
  rejectedBox: {
    marginTop: 14,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.danger,
    backgroundColor: C.dangerSoft,
  },
  rejectedTitle: {
    fontSize: 10,
    fontFamily: FONT_BOLD,
    color: C.danger,
    marginBottom: 4,
    letterSpacing: 0.5,
  },

  // Signatures
  sigWrapper: { marginTop: 18 },
  sigTitle: {
    fontSize: 11,
    fontFamily: FONT_BOLD,
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.primary,
  },
  sigGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sigBox: {
    width: "48%",
    borderWidth: 0.5,
    borderColor: C.line,
    padding: 8,
  },
  sigRole: { fontSize: 9, fontFamily: FONT_BOLD, color: C.ink, textTransform: "uppercase", letterSpacing: 0.5 },
  sigName: { fontSize: 10, color: C.ink2, marginTop: 2 },
  sigArea: {
    marginTop: 8,
    height: 52,
    borderWidth: 0.5,
    borderColor: C.lineSoft,
    borderStyle: "dashed",
  },
  sigMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigMeta: { fontSize: 8, color: C.mute },
  sigMark: { fontSize: 8, fontFamily: FONT_BOLD, letterSpacing: 0.4 },
});
