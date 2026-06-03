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
  Polyline,
  Circle,
} from "@react-pdf/renderer";

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
    keywords: [
      /terrassement/i,
      /fondation/i,
      /fouille/i,
      /excav/i,
      /décap/i,
      /semelle/i,
      /longrine/i,
      /dallage/i,
      // AEP : forage, captage, tranchées
      /forage/i,
      /captage/i,
      /tranchée/i,
      /tranchee/i,
      /puits/i,
      /tubage/i,
    ],
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
      // AEP : ouvrages génie civil
      /château\s*d'?eau/i,
      /chateau\s*d'?eau/i,
      /réservoir/i,
      /reservoir/i,
      /cuve/i,
      /\bfût\b/i,
      /radier/i,
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
      // AEP : canalisations, branchements, équipements hydrauliques
      /canalisation/i,
      /conduite/i,
      /branchement/i,
      /borne[\s-]*fontaine/i,
      /pehd/i,
      /\bpvc\b/i,
      /vanne/i,
      /compteur/i,
      /raccordement/i,
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
    keywords: [
      /réception/i,
      /reception/i,
      /nettoy/i,
      /livraison/i,
      /opr/i,
      /réserve/i,
      /reserve/i,
      // AEP : tests, désinfection, mise en service
      /désinfection/i,
      /desinfection/i,
      /chloration/i,
      /essai/i,
      /mise\s+en\s+service/i,
      /mise\s+en\s+eau/i,
      /analyse/i,
      /formation\s+exploitant/i,
    ],
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

// ───────── Sélection automatique du format papier ─────────
// On part de l'A4 paysage et on monte d'un cran (A3 → A2 → A1 → A0) si le
// contenu ne tient pas (trop de phases ou trop de mois). Garantit 1 page.
const PAPER_SIZES = [
  { name: "A4" as const, w: 842, h: 595 },
  { name: "A3" as const, w: 1191, h: 842 },
  { name: "A2" as const, w: 1684, h: 1191 },
  { name: "A1" as const, w: 2384, h: 1684 },
  { name: "A0" as const, w: 3370, h: 2384 },
];
type PaperName = (typeof PAPER_SIZES)[number]["name"];

function pickPaperSize(data: SitePlanningPdfData): { name: PaperName; w: number; h: number } {
  // Hauteur de contenu requise (estimation conservative)
  const phaseRowH = 18;
  const taskRowH = 14;
  const milestoneChipRowH = 14;
  const totalTasks = data.phases.reduce((sum, ph) => sum + ph.tasks.length, 0);
  const milestoneRows = Math.ceil(Math.max(1, data.milestones.length) / 4);
  const fixedH =
    100 /* en-tête */ +
    35 /* cartouche projet */ +
    30 /* en-tête tableau */ +
    milestoneRows * milestoneChipRowH +
    8 /* padding bandeau jalons */ +
    140 /* bandeau bas (récap + courbe + obs) */ +
    95 /* signatures + notes */ +
    35; /* marges page */
  const contentH = fixedH + data.phases.length * phaseRowH + totalTasks * taskRowH;

  // Largeur de contenu requise : colonnes fixes + grille Gantt à minWeekW pt/semaine
  const { monthCount } = computeMonthCount(data);
  const totalWeeks = monthCount * 4;
  const minWeekW = 7;
  const fixedColsW = 22 + 180 + 34 + 42 + 42 + 50 + 36;
  const contentW = fixedColsW + totalWeeks * minWeekW;

  for (const sz of PAPER_SIZES) {
    if (contentW <= sz.w && contentH <= sz.h) return sz;
  }
  return PAPER_SIZES[PAPER_SIZES.length - 1]; // A0 fallback (impossible en pratique)
}

// ───────── Composant principal ─────────
export function SitePlanningPDF({ data }: { data: SitePlanningPdfData }) {
  const paper = pickPaperSize(data);
  return (
    <Document
      title={`Planning d'exécution — ${data.site.code} ${data.site.name}`}
      author={data.authorName ?? data.tenant.name}
    >
      <Page size={paper.name} orientation="landscape" style={styles.page}>
        <TopHeader data={data} />
        <ProjectInfoStrip data={data} />
        <GanttTable data={data} />
        <MilestonesRow data={data} />
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

      {/* Lignes phases + leurs tâches détaillées */}
      {data.phases.map((ph, phIdx) => (
        <React.Fragment key={phIdx}>
          <PhaseRow
            index={phIdx + 1}
            phase={ph}
            minMs={minMs}
            totalWeeks={totalWeeks}
            monthCount={monthCount}
          />
          {ph.tasks.map((t, tIdx) => (
            <TaskRow
              key={tIdx}
              index={`${phIdx + 1}.${tIdx + 1}`}
              task={t}
              parentColor={categoryFor(ph.name).color}
              minMs={minMs}
              totalWeeks={totalWeeks}
              monthCount={monthCount}
            />
          ))}
        </React.Fragment>
      ))}
      {data.phases.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.empty}>Aucune phase saisie pour ce chantier.</Text>
        </View>
      )}
    </View>
  );
}

function TaskRow({
  index,
  task,
  parentColor,
  minMs,
  totalWeeks,
  monthCount,
}: {
  index: string;
  task: PlanningPhasePdf["tasks"][number];
  parentColor: string;
  minMs: number;
  totalWeeks: number;
  monthCount: number;
}) {
  const tStart = new Date(task.plannedStart).getTime();
  const tEnd = new Date(task.plannedEnd).getTime();
  const startWeek = Math.max(0, (tStart - minMs) / (7 * DAY));
  const endWeek = Math.max(startWeek + 0.3, (tEnd - minMs) / (7 * DAY));
  const leftPct = (startWeek / totalWeeks) * 100;
  const widthPct = ((endWeek - startWeek) / totalWeeks) * 100;
  const durWeeks = Math.max(1, Math.round((tEnd - tStart) / (7 * DAY)));

  return (
    <View style={styles.taskBodyRow} wrap={false}>
      <View style={[styles.colNum, styles.bodyCell]}>
        <Text style={styles.taskNumText}>{index}</Text>
      </View>
      <View style={[styles.colName, styles.bodyCell, { alignItems: "flex-start", paddingHorizontal: 4, paddingLeft: 14 }]}>
        <Text style={styles.taskNameText}>• {task.name}</Text>
      </View>
      <View style={[styles.colDur, styles.bodyCell]}>
        <Text style={styles.taskNumText}>{durWeeks}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.taskNumText}>{fmtShort(task.plannedStart)}</Text>
      </View>
      <View style={[styles.colDate, styles.bodyCell]}>
        <Text style={styles.taskNumText}>{fmtShort(task.plannedEnd)}</Text>
      </View>
      <View style={styles.colGantt}>
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
        {/* Barre tâche : plus fine + couleur atténuée */}
        <View
          style={[
            styles.taskGanttBar,
            { left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: parentColor, opacity: 0.55 },
          ]}
        />
      </View>
      <View style={[styles.colProg, styles.bodyCell]}>
        <Text style={[styles.taskNumText, styles.progressText]}>{Math.round(task.progressPercent)}%</Text>
      </View>
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

// ───────── Calculs courbe S (physique + financier) ─────────
function computeMonthCount(data: SitePlanningPdfData): { monthCount: number; minMs: number } {
  const startMs = new Date(data.site.startDate).getTime();
  const endMs = new Date(data.site.plannedEndDate).getTime();
  let minMs = startMs;
  let maxMs = endMs;
  for (const ph of data.phases) {
    minMs = Math.min(minMs, new Date(ph.plannedStart).getTime());
    maxMs = Math.max(maxMs, new Date(ph.plannedEnd).getTime());
  }
  const span = Math.max(7 * DAY, maxMs - minMs);
  const totalWeeks = Math.max(4, Math.ceil(span / (7 * DAY)));
  return { monthCount: Math.max(1, Math.ceil(totalWeeks / 4)), minMs };
}

function computePhysicalCurve(data: SitePlanningPdfData, monthCount: number, minMs: number): number[] {
  // Avancement physique cumulé à chaque borne de mois, pondéré par la durée des phases.
  let totalWeight = 0;
  for (const ph of data.phases) {
    const d = new Date(ph.plannedEnd).getTime() - new Date(ph.plannedStart).getTime();
    totalWeight += Math.max(0, d);
  }
  if (totalWeight === 0 || data.phases.length === 0) {
    // Pas de phases → courbe linéaire pour visualisation
    return Array.from({ length: monthCount + 1 }, (_, i) => Math.round((i / monthCount) * 100));
  }
  const monthMs = (30.44 * DAY);
  const curve: number[] = [];
  for (let m = 0; m <= monthCount; m++) {
    const boundary = minMs + m * monthMs;
    let cumulated = 0;
    for (const ph of data.phases) {
      const phStart = new Date(ph.plannedStart).getTime();
      const phEnd = new Date(ph.plannedEnd).getTime();
      if (phEnd <= phStart) continue;
      const overlap = Math.max(0, Math.min(phEnd, boundary) - phStart);
      cumulated += overlap;
    }
    curve.push(Math.min(100, Math.round((cumulated / totalWeight) * 100)));
  }
  return curve;
}

function computeFinancialCurve(physical: number[]): number[] {
  // L'avancement financier suit l'avancement physique avec ~1 mois de retard
  // (décompte produit après exécution + délai validation MOA + paiement).
  const n = physical.length;
  return physical.map((_, i) => {
    if (i <= 1) return 0;
    const lagged = physical[Math.max(0, i - 1)];
    const lagFactor = 0.7 + 0.3 * (i / Math.max(1, n - 1)); // moins de retard en fin de chantier
    return Math.min(100, Math.round(lagged * lagFactor));
  });
}

// ───────── Bandeau bas : récap + courbe S + observations ─────────
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
      <View style={styles.curveBox}>
        <Text style={styles.boxTitle}>COURBES D&apos;AVANCEMENT PHYSIQUE ET FINANCIER</Text>
        <SCurve data={data} />
      </View>
      <View style={styles.observationsBox}>
        <Text style={styles.boxTitle}>OBSERVATIONS</Text>
        <View style={styles.observationLines}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.dottedLine} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ───────── Bandeau jalons (au-dessus du bas, slim) ─────────
function MilestonesRow({ data }: { data: SitePlanningPdfData }) {
  if (data.milestones.length === 0) return null;
  return (
    <View style={styles.milestonesRow}>
      <Text style={styles.milestonesRowTitle}>JALONS CONTRACTUELS MOA</Text>
      <View style={styles.milestonesRowList}>
        {data.milestones.slice(0, 6).map((m, i) => (
          <View key={i} style={styles.milestoneChip}>
            <Text style={styles.milestoneChipCode}>{m.code}</Text>
            <Text style={styles.milestoneChipDesc}>
              {m.description} <Text style={styles.milestoneChipDate}>· {fmtFull(m.contractDueDate)}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ───────── Composant courbe S (SVG) ─────────
function SCurve({ data }: { data: SitePlanningPdfData }) {
  const { monthCount, minMs } = computeMonthCount(data);
  const physical = computePhysicalCurve(data, monthCount, minMs);
  const financial = computeFinancialCurve(physical);

  const W = 280;
  const H = 95;
  const padL = 20;
  const padR = 6;
  const padT = 6;
  const padB = 14;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xFor = (i: number) => padL + (i / Math.max(1, monthCount)) * chartW;
  const yFor = (pct: number) => padT + chartH * (1 - pct / 100);

  const physStr = physical
    .map((p, i) => `${xFor(i).toFixed(1)},${yFor(p).toFixed(1)}`)
    .join(" ");
  const finStr = financial
    .map((p, i) => `${xFor(i).toFixed(1)},${yFor(p).toFixed(1)}`)
    .join(" ");

  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <View style={{ width: W, height: H + 14, position: "relative" }}>
      <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Lignes horizontales (grille) */}
        {yTicks.map((p) => (
          <Line
            key={p}
            x1={padL}
            y1={yFor(p)}
            x2={W - padR}
            y2={yFor(p)}
            stroke={p === 0 || p === 100 ? "#cbd5e1" : "#e5e7eb"}
            strokeWidth={0.3}
          />
        ))}
        {/* Axe Y (vertical) */}
        <Line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#94a3b8" strokeWidth={0.4} />
        {/* Courbe physique (bleue) */}
        <Polyline points={physStr} stroke="#2563eb" strokeWidth={1.3} fill="none" />
        {/* Courbe financière (rouge) */}
        <Polyline points={finStr} stroke="#dc2626" strokeWidth={1.3} fill="none" />
        {/* Points physiques */}
        {physical.map((p, i) => (
          <Circle key={`p${i}`} cx={xFor(i)} cy={yFor(p)} r={1.4} fill="#2563eb" />
        ))}
        {/* Points financiers */}
        {financial.map((p, i) => (
          <Circle key={`f${i}`} cx={xFor(i)} cy={yFor(p)} r={1.4} fill="#dc2626" />
        ))}
      </Svg>
      {/* Étiquettes Y (gauche) */}
      {yTicks.map((p) => (
        <Text
          key={p}
          style={{
            position: "absolute",
            left: 0,
            top: yFor(p) - 4,
            width: padL - 2,
            textAlign: "right",
            fontSize: 6,
            color: "#6b7280",
          }}
        >
          {p}%
        </Text>
      ))}
      {/* Étiquettes X (mois en dessous) */}
      {Array.from({ length: monthCount + 1 }).map((_, i) => (
        <Text
          key={i}
          style={{
            position: "absolute",
            left: xFor(i) - 7,
            top: H - 2,
            width: 14,
            textAlign: "center",
            fontSize: 6,
            color: "#6b7280",
          }}
        >
          M{i + 1}
        </Text>
      ))}
      {/* Légende courbes */}
      <View style={styles.curveLegend}>
        <View style={styles.curveLegendItem}>
          <View style={[styles.curveLegendLine, { backgroundColor: "#2563eb" }]} />
          <Text style={styles.curveLegendLabel}>AVANCEMENT PHYSIQUE (%)</Text>
        </View>
        <View style={styles.curveLegendItem}>
          <View style={[styles.curveLegendLine, { backgroundColor: "#dc2626" }]} />
          <Text style={styles.curveLegendLabel}>AVANCEMENT FINANCIER (%)</Text>
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
      <SignBlock title="APPROUVÉ PAR" role="DIRECTEUR DES TRAVAUX" cachet />
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

  bodyRow: { flexDirection: "row", minHeight: 16, borderBottomWidth: 0.3, borderBottomColor: C.lineSoft },
  taskBodyRow: {
    flexDirection: "row",
    minHeight: 13,
    borderBottomWidth: 0.2,
    borderBottomColor: C.lineSoft,
    backgroundColor: "#fafbfc",
  },
  taskNumText: { fontSize: 6.8, color: C.mute, textAlign: "center" },
  taskNameText: { fontSize: 6.8, color: C.ink2 },
  taskGanttBar: {
    position: "absolute",
    top: 4,
    height: 6,
    borderRadius: 1.2,
    borderWidth: 0.25,
    borderColor: "rgba(0,0,0,0.1)",
  },
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
    width: 175,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.bgInfoBox,
  },
  curveBox: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.white,
    alignItems: "center",
  },
  observationsBox: {
    width: 175,
    borderWidth: 0.6,
    borderColor: C.line,
    padding: 5,
    backgroundColor: C.white,
  },
  curveLegend: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  curveLegendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  curveLegendLine: { width: 10, height: 1.5 },
  curveLegendLabel: { fontSize: 6.5, color: C.ink2, fontFamily: "Helvetica-Bold" },
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
  observationLines: { marginTop: 3 },
  // Bandeau jalons (slim, entre Gantt et BottomStrip)
  milestonesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    borderWidth: 0.5,
    borderColor: C.line,
    borderTopWidth: 0,
    backgroundColor: C.bgInfoBox,
    paddingVertical: 3,
    paddingHorizontal: 5,
    gap: 4,
  },
  milestonesRowTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.title,
    letterSpacing: 0.5,
    marginRight: 6,
  },
  milestonesRowList: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  milestoneChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 0.3,
    borderColor: C.line,
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  milestoneChipCode: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.title, marginRight: 3 },
  milestoneChipDesc: { fontSize: 6.8, color: C.ink2 },
  milestoneChipDate: { fontSize: 6.5, color: C.mute },
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
