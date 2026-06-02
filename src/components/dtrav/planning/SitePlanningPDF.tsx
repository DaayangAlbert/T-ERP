import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

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

const PHASE_STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DELAYED: "En retard",
  CANCELLED: "Annulée",
};
const MS_STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  REACHED: "Atteint",
  LATE: "En retard",
  MOA_VALIDATED: "Validé MOA",
  MISSED: "Manqué",
};

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(dt);
}
function diffDays(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export interface PlanningPhasePdf {
  name: string;
  plannedStart: string;
  plannedEnd: string;
  progressPercent: number;
  status: string;
  tasks: Array<{ name: string; plannedStart: string; plannedEnd: string; progressPercent: number }>;
}
export interface PlanningMilestonePdf {
  code: string;
  description: string;
  contractDueDate: string;
  status: string;
}
export interface SitePlanningPdfData {
  site: {
    code: string;
    name: string;
    client: string;
    region: string | null;
    startDate: string;
    plannedEndDate: string;
    moaName: string | null;
  };
  totalDurationDays: number;
  phases: PlanningPhasePdf[];
  milestones: PlanningMilestonePdf[];
  generatedAt: string;
  authorName: string | null;
  tenant: {
    name: string;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    taxId: string | null;
    logoUrl: string | null;
  };
}

export function SitePlanningPDF({ data }: { data: SitePlanningPdfData }) {
  return (
    <Document title={`Planning — ${data.site.code} ${data.site.name}`} author={data.authorName ?? data.tenant.name}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Header data={data} />
        <SiteBlock data={data} />
        <Gantt phases={data.phases} siteStart={data.site.startDate} siteEnd={data.site.plannedEndDate} />
        <Milestones milestones={data.milestones} />
        <Footer data={data} />
      </Page>
    </Document>
  );
}

function Header({ data }: { data: SitePlanningPdfData }) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerLeft}>
        {data.tenant.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={data.tenant.logoUrl} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>{data.tenant.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName}>{data.tenant.name}</Text>
          {data.tenant.contactAddress && <Text style={styles.tenantInfo}>{data.tenant.contactAddress}</Text>}
          <Text style={styles.tenantInfo}>
            {[data.tenant.contactPhone, data.tenant.contactEmail].filter(Boolean).join(" · ") || "—"}
          </Text>
          {data.tenant.taxId && <Text style={styles.tenantInfo}>N° Contribuable : {data.tenant.taxId}</Text>}
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.docTitle}>PLANNING D&apos;EXÉCUTION</Text>
        <Text style={styles.docMeta}>Émis le {fmtDate(data.generatedAt)}</Text>
      </View>
    </View>
  );
}

function SiteBlock({ data }: { data: SitePlanningPdfData }) {
  return (
    <View style={styles.siteBlock}>
      <View style={{ flex: 1 }}>
        <Text style={styles.siteCode}>{data.site.code}</Text>
        <Text style={styles.siteName}>{data.site.name}</Text>
        <Text style={styles.siteSub}>
          {data.site.client}
          {data.site.region ? ` · ${data.site.region}` : ""}
        </Text>
        {data.site.moaName && <Text style={styles.siteSub}>Maître d&apos;ouvrage : {data.site.moaName}</Text>}
      </View>
      <View style={styles.siteStats}>
        <Stat label="Démarrage" value={fmtDate(data.site.startDate)} />
        <Stat label="Livraison prévue" value={fmtDate(data.site.plannedEndDate)} />
        <Stat label="Durée" value={`${data.totalDurationDays} j`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Gantt({
  phases,
  siteStart,
  siteEnd,
}: {
  phases: PlanningPhasePdf[];
  siteStart: string;
  siteEnd: string;
}) {
  if (phases.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phases &amp; tâches</Text>
        <Text style={styles.empty}>Aucune phase n&apos;est saisie pour le moment.</Text>
      </View>
    );
  }
  const start = new Date(siteStart);
  const end = new Date(siteEnd);
  const total = diffDays(start, end);
  // Bornes du diagramme = bornes du chantier (élargies si une phase déborde)
  let minMs = start.getTime();
  let maxMs = end.getTime();
  for (const ph of phases) {
    minMs = Math.min(minMs, new Date(ph.plannedStart).getTime());
    maxMs = Math.max(maxMs, new Date(ph.plannedEnd).getTime());
  }
  const span = Math.max(1, maxMs - minMs);

  // Échelle temporelle : 6 graduations mensuelles
  const ticks: { offsetPct: number; label: string }[] = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const t = minMs + (span * i) / tickCount;
    ticks.push({ offsetPct: (i / tickCount) * 100, label: fmtDate(new Date(t)) });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Phases &amp; chronogramme ({phases.length})</Text>
      <View style={styles.ganttHeader}>
        <View style={styles.ganttLabelCol}>
          <Text style={styles.ganttColTitle}>Phase</Text>
        </View>
        <View style={styles.ganttDatesCol}>
          <Text style={styles.ganttColTitle}>Dates</Text>
        </View>
        <View style={styles.ganttBarCol}>
          <View style={styles.ganttAxis}>
            {ticks.map((t, i) => (
              <Text key={i} style={[styles.tickLabel, { left: `${t.offsetPct}%` }]}>
                {t.label}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {phases.map((ph, idx) => {
        const phStart = new Date(ph.plannedStart).getTime();
        const phEnd = new Date(ph.plannedEnd).getTime();
        const leftPct = ((phStart - minMs) / span) * 100;
        const widthPct = Math.max(2, ((phEnd - phStart) / span) * 100);
        const tone =
          ph.status === "COMPLETED"
            ? C.ok
            : ph.status === "DELAYED"
              ? C.danger
              : ph.status === "IN_PROGRESS"
                ? C.primary
                : C.mute;
        const days = Math.round((phEnd - phStart) / 86_400_000);
        return (
          <View key={idx} style={styles.ganttRow} wrap={false}>
            <View style={styles.ganttLabelCol}>
              <Text style={styles.phaseName}>{ph.name}</Text>
              <Text style={styles.phaseSub}>
                {PHASE_STATUS_LABEL[ph.status] ?? ph.status} · {Math.round(ph.progressPercent)}%
                {ph.tasks.length ? ` · ${ph.tasks.length} tâche${ph.tasks.length > 1 ? "s" : ""}` : ""}
              </Text>
            </View>
            <View style={styles.ganttDatesCol}>
              <Text style={styles.phaseDates}>
                {fmtDate(ph.plannedStart)} → {fmtDate(ph.plannedEnd)}
              </Text>
              <Text style={styles.phaseSub}>{days} j</Text>
            </View>
            <View style={styles.ganttBarCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: tone },
                  ]}
                />
                <View
                  style={[
                    styles.barProgress,
                    {
                      left: `${leftPct}%`,
                      width: `${(widthPct * ph.progressPercent) / 100}%`,
                    },
                  ]}
                />
              </View>
              {ph.tasks.length > 0 && (
                <View style={styles.taskList}>
                  {ph.tasks.slice(0, 6).map((t, i) => (
                    <Text key={i} style={styles.taskItem}>
                      • {t.name} ({fmtDate(t.plannedStart)} → {fmtDate(t.plannedEnd)} · {Math.round(t.progressPercent)}%)
                    </Text>
                  ))}
                  {ph.tasks.length > 6 && (
                    <Text style={styles.taskMore}>… et {ph.tasks.length - 6} tâche(s) supplémentaire(s)</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
      <Text style={styles.legend}>
        Durée totale chantier : {total} j — chronogramme à l&apos;échelle (les barres représentent la durée planifiée de chaque phase, le remplissage indique l&apos;avancement).
      </Text>
    </View>
  );
}

function Milestones({ milestones }: { milestones: PlanningMilestonePdf[] }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Jalons contractuels MOA ({milestones.length})</Text>
      {milestones.length === 0 ? (
        <Text style={styles.empty}>Aucun jalon saisi.</Text>
      ) : (
        <View>
          <View style={styles.msHeaderRow}>
            <Text style={[styles.msCell, { width: "10%" }]}>Code</Text>
            <Text style={[styles.msCell, { width: "55%" }]}>Description</Text>
            <Text style={[styles.msCell, { width: "20%", textAlign: "center" }]}>Échéance</Text>
            <Text style={[styles.msCell, { width: "15%", textAlign: "center" }]}>Statut</Text>
          </View>
          {milestones.map((m, i) => (
            <View key={i} style={styles.msRow}>
              <Text style={[styles.msCellBody, { width: "10%", fontWeight: 700 }]}>{m.code}</Text>
              <Text style={[styles.msCellBody, { width: "55%" }]}>{m.description}</Text>
              <Text style={[styles.msCellBody, { width: "20%", textAlign: "center" }]}>{fmtDate(m.contractDueDate)}</Text>
              <Text style={[styles.msCellBody, { width: "15%", textAlign: "center" }]}>
                {MS_STATUS_LABEL[m.status] ?? m.status}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Footer({ data }: { data: SitePlanningPdfData }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Planning généré le {fmtDate(data.generatedAt)}
        {data.authorName ? ` par ${data.authorName}` : ""} · {data.tenant.name}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontSize: 9,
    color: C.ink,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 8,
    borderBottomWidth: 1.2,
    borderBottomColor: C.primary,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerRight: { alignItems: "flex-end" },
  logo: { width: 48, height: 48, objectFit: "contain" },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: { color: "white", fontSize: 22, fontFamily: "Helvetica-Bold" },
  tenantName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.ink },
  tenantInfo: { fontSize: 7.5, color: C.mute, marginTop: 1 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.primary, letterSpacing: 1 },
  docMeta: { fontSize: 8, color: C.mute, marginTop: 2 },

  siteBlock: {
    flexDirection: "row",
    backgroundColor: C.primarySoft,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  siteCode: { fontSize: 8, color: C.primary, fontFamily: "Helvetica-Bold" },
  siteName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 1 },
  siteSub: { fontSize: 8.5, color: C.ink2, marginTop: 1 },
  siteStats: { flexDirection: "row", gap: 14, alignItems: "center" },
  stat: { alignItems: "flex-end" },
  statLabel: { fontSize: 7, color: C.mute, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 1 },

  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingBottom: 3,
  },
  empty: { fontSize: 9, color: C.mute, fontStyle: "italic" },

  ganttHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingBottom: 4,
    marginBottom: 4,
  },
  ganttLabelCol: { width: "22%", paddingRight: 4 },
  ganttDatesCol: { width: "18%", paddingRight: 4 },
  ganttBarCol: { width: "60%", paddingLeft: 4, position: "relative" },
  ganttColTitle: { fontSize: 8, color: C.mute, textTransform: "uppercase", letterSpacing: 0.5 },
  ganttAxis: { height: 14, position: "relative", borderBottomWidth: 0.5, borderBottomColor: C.lineSoft },
  tickLabel: { position: "absolute", top: 0, fontSize: 6.5, color: C.mute },
  ganttRow: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft },
  phaseName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink },
  phaseSub: { fontSize: 7.5, color: C.mute, marginTop: 1 },
  phaseDates: { fontSize: 8, color: C.ink2 },

  barTrack: { height: 10, backgroundColor: C.bg, borderRadius: 2, position: "relative" },
  barFill: { position: "absolute", top: 0, height: 10, borderRadius: 2, opacity: 0.45 },
  barProgress: { position: "absolute", top: 0, height: 10, borderRadius: 2, backgroundColor: C.primary },
  taskList: { marginTop: 3 },
  taskItem: { fontSize: 7, color: C.ink2, marginTop: 1 },
  taskMore: { fontSize: 7, color: C.mute, fontStyle: "italic", marginTop: 1 },
  legend: { fontSize: 7, color: C.mute, marginTop: 6, fontStyle: "italic" },

  msHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.primarySoft,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  msRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: C.lineSoft,
  },
  msCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 0.4 },
  msCellBody: { fontSize: 8.5, color: C.ink },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.mute,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 4,
  },
});
