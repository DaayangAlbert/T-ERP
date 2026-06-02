import * as React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
  Svg,
  Line,
} from "@react-pdf/renderer";

const C = {
  ink: "#1f2937",
  ink2: "#374151",
  mute: "#6b7280",
  line: "#cbd5e1",
  lineSoft: "#e2e8f0",
  lineGrid: "#94a3b8",
  bgHeader: "#f1f5f9",
  bgInfo: "#fafbfc",
  title: "#1e3a8a",
  primary: "#5b21b6",
  primarySoft: "#ede9fe",
  white: "#ffffff",
};
const DAY = 86_400_000;

const DOW = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(dt);
}
function fmtFull(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(dt);
}

export interface OperationalPlanPdfData {
  id: string;
  horizon: "MONTHLY" | "WEEKLY";
  periodStart: string;
  periodEnd: string;
  title: string | null;
  objective: string | null;
  author: string;
  authorRole: string | null;
  generatedAt: string;
  site: {
    code: string;
    name: string;
    client: string;
    region: string | null;
    moaName: string | null;
  };
  tasks: Array<{
    name: string;
    plannedStart: string;
    plannedEnd: string;
    progressPercent: number;
    assignedTeamId: string | null;
    notes: string | null;
  }>;
  tenant: {
    name: string;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    taxId: string | null;
    logoUrl: string | null;
  };
}

const PAPER_SIZES = [
  { name: "A4" as const, w: 842, h: 595 },
  { name: "A3" as const, w: 1191, h: 842 },
  { name: "A2" as const, w: 1684, h: 1191 },
];

function pickPaper(data: OperationalPlanPdfData) {
  const start = new Date(data.periodStart).getTime();
  const end = new Date(data.periodEnd).getTime();
  const days = Math.max(1, Math.ceil((end - start) / DAY));
  const minColW = data.horizon === "WEEKLY" ? 28 : 12; // hebdo : large ; mensuel : compact
  const fixedColsW = 22 + 180 + 50 + 50 + 50 + 28;
  const contentW = fixedColsW + days * minColW;

  const rowH = 16;
  const contentH = 100 + 35 + 26 + data.tasks.length * rowH + 90 + 35;

  for (const sz of PAPER_SIZES) {
    if (contentW <= sz.w && contentH <= sz.h) return sz;
  }
  return PAPER_SIZES[PAPER_SIZES.length - 1];
}

export function OperationalPlanPDF({ data }: { data: OperationalPlanPdfData }) {
  const paper = pickPaper(data);
  const horizonLabel = data.horizon === "MONTHLY" ? "MENSUEL" : "HEBDOMADAIRE";

  return (
    <Document
      title={`Planning ${horizonLabel.toLowerCase()} — ${data.site.code}`}
      author={data.author}
    >
      <Page size={paper.name} orientation="landscape" style={styles.page}>
        <Header data={data} horizonLabel={horizonLabel} />
        <ProjectStrip data={data} />
        <TaskTable data={data} />
        <SignatureRow data={data} />
      </Page>
    </Document>
  );
}

function Header({ data, horizonLabel }: { data: OperationalPlanPdfData; horizonLabel: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {data.tenant.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={data.tenant.logoUrl} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>{data.tenant.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ marginTop: 4, alignItems: "center" }}>
          <Text style={styles.tenantName}>{data.tenant.name}</Text>
          {data.tenant.contactAddress && (
            <Text style={styles.tenantInfo}>{data.tenant.contactAddress}</Text>
          )}
          <Text style={styles.tenantInfo}>
            {[data.tenant.contactPhone, data.tenant.contactEmail].filter(Boolean).join(" · ") || ""}
          </Text>
          {data.tenant.taxId && <Text style={styles.tenantInfo}>N° Contribuable : {data.tenant.taxId}</Text>}
        </View>
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.title}>PLANNING D&apos;EXÉCUTION {horizonLabel}</Text>
        <Text style={styles.subtitle}>
          {data.title ?? `${fmtFull(data.periodStart)} → ${fmtFull(data.periodEnd)}`}
        </Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.metaLabel}>ÉMIS LE</Text>
        <Text style={styles.metaValue}>{fmtFull(data.generatedAt)}</Text>
        <Text style={[styles.metaLabel, { marginTop: 6 }]}>RÉDIGÉ PAR</Text>
        <Text style={styles.metaValue}>{data.author}</Text>
        {data.authorRole && <Text style={styles.metaSub}>{data.authorRole}</Text>}
      </View>
    </View>
  );
}

function ProjectStrip({ data }: { data: OperationalPlanPdfData }) {
  return (
    <View style={styles.projectStrip}>
      <InfoLine label="PROJET" value={`${data.site.code} — ${data.site.name}`} bold />
      <InfoLine label="MAÎTRE D'OUVRAGE" value={data.site.moaName ?? "—"} />
      <InfoLine label="LIEU" value={[data.site.region, data.site.client].filter(Boolean).join(" · ") || "—"} />
      {data.objective && <InfoLine label="OBJECTIF" value={data.objective} />}
    </View>
  );
}

function InfoLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label} :</Text>
      <Text style={[styles.infoValue, bold ? { fontFamily: "Helvetica-Bold" } : {}]}>{value}</Text>
    </View>
  );
}

function TaskTable({ data }: { data: OperationalPlanPdfData }) {
  const start = new Date(data.periodStart).getTime();
  const end = new Date(data.periodEnd).getTime();
  // Étend si une tâche déborde
  let minMs = start;
  let maxMs = end;
  for (const t of data.tasks) {
    minMs = Math.min(minMs, new Date(t.plannedStart).getTime());
    maxMs = Math.max(maxMs, new Date(t.plannedEnd).getTime());
  }
  const span = Math.max(DAY, maxMs - minMs);
  const dayCount = Math.max(1, Math.ceil(span / DAY));

  return (
    <View style={styles.table}>
      {/* En-tête */}
      <View style={styles.headerRow}>
        <View style={[styles.colNum, styles.headCell]}>
          <Text style={styles.headText}>N°</Text>
        </View>
        <View style={[styles.colName, styles.headCell]}>
          <Text style={styles.headText}>TÂCHE / ACTIVITÉ</Text>
        </View>
        <View style={[styles.colTeam, styles.headCell]}>
          <Text style={styles.headText}>ÉQUIPE</Text>
        </View>
        <View style={[styles.colDate, styles.headCell]}>
          <Text style={styles.headText}>DÉBUT</Text>
        </View>
        <View style={[styles.colDate, styles.headCell]}>
          <Text style={styles.headText}>FIN</Text>
        </View>
        <View style={styles.colGrid}>
          <View style={styles.dayHeaderRow}>
            {Array.from({ length: dayCount }).map((_, i) => {
              const date = new Date(minMs + i * DAY);
              return (
                <View
                  key={i}
                  style={[
                    styles.dayCell,
                    date.getDay() === 0 ? { backgroundColor: "#fef2f2" } : {},
                    i === dayCount - 1 ? { borderRightWidth: 0 } : {},
                  ]}
                >
                  <Text style={styles.dayDow}>{DOW[date.getDay()]}</Text>
                  <Text style={styles.dayNum}>{date.getDate()}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={[styles.colProg, styles.headCell]}>
          <Text style={styles.headText}>%</Text>
        </View>
      </View>

      {/* Lignes tâches */}
      {data.tasks.length === 0 ? (
        <View style={{ padding: 14, alignItems: "center" }}>
          <Text style={styles.empty}>Aucune tâche saisie.</Text>
        </View>
      ) : (
        data.tasks.map((t, idx) => (
          <TaskRow key={idx} index={idx + 1} task={t} minMs={minMs} dayCount={dayCount} />
        ))
      )}
    </View>
  );
}

function TaskRow({
  index,
  task,
  minMs,
  dayCount,
}: {
  index: number;
  task: OperationalPlanPdfData["tasks"][number];
  minMs: number;
  dayCount: number;
}) {
  const tStart = new Date(task.plannedStart).getTime();
  const tEnd = new Date(task.plannedEnd).getTime();
  const startDay = Math.max(0, (tStart - minMs) / DAY);
  const endDay = Math.max(startDay + 0.5, (tEnd - minMs) / DAY);
  const leftPct = (startDay / dayCount) * 100;
  const widthPct = ((endDay - startDay) / dayCount) * 100;

  return (
    <View style={styles.bodyRow} wrap={false}>
      <View style={[styles.colNum, styles.bodyCell]}>
        <Text style={styles.bodyText}>{index}</Text>
      </View>
      <View style={[styles.colName, styles.bodyCell, { alignItems: "flex-start", paddingHorizontal: 4 }]}>
        <Text style={styles.taskName}>{task.name}</Text>
        {task.notes && <Text style={styles.taskNotes}>{task.notes}</Text>}
      </View>
      <View style={[styles.colTeam, styles.bodyCell]}>
        <Text style={styles.bodyText}>{task.assignedTeamId ?? "—"}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.bodyText}>{fmtDate(task.plannedStart)}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.bodyText}>{fmtDate(task.plannedEnd)}</Text>
      </View>
      <View style={styles.colGrid}>
        <View style={styles.dayGrid}>
          {Array.from({ length: dayCount }).map((_, i) => {
            const date = new Date(minMs + i * DAY);
            return (
              <View
                key={i}
                style={[
                  styles.dayGridCell,
                  date.getDay() === 0 ? { backgroundColor: "#fef2f2" } : {},
                ]}
              />
            );
          })}
        </View>
        <View
          style={[
            styles.taskBar,
            { left: `${leftPct}%`, width: `${widthPct}%` },
          ]}
        />
        {task.progressPercent > 0 && (
          <View
            style={[
              styles.taskBarProgress,
              { left: `${leftPct}%`, width: `${(widthPct * task.progressPercent) / 100}%` },
            ]}
          />
        )}
      </View>
      <View style={[styles.colProg, styles.bodyCell]}>
        <Text style={[styles.bodyText, styles.progressText]}>{Math.round(task.progressPercent)}%</Text>
      </View>
    </View>
  );
}

function SignatureRow({ data }: { data: OperationalPlanPdfData }) {
  return (
    <View style={styles.signatures} wrap={false}>
      <View style={styles.signBlock}>
        <Text style={styles.signTitle}>APPROUVÉ PAR :</Text>
        <Text style={styles.signRole}>DIRECTEUR DES TRAVAUX</Text>
        <View style={styles.signField}><Text style={styles.signFieldLabel}>Nom :</Text></View>
        <View style={styles.signField}><Text style={styles.signFieldLabel}>Date :</Text></View>
        <View style={styles.signField}><Text style={styles.signFieldLabel}>Signature et cachet :</Text></View>
      </View>
      <View style={styles.notesBlock}>
        <Text style={styles.signTitle}>NOTES</Text>
        <Text style={styles.noteLine}>‣ Planning prévisionnel · révisable selon aléas chantier.</Text>
        <Text style={styles.noteLine}>‣ Diffusion : chef de chantier, chefs d&apos;équipe, magasinier, sous-traitants concernés.</Text>
        <Text style={[styles.noteLine, { marginTop: 4, color: C.mute, fontSize: 6.5 }]}>
          Généré le {fmtFull(data.generatedAt)} par {data.author} · {data.tenant.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 18,
    fontSize: 8,
    color: C.ink,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 0.6,
    borderColor: C.line,
    marginBottom: 4,
  },
  headerLeft: {
    width: 150,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.6,
    borderRightColor: C.line,
  },
  logo: { width: 70, height: 50, objectFit: "contain" },
  logoFallback: {
    width: 60,
    height: 50,
    borderRadius: 4,
    backgroundColor: C.title,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: { color: "white", fontSize: 24, fontFamily: "Helvetica-Bold" },
  tenantName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink, textAlign: "center" },
  tenantInfo: { fontSize: 7, color: C.mute, textAlign: "center", marginTop: 1 },

  headerCenter: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.6,
    borderRightColor: C.line,
  },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.title, letterSpacing: 1 },
  subtitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.title, marginTop: 4 },

  headerRight: { width: 170, padding: 6, justifyContent: "center" },
  metaLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.mute, letterSpacing: 0.5 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 1 },
  metaSub: { fontSize: 7, color: C.mute, fontStyle: "italic" },

  projectStrip: {
    borderWidth: 0.6,
    borderTopWidth: 0,
    borderColor: C.line,
    backgroundColor: C.bgInfo,
    padding: 4,
  },
  infoLine: { flexDirection: "row", marginVertical: 0.5 },
  infoLabel: { fontSize: 7.5, color: C.mute, fontFamily: "Helvetica-Bold", letterSpacing: 0.3, width: 110 },
  infoValue: { fontSize: 8, color: C.ink, flex: 1 },

  table: { borderWidth: 0.6, borderColor: C.lineGrid, borderTopWidth: 0 },
  headerRow: {
    flexDirection: "row",
    backgroundColor: C.bgHeader,
    minHeight: 26,
    borderBottomWidth: 0.5,
    borderBottomColor: C.lineGrid,
  },
  headCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.lineGrid,
    padding: 2,
  },
  headText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.ink, textAlign: "center" },
  colNum: { width: 22 },
  colName: { width: 180 },
  colTeam: { width: 50 },
  colDate: { width: 50 },
  colProg: { width: 28, borderRightWidth: 0 },
  colGrid: { flex: 1, position: "relative" },

  dayHeaderRow: { flexDirection: "row", height: 26 },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.3,
    borderRightColor: C.line,
    paddingVertical: 1,
  },
  dayDow: { fontSize: 5.5, color: C.mute, textTransform: "uppercase" },
  dayNum: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.ink },

  bodyRow: { flexDirection: "row", minHeight: 16, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft },
  bodyCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.3,
    borderRightColor: C.line,
    padding: 1.5,
  },
  bodyText: { fontSize: 7.5, color: C.ink, textAlign: "center" },
  taskName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink },
  taskNotes: { fontSize: 6, color: C.mute, marginTop: 0.5 },
  progressText: { fontFamily: "Helvetica-Bold", color: "#b91c1c" },

  dayGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" },
  dayGridCell: { flex: 1, borderRightWidth: 0.15, borderRightColor: C.lineSoft },
  taskBar: {
    position: "absolute",
    top: 4,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: C.primarySoft,
    borderWidth: 0.3,
    borderColor: C.primary,
  },
  taskBarProgress: {
    position: "absolute",
    top: 4,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: C.primary,
  },

  empty: { fontSize: 8, color: C.mute, fontStyle: "italic" },

  signatures: {
    flexDirection: "row",
    marginTop: 6,
    borderTopWidth: 0.6,
    borderTopColor: C.line,
    paddingTop: 4,
    gap: 4,
  },
  signBlock: { flex: 1, padding: 3 },
  signTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.title, letterSpacing: 0.5 },
  signRole: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 1 },
  signField: { marginTop: 4 },
  signFieldLabel: { fontSize: 7, color: C.mute },
  notesBlock: { flex: 2, padding: 3 },
  noteLine: { fontSize: 7, color: C.ink2, marginTop: 1 },
});
