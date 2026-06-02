import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

// ───────── Couleurs ─────────
const C = {
  ink: "#1f2937",
  ink2: "#374151",
  mute: "#6b7280",
  line: "#cbd5e1",
  lineSoft: "#e2e8f0",
  lineGrid: "#94a3b8",
  bg: "#f8fafc",
  bgHeader: "#f1f5f9",
  bgInfoBox: "#fafbfc",
  title: "#1e3a8a", // bleu marine
  white: "#ffffff",
};

// ───────── Catégories de lots BTP (couleur barre + libellé légende) ─────────
const CATEGORIES = {
  INSTALLATION: {
    label: "INSTALLATION ET ÉTUDES",
    color: "#4A6FA5",
    keywords: [/install/i, /étude/i, /implant/i, /prépa/i, /signal/i, /clôt/i, /clot/i],
  },
  TERRASSEMENT: {
    label: "TERRASSEMENTS - FONDATIONS",
    color: "#4CAF50",
    keywords: [/terrassement/i, /fondation/i, /fouille/i, /excav/i, /décap/i, /semelle/i, /longrine/i, /dallage/i],
  },
  GROS_OEUVRE: {
    label: "GROS ŒUVRE",
    color: "#F39C12",
    keywords: [
      /gros\s*œuvre/i,
      /gros\s*oeuvre/i,
      /élévation/i,
      /elevation/i,
      /poteau/i,
      /poutre/i,
      /dalle/i,
      /maçonn/i,
      /maconn/i,
      /chaînage/i,
      /chainage/i,
      /escalier/i,
      /agglo/i,
      /planch/i,
    ],
  },
  CHARPENTE: {
    label: "CHARPENTE - COUVERTURE",
    color: "#5DADE2",
    keywords: [/charpente/i, /couverture/i, /toiture/i, /tôle/i, /tole/i, /chevron/i, /chéneau/i],
  },
  LOTS_TECHNIQUES: {
    label: "LOTS TECHNIQUES",
    color: "#9B59B6",
    keywords: [
      /électric/i,
      /electric/i,
      /plomberie/i,
      /réseau/i,
      /reseau/i,
      /climatis/i,
      /second\s*œuvre/i,
      /second\s*oeuvre/i,
      /cloison/i,
      /lot\s*tech/i,
      /assainiss/i,
      /étanch/i,
      /etanch/i,
    ],
  },
  REVETEMENTS: {
    label: "REVÊTEMENTS - FINITIONS",
    color: "#8B5A2B",
    keywords: [
      /revêtement/i,
      /revetement/i,
      /carrelage/i,
      /peinture/i,
      /menuis/i,
      /enduit/i,
      /finition/i,
      /faïence/i,
      /faience/i,
    ],
  },
  RECEPTION: {
    label: "RÉCEPTION",
    color: "#E74C3C",
    keywords: [/réception/i, /reception/i, /nettoy/i, /livraison/i, /opr/i, /réserve/i, /reserve/i],
  },
  AUTRE: {
    label: "AUTRES",
    color: "#6b7280",
    keywords: [],
  },
} as const;

type Category = (typeof CATEGORIES)[keyof typeof CATEGORIES];

function categoryFor(name: string): Category {
  for (const cat of Object.values(CATEGORIES)) {
    if (cat.keywords.some((rx) => rx.test(name))) return cat;
  }
  return CATEGORIES.AUTRE;
}

// ───────── Helpers ─────────
const DAY = 86_400_000;
const fmtShort = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(dt);
};
const fmtFull = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(dt);
};

// ───────── Types publics ─────────
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

// ───────── Composant principal ─────────
export function SitePlanningPDF({ data }: { data: SitePlanningPdfData }) {
  return (
    <Document
      title={`Planning d'exécution — ${data.site.code} ${data.site.name}`}
      author={data.authorName ?? data.tenant.name}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <TopHeader data={data} />
        <ProjectInfoStrip data={data} />
        <GanttTable data={data} />
        <BottomStrip data={data} />
        <Signatures data={data} />
      </Page>
    </Document>
  );
}

// ───────── En-tête (logo + titre + légende) ─────────
function TopHeader({ data }: { data: SitePlanningPdfData }) {
  const usedCategories = new Set<Category>();
  for (const ph of data.phases) usedCategories.add(categoryFor(ph.name));
  const legend = Array.from(usedCategories).filter((c) => c.label !== "AUTRES");

  return (
    <View style={styles.topHeader}>
      {/* GAUCHE : logo + entreprise */}
      <View style={styles.topLeft}>
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
          {data.tenant.taxId && (
            <Text style={styles.tenantInfo}>N° Contribuable : {data.tenant.taxId}</Text>
          )}
        </View>
      </View>

      {/* CENTRE : titre */}
      <View style={styles.topCenter}>
        <Text style={styles.title}>PLANNING D&apos;EXÉCUTION DES TRAVAUX</Text>
        <Text style={styles.subtitle}>DIAGRAMME DE GANTT</Text>
      </View>

      {/* DROITE : légende */}
      <View style={styles.legendBox}>
        <Text style={styles.legendTitle}>LÉGENDE</Text>
        {legend.length === 0 ? (
          <Text style={styles.legendEmpty}>—</Text>
        ) : (
          legend.map((cat) => (
            <View key={cat.label} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: cat.color }]} />
              <Text style={styles.legendLabel}>{cat.label}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ───────── Cartouche projet ─────────
function ProjectInfoStrip({ data }: { data: SitePlanningPdfData }) {
  const months = Math.round(data.totalDurationDays / 30.44);
  return (
    <View style={styles.projectStrip}>
      <View style={{ flex: 1 }}>
        <InfoLine label="PROJET" value={`${data.site.code} — ${data.site.name}`} bold />
        <InfoLine label="MAÎTRE D'OUVRAGE" value={data.site.moaName ?? "________________________"} />
        <InfoLine
          label="LIEU"
          value={[data.site.region, data.site.client].filter(Boolean).join(" · ") || "________________________"}
        />
      </View>
      <View style={{ width: 220 }}>
        <InfoLine label="DÉLAI CONTRACTUEL" value={`${months} MOIS`} bold />
        <InfoLine label="DATE DE DÉMARRAGE" value={fmtFull(data.site.startDate)} />
        <InfoLine label="DATE DE FIN PRÉVISIONNELLE" value={fmtFull(data.site.plannedEndDate)} />
      </View>
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

// ───────── Tableau Gantt ─────────
function GanttTable({ data }: { data: SitePlanningPdfData }) {
  const startMs = new Date(data.site.startDate).getTime();
  const endMs = new Date(data.site.plannedEndDate).getTime();
  // Étend si une phase déborde
  let minMs = startMs;
  let maxMs = endMs;
  for (const ph of data.phases) {
    minMs = Math.min(minMs, new Date(ph.plannedStart).getTime());
    maxMs = Math.max(maxMs, new Date(ph.plannedEnd).getTime());
  }
  // Aligne sur le début de semaine de minMs
  const span = Math.max(7 * DAY, maxMs - minMs);
  const totalWeeks = Math.max(4, Math.ceil(span / (7 * DAY)));
  const monthCount = Math.max(1, Math.ceil(totalWeeks / 4));

  return (
    <View style={styles.gantt}>
      {/* Ligne de tête : mois + semaines */}
      <View style={styles.tableHeaderRow}>
        <View style={[styles.colNum, styles.headCell]}>
          <Text style={styles.headText}>N°</Text>
        </View>
        <View style={[styles.colName, styles.headCell]}>
          <Text style={styles.headText}>TÂCHES / ACTIVITÉS</Text>
        </View>
        <View style={[styles.colDur, styles.headCell]}>
          <Text style={styles.headText}>DURÉE{"\n"}(sem.)</Text>
        </View>
        <View style={[styles.colDate, styles.headCell]}>
          <Text style={styles.headText}>DÉBUT</Text>
        </View>
        <View style={[styles.colDate, styles.headCell]}>
          <Text style={styles.headText}>FIN</Text>
        </View>
        <View style={styles.colGantt}>
          {/* Sous-tableau mois sur deux lignes */}
          <View style={styles.monthHeaderRow}>
            {Array.from({ length: monthCount }).map((_, i) => (
              <View key={i} style={[styles.monthCell, i === monthCount - 1 ? { borderRightWidth: 0.5 } : {}]}>
                <Text style={styles.monthLabel}>M{i + 1}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weekHeaderRow}>
            {Array.from({ length: monthCount }).map((_, mi) =>
              Array.from({ length: 4 }).map((_, wi) => (
                <View
                  key={`${mi}-${wi}`}
                  style={[
                    styles.weekCell,
                    wi === 3 ? { borderRightColor: C.lineGrid, borderRightWidth: 0.5 } : {},
                    mi === monthCount - 1 && wi === 3 ? { borderRightWidth: 0.5 } : {},
                  ]}
                >
                  <Text style={styles.weekLabel}>{wi + 1}</Text>
                </View>
              )),
            )}
          </View>
        </View>
        <View style={[styles.colProg, styles.headCell]}>
          <Text style={styles.headText}>AVANCEMENT{"\n"}(%)</Text>
        </View>
      </View>

      {/* Lignes phases */}
      {data.phases.map((ph, idx) => (
        <PhaseRow
          key={idx}
          index={idx + 1}
          phase={ph}
          minMs={minMs}
          totalWeeks={totalWeeks}
          monthCount={monthCount}
        />
      ))}
      {data.phases.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.empty}>Aucune phase saisie pour ce chantier.</Text>
        </View>
      )}
    </View>
  );
}

function PhaseRow({
  index,
  phase,
  minMs,
  totalWeeks,
  monthCount,
}: {
  index: number;
  phase: PlanningPhasePdf;
  minMs: number;
  totalWeeks: number;
  monthCount: number;
}) {
  const cat = categoryFor(phase.name);
  const phStart = new Date(phase.plannedStart).getTime();
  const phEnd = new Date(phase.plannedEnd).getTime();
  const startWeek = Math.max(0, (phStart - minMs) / (7 * DAY));
  const endWeek = Math.max(startWeek + 0.5, (phEnd - minMs) / (7 * DAY));
  const leftPct = (startWeek / totalWeeks) * 100;
  const widthPct = ((endWeek - startWeek) / totalWeeks) * 100;
  const durWeeks = Math.max(1, Math.round((phEnd - phStart) / (7 * DAY)));

  return (
    <View style={styles.bodyRow} wrap={false}>
      <View style={[styles.colNum, styles.bodyCell]}>
        <Text style={styles.bodyText}>{index}</Text>
      </View>
      <View style={[styles.colName, styles.bodyCell, { alignItems: "flex-start", paddingHorizontal: 4 }]}>
        <Text style={styles.phaseName}>{phase.name.toUpperCase()}</Text>
        {phase.tasks.length > 0 && (
          <Text style={styles.tasksLine}>
            {phase.tasks
              .slice(0, 3)
              .map((t) => t.name)
              .join(" · ")}
            {phase.tasks.length > 3 ? ` … (+${phase.tasks.length - 3})` : ""}
          </Text>
        )}
      </View>
      <View style={[styles.colDur, styles.bodyCell]}>
        <Text style={styles.bodyText}>{durWeeks}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.bodyText}>{fmtShort(phase.plannedStart)}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.bodyText}>{fmtShort(phase.plannedEnd)}</Text>
      </View>
      <View style={styles.colGantt}>
        {/* Quadrillage semaines */}
        <View style={styles.weekGrid}>
          {Array.from({ length: monthCount }).map((_, mi) =>
            Array.from({ length: 4 }).map((_, wi) => (
              <View
                key={`${mi}-${wi}`}
                style={[
                  styles.weekGridCell,
                  wi === 3 ? { borderRightColor: C.line, borderRightWidth: 0.4 } : {},
                ]}
              />
            )),
          )}
        </View>
        {/* Barre de Gantt */}
        <View
          style={[
            styles.ganttBar,
            { left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: cat.color },
          ]}
        />
      </View>
      <View style={[styles.colProg, styles.bodyCell]}>
        <Text style={[styles.bodyText, styles.progressText]}>{Math.round(phase.progressPercent)}%</Text>
      </View>
    </View>
  );
}

// ───────── Bandeau bas : récap + observations ─────────
function BottomStrip({ data }: { data: SitePlanningPdfData }) {
  const months = Math.round(data.totalDurationDays / 30.44);
  const weeks = Math.round(data.totalDurationDays / 7);
  return (
    <View style={styles.bottomStrip}>
      <View style={styles.recapBox}>
        <Text style={styles.boxTitle}>RÉCAPITULATIF</Text>
        <RecapLine label="DÉLAI CONTRACTUEL" value={`${months} MOIS`} />
        <RecapLine label="DURÉE EN SEMAINES" value={`${weeks} SEMAINES`} />
        <RecapLine label="DATE DE DÉMARRAGE" value={fmtFull(data.site.startDate)} />
        <RecapLine label="DATE DE FIN PRÉVISIONNELLE" value={fmtFull(data.site.plannedEndDate)} />
      </View>
      <View style={styles.milestonesBox}>
        <Text style={styles.boxTitle}>JALONS CONTRACTUELS MOA</Text>
        {data.milestones.length === 0 ? (
          <Text style={styles.empty}>Aucun jalon saisi.</Text>
        ) : (
          data.milestones.slice(0, 5).map((m, i) => (
            <View key={i} style={styles.milestoneLine}>
              <Text style={styles.milestoneCode}>{m.code}</Text>
              <Text style={styles.milestoneDesc}>{m.description}</Text>
              <Text style={styles.milestoneDate}>{fmtFull(m.contractDueDate)}</Text>
            </View>
          ))
        )}
      </View>
      <View style={styles.observationsBox}>
        <Text style={styles.boxTitle}>OBSERVATIONS</Text>
        <View style={styles.observationLines}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.dottedLine} />
          ))}
        </View>
      </View>
    </View>
  );
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recapLine}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapValue}>{value}</Text>
    </View>
  );
}

// ───────── Blocs signature ─────────
function Signatures({ data }: { data: SitePlanningPdfData }) {
  return (
    <View style={styles.signatures} wrap={false}>
      <SignBlock title="PRÉPARÉ PAR" role="CONDUCTEUR DES TRAVAUX" />
      <SignBlock title="VÉRIFIÉ PAR" role="CHEF DE PROJET" />
      <SignBlock title="APPROUVÉ PAR" role="DIRECTEUR DE PROJET" cachet />
      <View style={styles.notesBlock}>
        <Text style={styles.signTitle}>NOTES</Text>
        <Text style={styles.noteLine}>‣ Le présent planning est établi sur une base de 6 jours ouvrés par semaine.</Text>
        <Text style={styles.noteLine}>‣ Les dates peuvent être ajustées en fonction des aléas du chantier.</Text>
        <Text style={styles.noteLine}>‣ Toute modification fera l&apos;objet d&apos;une mise à jour du planning.</Text>
        <Text style={[styles.noteLine, { marginTop: 4, color: C.mute, fontSize: 6.5 }]}>
          Planning généré le {fmtFull(data.generatedAt)}
          {data.authorName ? ` par ${data.authorName}` : ""} · {data.tenant.name}
        </Text>
      </View>
    </View>
  );
}

function SignBlock({ title, role, cachet }: { title: string; role: string; cachet?: boolean }) {
  return (
    <View style={styles.signBlock}>
      <Text style={styles.signTitle}>{title} :</Text>
      <Text style={styles.signRole}>{role}</Text>
      <View style={styles.signField}>
        <Text style={styles.signFieldLabel}>Nom :</Text>
      </View>
      <View style={styles.signField}>
        <Text style={styles.signFieldLabel}>Date :</Text>
      </View>
      <View style={styles.signField}>
        <Text style={styles.signFieldLabel}>{cachet ? "Signature et cachet :" : "Signature :"}</Text>
      </View>
    </View>
  );
}

// ───────── Styles ─────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 18,
    fontSize: 8,
    color: C.ink,
    fontFamily: "Helvetica",
  },

  // En-tête
  topHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 0.6,
    borderColor: C.line,
    marginBottom: 4,
  },
  topLeft: {
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

  topCenter: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.6,
    borderRightColor: C.line,
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.title, letterSpacing: 1 },
  subtitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.title, marginTop: 2 },

  legendBox: { width: 175, padding: 6, backgroundColor: C.bgHeader },
  legendTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.title,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 1.5 },
  legendSwatch: { width: 14, height: 9, marginRight: 4, borderWidth: 0.3, borderColor: C.line },
  legendLabel: { fontSize: 7, color: C.ink2 },
  legendEmpty: { fontSize: 7, color: C.mute, fontStyle: "italic", textAlign: "center" },

  // Cartouche projet
  projectStrip: {
    flexDirection: "row",
    borderWidth: 0.6,
    borderColor: C.line,
    borderTopWidth: 0,
    backgroundColor: C.bgInfoBox,
    padding: 4,
    marginBottom: 0,
  },
  infoLine: { flexDirection: "row", marginVertical: 0.5 },
  infoLabel: { fontSize: 7.5, color: C.mute, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  infoValue: { fontSize: 8, color: C.ink, marginLeft: 4, flex: 1 },

  // Tableau
  gantt: { borderWidth: 0.6, borderColor: C.lineGrid, borderTopWidth: 0 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.bgHeader,
    minHeight: 28,
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
  colDur: { width: 34 },
  colDate: { width: 42 },
  colProg: { width: 50, borderRightWidth: 0 },
  colGantt: { flex: 1, position: "relative" },

  monthHeaderRow: { flexDirection: "row", height: 12, borderBottomWidth: 0.3, borderBottomColor: C.line },
  monthCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.3,
    borderRightColor: C.line,
  },
  monthLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.ink2 },
  weekHeaderRow: { flexDirection: "row", height: 10 },
  weekCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.2,
    borderRightColor: C.lineSoft,
  },
  weekLabel: { fontSize: 5, color: C.mute },

  bodyRow: { flexDirection: "row", minHeight: 18, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft },
  bodyCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.3,
    borderRightColor: C.line,
    padding: 1.5,
  },
  bodyText: { fontSize: 7.5, color: C.ink, textAlign: "center" },
  progressText: { fontFamily: "Helvetica-Bold", color: "#b91c1c" },
  phaseName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink },
  tasksLine: { fontSize: 6, color: C.mute, marginTop: 0.5 },

  weekGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" },
  weekGridCell: {
    flex: 1,
    borderRightWidth: 0.15,
    borderRightColor: C.lineSoft,
  },
  ganttBar: {
    position: "absolute",
    top: 4,
    height: 10,
    borderRadius: 1.5,
    borderWidth: 0.3,
    borderColor: "rgba(0,0,0,0.15)",
  },
  emptyRow: { padding: 14, alignItems: "center" },
  empty: { fontSize: 8, color: C.mute, fontStyle: "italic" },

  // Bas
  bottomStrip: {
    flexDirection: "row",
    marginTop: 6,
    gap: 4,
  },
  recapBox: {
    width: 200,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.bgInfoBox,
  },
  milestonesBox: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.white,
  },
  observationsBox: {
    width: 200,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.white,
  },
  boxTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.title,
    textAlign: "center",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  recapLine: { flexDirection: "row", justifyContent: "space-between", marginVertical: 1 },
  recapLabel: { fontSize: 7, color: C.ink2 },
  recapValue: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.ink },
  milestoneLine: { flexDirection: "row", marginVertical: 0.8, alignItems: "center" },
  milestoneCode: { width: 22, fontSize: 7, fontFamily: "Helvetica-Bold", color: C.title },
  milestoneDesc: { flex: 1, fontSize: 7, color: C.ink2 },
  milestoneDate: { width: 60, fontSize: 7, color: C.ink, textAlign: "right" },
  observationLines: { marginTop: 3 },
  dottedLine: {
    height: 0,
    borderBottomWidth: 0.4,
    borderBottomColor: C.line,
    borderBottomStyle: "dotted",
    marginVertical: 5,
  },

  // Signatures
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
  notesBlock: { flex: 1, padding: 3 },
  noteLine: { fontSize: 7, color: C.ink2, marginTop: 1 },
});
