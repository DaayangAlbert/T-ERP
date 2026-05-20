import * as React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PayslipDetail, PayslipLine } from "@/hooks/usePayslips";

// Police par défaut react-pdf : Helvetica garantie d'être présente.
// (Un test précédent avec Font.register de Noto Sans embedé provoquait des
// crashes intermittents au rendu sur Windows — restauration de l'état stable.)
const FONT_FAMILY = "Helvetica";

// Renumérotation 4 chiffres pour matcher la maquette officielle
const CATEGORY_PREFIX: Record<string, string> = {
  GAIN: "01",
  DEDUCTION_SOCIAL: "31",
  DEDUCTION_FISCAL: "32",
  DEDUCTION_OTHER: "33",
  EMPLOYER_SOCIAL: "41",
  EMPLOYER_OTHER: "42",
};
function displayCode(category: string, idx: number): string {
  return `${CATEGORY_PREFIX[category] ?? "00"}${String(idx).padStart(2, "0")}`;
}
function formatVerifCode(uuid: string): string {
  const c = uuid.replace(/-/g, "").toUpperCase().padEnd(16, "0").slice(0, 16);
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}`;
}

interface Props {
  payslip: PayslipDetail;
  qrDataUrl?: string;
  publicUrl?: string;
}

// Palette alignée sur l'écran (maquette T-ERP BTP)
const C = {
  violet: "#5b21b6",
  violetSoft: "#ede9fe",
  rose: "#be123c",
  roseSoft: "#fef2f2",
  sky: "#1d4ed8",
  skySoft: "#eff6ff",
  amber: "#d97706",
  amberSoft: "#fff7ed",
  emerald: "#047857",
  emeraldSoft: "#ecfdf5",
  ink: "#1f2937",
  inkSoft: "#374151",
  mute: "#6b7280",
  line: "#e5e7eb",
  bg: "#fafafa",
};

const MONTHS_FR = [
  "JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE",
];

function fmt(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n === 0) return "—";
  // Normalise les espaces fins (U+202F narrow NBSP, U+00A0 NBSP, U+2009 thin)
  // en espace classique U+0020 : les polices PDF embarquées ne disposent pas
  // toujours du glyphe et certains visualiseurs affichent un fallback "/".
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(n))
    .replace(/[   ]/g, " ");
}

function fmtDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", opts).format(d);
}

function fmtRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || rate === 0) return "—";
  return `${rate.toFixed(2).replace(".", ",")} %`;
}

function paymentLabel(mode: string): string {
  const map: Record<string, string> = {
    VIREMENT: "VIREMENT BANCAIRE",
    ESPECES: "EN ESPÈCES",
    CHEQUE: "PAR CHÈQUE",
    MOMO: "MOBILE MONEY",
  };
  return map[mode] ?? mode;
}

function sumLines(lines: PayslipLine[], field: "amountPlus" | "amountMinus" | "employerAmount"): bigint {
  return lines.reduce<bigint>((sum, l) => {
    const v = l[field];
    if (!v) return sum;
    try { return sum + BigInt(v); } catch { return sum; }
  }, 0n);
}

const styles = StyleSheet.create({
  // Marges modérées pour un rendu document officiel + le bulletin doit
  // tenir intégralement sur UNE page A4 paysage (842pt × 595pt).
  page: { padding: 12, fontFamily: FONT_FAMILY, fontSize: 8, color: C.ink, backgroundColor: "#fff" },

  // ─ Header
  header: { flexDirection: "row", gap: 8, paddingBottom: 6, borderBottom: `1pt solid ${C.line}` },
  headerLeft: { flex: 1.4, flexDirection: "row", gap: 7 },
  logoBox: {
    width: 40, height: 40, borderRadius: 4,
    backgroundColor: C.violet, alignItems: "center", justifyContent: "center",
  },
  logoTxt: { color: "#fff", fontWeight: 700, fontSize: 13 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  companyName: { fontWeight: 700, fontSize: 11, color: C.ink },
  companyTag: { fontSize: 8, color: C.mute, marginBottom: 2 },
  companyRow: { flexDirection: "row", fontSize: 8, marginBottom: 1 },
  companyLabel: { color: C.inkSoft, fontWeight: 700, marginRight: 3 },
  companyValue: { color: C.ink },

  headerCenter: { flex: 1, alignItems: "center", paddingTop: 2 },
  title: { fontSize: 17, fontWeight: 900, color: C.violet, letterSpacing: 0.5 },
  subtitle: { fontSize: 11, fontWeight: 700, color: C.violet, marginTop: 1 },
  periodPill: {
    marginTop: 3, backgroundColor: C.violetSoft, color: C.violet,
    paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999,
    fontSize: 8, fontWeight: 700,
  },
  compliance: { fontSize: 7, color: C.mute, marginTop: 3, textAlign: "center", fontStyle: "italic" },

  headerRight: { flex: 1, flexDirection: "row", gap: 5 },
  metaTable: { flex: 1 },
  metaRow: { flexDirection: "row", border: `0.5pt solid ${C.line}`, marginTop: -0.5 },
  metaLabel: { width: 78, backgroundColor: "#f3f4f6", color: C.inkSoft, fontWeight: 700, padding: 2, fontSize: 8, textTransform: "uppercase" },
  metaValue: { flex: 1, padding: 2, fontSize: 8, color: C.ink, textAlign: "right" },
  qrBlock: { width: 60, alignItems: "center", justifyContent: "flex-start", gap: 1.5 },
  qrImg: { width: 48, height: 48 },
  qrFallback: { width: 48, height: 48, borderWidth: 1, borderColor: "#000", borderStyle: "solid" },
  qrMeta: { fontSize: 7, color: C.mute, textAlign: "center" },
  qrCode: { fontSize: 7.5, color: C.inkSoft, letterSpacing: 0.5 },

  // ─ Employee + Recap — réplique de la maquette HTML (.bul-employee).
  // Grid 2 colonnes (carte employé | carte récap) sur fond gris léger.
  employeeBlock: {
    flexDirection: "row", gap: 6, marginTop: 4,
    padding: 5, backgroundColor: C.bg,
  },
  // Carte employé : fond blanc + bordure fine + radius (.bul-emp-card).
  empCard: {
    flex: 1.3,
    flexDirection: "row", gap: 7,
    backgroundColor: "#fff",
    border: `0.5pt solid ${C.line}`,
    borderRadius: 4,
    padding: 5,
  },
  // Photo (équivalent du 96px HTML, mis à l'échelle PDF) avec ring
  // gris clair comme .bul-emp-photo { border: 3px solid #f3f4f6 }.
  empPhotoBox: {
    width: 58, height: 58,
    borderRadius: 29,
    backgroundColor: C.line,
    border: `1pt solid #f3f4f6`,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  empPhoto: { width: 58, height: 58, objectFit: "cover" },
  empPhotoFallback: { fontSize: 15, fontWeight: 700, color: C.mute },
  empName: { fontSize: 12, fontWeight: 700, color: C.violet, marginBottom: 2, letterSpacing: 0.2 },
  empGrid: { flexDirection: "row", flexWrap: "wrap" },
  empRow: { flexDirection: "row", width: "50%", fontSize: 8, marginBottom: 0.5 },
  empRowLabel: { color: C.mute, fontWeight: 700, width: 70 },
  empRowValue: { color: C.ink, flex: 1 },

  // Carte récapitulatif : wrapper avec bordure autour de TOUT (band + body).
  // Reproduit .bul-recap-wrap { background: #fff; border: 1px solid #e5e7eb }.
  recap: {
    flex: 1.7,
    flexDirection: "column",
    backgroundColor: "#fff",
    border: `0.5pt solid ${C.line}`,
    borderRadius: 4,
    overflow: "hidden",
  },
  // Bande de titre RÉCAPITULATIF en haut, sur toute la largeur (le HTML
  // utilise un dégradé violet→rose, indisponible en react-pdf — on
  // approxime avec un violet pâle solide).
  recapBand: {
    backgroundColor: C.violetSoft, color: C.violet,
    fontSize: 9, fontWeight: 700,
    paddingHorizontal: 6, paddingVertical: 2.5,
    letterSpacing: 0.5,
  },
  // Corps du récap : 2 sous-colonnes (rows à gauche, KPIs à droite).
  recapBody: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  recapRows: { flex: 1.4, flexDirection: "column", justifyContent: "center", gap: 2 },
  recapRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
    fontSize: 9,
    borderBottom: `0.5pt dashed ${C.line}`,
    paddingBottom: 1.5,
  },
  recapRowLast: { borderBottom: "none", paddingBottom: 0 },
  recapKpis: { flex: 1, flexDirection: "column", gap: 3, justifyContent: "center" },
  kpiBox: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 3, paddingHorizontal: 4,
    backgroundColor: "#fff", border: `0.5pt solid ${C.line}`, borderRadius: 4,
  },
  kpiDot: { width: 14, height: 14, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  kpiDotEmerald: { backgroundColor: C.emerald },
  kpiDotViolet: { backgroundColor: "#8b5cf6" },
  kpiDotAmber: { backgroundColor: "#f59e0b" },
  kpiDotTxt: { color: "#fff", fontSize: 8, fontWeight: 700 },
  kpiLabel: { fontSize: 7, color: C.mute, textTransform: "uppercase" },
  kpiValue: { fontSize: 9, fontWeight: 700, color: C.ink },

  // ─ 4 colonnes
  // alignItems: stretch force les 4 colonnes à prendre la même hauteur
  // (celle de la plus longue, généralement RETENUES). Combiné à
  // marginTop:"auto" sur le bandeau TOTAL plus bas, ça aligne les
  // bandeaux du bas (TOTAL DES GAINS, ..., NET À PAYER) sur la même
  // ligne horizontale — comme sur la maquette officielle.
  columns: { flexDirection: "row", alignItems: "stretch", gap: 4, marginTop: 4 },
  col: { flex: 1, flexDirection: "column", border: `0.5pt solid ${C.line}`, borderRadius: 3, overflow: "hidden" },
  colSynth: { flex: 0.95 },
  colBand: { color: "#fff", fontWeight: 700, fontSize: 8, paddingHorizontal: 5, paddingVertical: 2.5, letterSpacing: 0.3 },
  bandViolet: { backgroundColor: C.violet },
  bandRose: { backgroundColor: C.rose },
  bandSky: { backgroundColor: C.sky },
  bandAmber: { backgroundColor: C.amber },
  colHead: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: `0.5pt solid ${C.line}`,
    paddingVertical: 1.5, paddingHorizontal: 3,
    fontSize: 6, fontWeight: 700, color: C.mute, textTransform: "uppercase",
  },
  // 4 col layout helpers
  cCode: { width: 20 },
  cLabel: { flex: 1.5 },
  cBase: { width: 32, textAlign: "right" },
  cRate: { width: 24, textAlign: "right" },
  cAmount: { width: 40, textAlign: "right" },

  line: {
    flexDirection: "row",
    paddingVertical: 1.3, paddingHorizontal: 3,
    fontSize: 7,
    borderBottom: `0.5pt dotted ${C.line}`,
  },
  lineCode: { color: C.mute },
  lineAmount: { fontWeight: 700, color: C.ink },
  emptyLine: { padding: 4, fontSize: 6.5, color: C.mute, fontStyle: "italic", textAlign: "center" },
  subHead: { paddingHorizontal: 3, paddingVertical: 1.5, fontSize: 6.5, fontWeight: 700, letterSpacing: 0.3 },
  subHeadRose: { backgroundColor: C.roseSoft, color: C.rose },
  subHeadSky: { backgroundColor: C.skySoft, color: C.sky },
  subTotal: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 4, paddingVertical: 1.8,
    backgroundColor: "#f9fafb", borderTop: `0.5pt solid ${C.line}`,
    fontSize: 7, fontWeight: 700, color: C.inkSoft,
  },
  colTotal: {
    // marginTop:"auto" pousse le bandeau TOTAL en bas de la colonne, peu
    // importe la longueur du contenu au-dessus. Garantit l'alignement
    // horizontal des bandeaux des cols 1/2/3.
    marginTop: "auto",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 5, paddingVertical: 2.5,
    color: "#fff", fontWeight: 700, fontSize: 8,
  },
  totalAmount: { fontSize: 9 },

  synthRows: { padding: 5 },
  synthRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 8, marginVertical: 1.2 },
  synthRowStrong: { fontWeight: 700, color: C.ink, borderTop: `0.5pt solid ${C.line}`, paddingTop: 2, marginTop: 1.5 },
  netBox: {
    // marginTop:"auto" pousse le bloc NET À PAYER (+ EN TOUTES LETTRES
    // qui suit) en bas de la col 4 SYNTHÈSE, alignant ce bandeau avec
    // les TOTAL des cols 1/2/3.
    marginTop: "auto",
    marginHorizontal: 5,
    marginBottom: 0,
    padding: 4,
    backgroundColor: C.emeraldSoft, border: `0.5pt solid ${C.emerald}`, borderRadius: 4,
  },
  netLabel: { fontSize: 7.5, fontWeight: 700, color: C.emerald },
  netValue: { fontSize: 12, fontWeight: 700, color: C.emerald, marginTop: 1 },
  wordsBox: {
    marginHorizontal: 5, marginTop: 3, marginBottom: 5, padding: 3,
    backgroundColor: C.amberSoft, border: `0.5pt solid #fdba74`, borderRadius: 4,
  },
  wordsLabel: { fontSize: 6.5, fontWeight: 700, color: "#c2410c", textAlign: "center" },
  wordsText: { fontSize: 7, color: "#7c2d12", textAlign: "center", marginTop: 1, fontStyle: "italic" },

  negative: { color: C.rose },

  // ─ Footer : harmonisé avec la zone des 4 colonnes (fond gris léger,
  // chaque bloc encadré comme une carte blanche). alignItems: stretch est
  // implicite en flexDirection: row mais on s'appuie dessus pour que les
  // 5 blocs (cumuls / congés / absences / infos / authentification)
  // aient la hauteur du plus grand (CUMULS).
  footer: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    padding: 4,
    backgroundColor: C.bg,
    borderTop: `1pt solid ${C.line}`,
  },
  footerBlock: {
    flex: 1,
    backgroundColor: "#fff",
    border: `0.5pt solid ${C.line}`,
    borderRadius: 3,
    padding: 4,
  },
  footerTitle: {
    fontSize: 7.5, fontWeight: 700, color: C.mute,
    textTransform: "uppercase", letterSpacing: 0.3,
    borderBottom: `0.5pt solid ${C.line}`, paddingBottom: 1.5, marginBottom: 2,
  },
  miniRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, marginVertical: 0.5 },
  miniLabel: { color: C.mute },
  miniValue: { color: C.ink, fontWeight: 700 },
  authMeta: { fontSize: 6.5, color: C.inkSoft, marginBottom: 3 },
  signature: { fontSize: 7.5, color: C.ink, fontWeight: 700, borderTop: `0.5pt solid ${C.line}`, paddingTop: 2, marginTop: 2 },

  bottomStrip: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 3, paddingTop: 3,
    borderTop: `0.5pt solid ${C.line}`,
    fontSize: 6.5, color: C.mute,
  },
});

// Styles dédiés au tableau de cumuls annuels (4 colonnes)
const cumulStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 1.6,
    borderBottom: `0.3pt dotted ${C.line}`,
  },
  totalRow: {
    borderTop: `1pt solid ${C.line}`,
    borderBottom: 0,
    marginTop: 1,
    paddingTop: 3,
  },
  cellHead: {
    flex: 1.5,
    fontSize: 6.5,
    fontWeight: 700,
    color: C.mute,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cellHeadNum: {
    flex: 1,
    fontSize: 6.5,
    fontWeight: 700,
    color: C.mute,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "right",
  },
  cell: { flex: 1.5, fontSize: 7.5, color: C.inkSoft },
  cellNum: { flex: 1, fontSize: 7.5, color: C.ink, textAlign: "right", fontFamily: FONT_FAMILY },
});

export function PayslipPDF({ payslip, qrDataUrl, publicUrl }: Props) {
  const period = new Date(payslip.period);
  const periodFrom = new Date(period.getFullYear(), period.getMonth(), 1);
  const periodTo = new Date(period.getFullYear(), period.getMonth() + 1, 0);
  const monthLabel = `MOIS DE ${MONTHS_FR[period.getMonth()]} ${period.getFullYear()}`;

  const gains = payslip.lines.filter((l) => l.category === "GAIN");
  const dedSocial = payslip.lines.filter((l) => l.category === "DEDUCTION_SOCIAL");
  const dedFiscal = payslip.lines.filter((l) => l.category === "DEDUCTION_FISCAL");
  const dedOther = payslip.lines.filter((l) => l.category === "DEDUCTION_OTHER");
  const empSocial = payslip.lines.filter((l) => l.category === "EMPLOYER_SOCIAL");
  const empOther = payslip.lines.filter((l) => l.category === "EMPLOYER_OTHER");

  const totalGains = sumLines(gains, "amountPlus");
  const totalDedSocial = sumLines(dedSocial, "amountMinus");
  const totalDedFiscal = sumLines(dedFiscal, "amountMinus");
  const totalDedOther = sumLines(dedOther, "amountMinus");
  const totalDeductions = totalDedSocial + totalDedFiscal + totalDedOther;
  const totalEmpSocial = sumLines(empSocial, "employerAmount");
  const totalEmpOther = sumLines(empOther, "employerAmount");
  const totalEmployer = totalEmpSocial + totalEmpOther;
  const totalCoutEmployeur = BigInt(payslip.grossAmount) + BigInt(totalEmployer);

  const employeeName = (payslip.snapshot?.fullName ?? `${payslip.user.firstName} ${payslip.user.lastName}`).trim();
  const initials = employeeName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const photoUrl = payslip.snapshot?.profilePhotoUrl ?? payslip.user.avatarUrl ?? null;

  return (
    <Document>
      {/* wrap={false} sur la View englobante empêche react-pdf de couper le
          bulletin sur plusieurs pages : la maquette officielle est UNE page
          unique A4 paysage, point. Si jamais le contenu déborde, il sera
          tronqué — mais avec le compactage actuel, il rentre confortablement. */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View wrap={false}>
        {/* ───── EN-TÊTE ───── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {payslip.tenant.logoUrl ? (
              <Image src={payslip.tenant.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoBox}>
                <Text style={styles.logoTxt}>{payslip.tenant.name.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>{payslip.tenant.name.toUpperCase()}</Text>
              <Text style={styles.companyTag}>BTP — Génie civil — Construction — Prestation de services</Text>
              {payslip.tenant.contactAddress && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Adresse :</Text>
                  <Text style={styles.companyValue}>{payslip.tenant.contactAddress}</Text>
                </View>
              )}
              {payslip.tenant.contactPhone && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Tél. :</Text>
                  <Text style={styles.companyValue}>{payslip.tenant.contactPhone}</Text>
                </View>
              )}
              {payslip.tenant.contactEmail && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Email :</Text>
                  <Text style={styles.companyValue}>{payslip.tenant.contactEmail}</Text>
                </View>
              )}
              {payslip.tenant.taxId && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>N° Contribuable :</Text>
                  <Text style={styles.companyValue}>{payslip.tenant.taxId}</Text>
                </View>
              )}
              {payslip.tenant.cnpsId && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>N° CNPS :</Text>
                  <Text style={styles.companyValue}>{payslip.tenant.cnpsId}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>BULLETIN DE PAIE</Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
            <Text style={styles.periodPill}>
              Période du {fmtDate(periodFrom)} au {fmtDate(periodTo)}
            </Text>
            <Text style={styles.compliance}>
              Document officiel conforme à la réglementation{"\n"}CNPS - DGI Cameroun
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>N° BULLETIN</Text>
                <Text style={styles.metaValue}>{payslip.bulletinNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>DATE D&apos;ÉDITION</Text>
                <Text style={styles.metaValue}>{fmtDate(payslip.paymentDate)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>MODE PAIEMENT</Text>
                <Text style={styles.metaValue}>{paymentLabel(payslip.paymentMode)}</Text>
              </View>
              {payslip.user.bankName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>BANQUE</Text>
                  <Text style={styles.metaValue}>{payslip.user.bankName.toUpperCase()}</Text>
                </View>
              )}
              {payslip.user.rib && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>COMPTE</Text>
                  <Text style={styles.metaValue}>{payslip.user.rib}</Text>
                </View>
              )}
            </View>
            <View style={styles.qrBlock}>
              {qrDataUrl ? <Image src={qrDataUrl} style={styles.qrImg} /> : <View style={styles.qrFallback} />}
              <Text style={styles.qrMeta}>Vérification{"\n"}@ {(publicUrl ?? payslip.verifiedPublicUrl).replace(/^https?:\/\//, "").slice(0, 22)}</Text>
              <Text style={styles.qrCode}>{formatVerifCode(payslip.verificationUuid)}</Text>
            </View>
          </View>
        </View>

        {/* ───── EMPLOYÉ + RÉCAPITULATIF ───── */}
        <View style={styles.employeeBlock}>
          <View style={styles.empCard}>
            <View style={styles.empPhotoBox}>
              {photoUrl ? <Image src={photoUrl} style={styles.empPhoto} /> : <Text style={styles.empPhotoFallback}>{initials}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{employeeName}</Text>
              <View style={styles.empGrid}>
                <EmpKV label="Matricule" value={payslip.user.matricule ?? payslip.user.employeeId} />
                <EmpKV label="Situation famille" value={payslip.user.familyStatus} />
                <EmpKV label="Fonction" value={payslip.user.position} />
                <EmpKV label="N° CNPS" value={payslip.user.cnpsNumber} />
                <EmpKV label="Département" value={payslip.user.department} />
                <EmpKV label="N° Carte CNPS" value={payslip.user.cnpsCardNumber} />
                <EmpKV label="Embauche" value={payslip.user.hireDate ? fmtDate(payslip.user.hireDate) : null} />
                <EmpKV label="N° Contribuable" value={payslip.user.niu} />
                <EmpKV label="Statut" value={payslip.user.contractType === "CDI" ? "Permanent" : payslip.user.contractType} />
                <EmpKV label="Échelon / Classe" value={[payslip.user.echelon, payslip.user.classCategory].filter(Boolean).join(" / ") || null} />
                <EmpKV
                  label="Indice / Coeff."
                  value={
                    payslip.user.indiceSalarial !== null || payslip.user.coefficientSalarial !== null
                      ? `${payslip.user.indiceSalarial ?? "—"} / ${payslip.user.coefficientSalarial?.toFixed(2).replace(".", ",") ?? "—"}`
                      : null
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.recap}>
            <Text style={styles.recapBand}>RÉCAPITULATIF</Text>
            <View style={styles.recapBody}>
              <View style={styles.recapRows}>
                <View style={styles.recapRow}>
                  <Text>Salaire de base</Text>
                  <Text>{fmt(payslip.lines.find((l) => l.code === "A001")?.amountPlus)} FCFA</Text>
                </View>
                <View style={styles.recapRow}>
                  <Text>Total gains</Text>
                  <Text>{fmt(totalGains.toString())} FCFA</Text>
                </View>
                <View style={styles.recapRow}>
                  <Text>Total retenues</Text>
                  <Text style={styles.negative}>- {fmt(totalDeductions.toString())} FCFA</Text>
                </View>
                <View style={[styles.recapRow, styles.recapRowLast]}>
                  <Text>Net imposable</Text>
                  <Text>{fmt(payslip.taxableGross)} FCFA</Text>
                </View>
              </View>

              <View style={styles.recapKpis}>
                <Kpi color="emerald" label="Net à payer" value={`${fmt(payslip.netAmount)} FCFA`} />
                <Kpi color="violet" label="Charges patronales" value={`${fmt(totalEmployer.toString())} FCFA`} />
                <Kpi color="amber" label="Coût total employeur" value={`${fmt(totalCoutEmployeur.toString())} FCFA`} />
              </View>
            </View>
          </View>
        </View>

        {/* ───── 4 COLONNES ───── */}
        <View style={styles.columns}>
          {/* GAINS */}
          <View style={styles.col}>
            <Text style={[styles.colBand, styles.bandViolet]}>1. GAINS</Text>
            <ColHead />
            <Lines lines={gains} mode="plus" />
            <View style={[styles.colTotal, styles.bandViolet]}>
              <Text>TOTAL DES GAINS</Text>
              <Text style={styles.totalAmount}>{fmt(totalGains.toString())}</Text>
            </View>
          </View>

          {/* RETENUES */}
          <View style={styles.col}>
            <Text style={[styles.colBand, styles.bandRose]}>2. RETENUES SALARIALES</Text>
            <ColHead />
            <Text style={[styles.subHead, styles.subHeadRose]}>A. ORGANISMES SOCIAUX</Text>
            <Lines lines={dedSocial} mode="minus" />
            <SubTot label="Sous-total Organismes Sociaux" value={fmt(totalDedSocial.toString())} />
            <Text style={[styles.subHead, styles.subHeadRose]}>B. PRÉLÈVEMENTS FISCAUX</Text>
            <Lines lines={dedFiscal} mode="minus" />
            <SubTot label="Sous-total Prélèvements Fiscaux" value={fmt(totalDedFiscal.toString())} />
            <Text style={[styles.subHead, styles.subHeadRose]}>C. AUTRES RETENUES</Text>
            <Lines lines={dedOther} mode="minus" />
            <SubTot label="Sous-total Autres Retenues" value={fmt(totalDedOther.toString())} />
            <View style={[styles.colTotal, styles.bandRose]}>
              <Text>TOTAL DES RETENUES</Text>
              <Text style={styles.totalAmount}>{fmt(totalDeductions.toString())}</Text>
            </View>
          </View>

          {/* CHARGES PATRONALES */}
          <View style={styles.col}>
            <Text style={[styles.colBand, styles.bandSky]}>3. CHARGES PATRONALES</Text>
            <ColHead />
            <Text style={[styles.subHead, styles.subHeadSky]}>A. ORGANISMES SOCIAUX</Text>
            <Lines lines={empSocial} mode="employer" />
            <SubTot label="Sous-total Organismes Sociaux" value={fmt(totalEmpSocial.toString())} />
            <Text style={[styles.subHead, styles.subHeadSky]}>B. AUTRES CHARGES</Text>
            <Lines lines={empOther} mode="employer" />
            <SubTot label="Sous-total Autres Charges" value={fmt(totalEmpOther.toString())} />
            <View style={[styles.colTotal, styles.bandSky]}>
              <Text>TOTAL CHARGES PATRONALES</Text>
              <Text style={styles.totalAmount}>{fmt(totalEmployer.toString())}</Text>
            </View>
          </View>

          {/* SYNTHÈSE */}
          <View style={[styles.col, styles.colSynth]}>
            <Text style={[styles.colBand, styles.bandAmber]}>4. SYNTHÈSE</Text>
            <View style={styles.synthRows}>
              <View style={styles.synthRow}>
                <Text>Total des gains</Text>
                <Text>{fmt(totalGains.toString())}</Text>
              </View>
              <View style={styles.synthRow}>
                <Text>Total des retenues</Text>
                <Text style={styles.negative}>- {fmt(totalDeductions.toString())}</Text>
              </View>
              <View style={[styles.synthRow, styles.synthRowStrong]}>
                <Text>Net imposable</Text>
                <Text>{fmt(payslip.taxableGross)}</Text>
              </View>
              <View style={styles.synthRow}>
                <Text>IRPP dû</Text>
                <Text style={styles.negative}>- {fmt(payslip.irppAmount)}</Text>
              </View>
            </View>
            <View style={styles.netBox}>
              <Text style={styles.netLabel}>NET À PAYER</Text>
              <Text style={styles.netValue}>{fmt(payslip.netAmount)} FCFA</Text>
            </View>
            <View style={styles.wordsBox}>
              <Text style={styles.wordsLabel}>EN TOUTES LETTRES</Text>
              <Text style={styles.wordsText}>{payslip.netInWords}</Text>
            </View>
          </View>
        </View>

        {/* ───── PIED ───── */}
        <View style={styles.footer}>
          <View style={[styles.footerBlock, { flex: 2 }]}>
            <Text style={styles.footerTitle}>CUMULS ANNUELS (DU 01/01/{period.getFullYear()})</Text>
            {/* Tableau 4 colonnes : Éléments / Imposable / Retenues / Net */}
            <View style={cumulStyles.row}>
              <Text style={cumulStyles.cellHead}>ÉLÉMENTS</Text>
              <Text style={cumulStyles.cellHeadNum}>CUMUL IMPOSABLE</Text>
              <Text style={cumulStyles.cellHeadNum}>CUMUL RETENUES</Text>
              <Text style={cumulStyles.cellHeadNum}>CUMUL NET</Text>
            </View>
            <View style={cumulStyles.row}>
              <Text style={cumulStyles.cell}>Salaires</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.salary)}</Text>
              <Text style={cumulStyles.cellNum}>—</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.salary)}</Text>
            </View>
            <View style={cumulStyles.row}>
              <Text style={cumulStyles.cell}>Primes &amp; Indemnités</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.bonuses)}</Text>
              <Text style={cumulStyles.cellNum}>—</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.bonuses)}</Text>
            </View>
            <View style={cumulStyles.row}>
              <Text style={cumulStyles.cell}>Heures supplémentaires</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.overtime)}</Text>
              <Text style={cumulStyles.cellNum}>—</Text>
              <Text style={cumulStyles.cellNum}>{fmt(payslip.cumul.overtime)}</Text>
            </View>
            <View style={[cumulStyles.row, cumulStyles.totalRow]}>
              <Text style={[cumulStyles.cell, { fontWeight: 700 }]}>Total</Text>
              <Text style={[cumulStyles.cellNum, { fontWeight: 700 }]}>{fmt(payslip.cumul.taxable)}</Text>
              <Text style={[cumulStyles.cellNum, { fontWeight: 700, color: C.rose }]}>- {fmt(payslip.cumul.deductions)}</Text>
              <Text style={[cumulStyles.cellNum, { fontWeight: 700, color: C.emerald }]}>{fmt(payslip.cumul.net)}</Text>
            </View>
          </View>

          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>CONGÉS PAYÉS</Text>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Acquis</Text>
              <Text style={styles.miniValue}>{payslip.leave.acquired.toFixed(2)} j</Text>
            </View>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Pris</Text>
              <Text style={styles.miniValue}>{payslip.leave.taken.toFixed(2)} j</Text>
            </View>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Solde</Text>
              <Text style={[styles.miniValue, { color: C.emerald }]}>{payslip.leave.remaining.toFixed(2)} j</Text>
            </View>
          </View>

          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>ABSENCES</Text>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Injustifiées</Text>
              <Text style={styles.miniValue}>{payslip.leave.unjustifiedAbsenceDays.toFixed(2)} j</Text>
            </View>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Retards</Text>
              <Text style={styles.miniValue}>{payslip.leave.delayHours.toFixed(2)} h</Text>
            </View>
          </View>

          <View style={[styles.footerBlock, { flex: 1.2 }]}>
            <Text style={styles.footerTitle}>INFORMATIONS COMPL.</Text>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Salaire base</Text>
              <Text style={styles.miniValue}>{fmt(payslip.lines.find((l) => l.code === "A001")?.amountPlus)} FCFA</Text>
            </View>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>Heures travaillées</Text>
              <Text style={styles.miniValue}>{payslip.reportedHours.toFixed(0)} h</Text>
            </View>
            <View style={styles.miniRow}>
              <Text style={styles.miniLabel}>H. supplémentaires</Text>
              <Text style={styles.miniValue}>{(payslip.lines.find((l) => l.code === "A005")?.quantity ?? 0).toFixed(0)} h</Text>
            </View>
          </View>

          <View style={[styles.footerBlock, { flex: 1.4 }]}>
            <Text style={styles.footerTitle}>AUTHENTIFICATION</Text>
            <Text style={styles.authMeta}>
              Bulletin généré le {fmtDate(payslip.issuedAt ?? payslip.paymentDate, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}{"\n"}
              par Système T-ERP{"\n"}
              {payslip.generatedIp && <>IP : {payslip.generatedIp}{"\n"}</>}
              Hash : {payslip.verificationUuid.slice(0, 12)}
            </Text>
            {/* Zone signature + cachet : le cachet se superpose à droite de
                la signature (rendu officiel). Container relatif de hauteur fixe. */}
            <View style={{ position: "relative", marginTop: 4, height: 64, width: "100%" }}>
              {payslip.tenant.signatureImageUrl ? (
                <Image
                  src={payslip.tenant.signatureImageUrl}
                  style={{ width: 130, height: 50, objectFit: "contain" }}
                />
              ) : null}
              {payslip.tenant.stampImageUrl ? (
                <Image
                  src={payslip.tenant.stampImageUrl}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: 0,
                    width: 62,
                    height: 62,
                    objectFit: "contain",
                    opacity: 0.85,
                  }}
                />
              ) : null}
            </View>
            <Text style={styles.signature}>{payslip.tenant.drhSignatoryName ?? "Responsable Paie"}</Text>
          </View>
        </View>

        <View style={styles.bottomStrip}>
          <Text>Document électronique sécurisé — Vérifier sur {(publicUrl ?? payslip.verifiedPublicUrl).replace(/^https?:\/\//, "")}</Text>
          <Text>T-ERP BTP &amp; SERVICES</Text>
        </View>
        </View>
      </Page>
    </Document>
  );
}

// ────── Composants helpers ──────
function ColHead() {
  return (
    <View style={styles.colHead}>
      <Text style={styles.cCode}>CODE</Text>
      <Text style={styles.cLabel}>DÉSIGNATION</Text>
      <Text style={styles.cBase}>BASE</Text>
      <Text style={styles.cRate}>TAUX</Text>
      <Text style={styles.cAmount}>MONTANT</Text>
    </View>
  );
}

function Lines({ lines, mode }: { lines: PayslipLine[]; mode: "plus" | "minus" | "employer" }) {
  if (lines.length === 0) return <Text style={styles.emptyLine}>— Aucune ligne —</Text>;
  return (
    <>
      {lines.map((l, i) => {
        const amount =
          mode === "plus" ? l.amountPlus :
          mode === "minus" ? l.amountMinus :
          l.employerAmount;
        return (
          <View key={l.id} style={styles.line}>
            <Text style={[styles.cCode, styles.lineCode]}>{displayCode(l.category, i + 1)}</Text>
            <Text style={styles.cLabel}>{l.label}</Text>
            <Text style={styles.cBase}>{fmt(l.base)}</Text>
            <Text style={styles.cRate}>{fmtRate(l.rate)}</Text>
            <Text style={[styles.cAmount, styles.lineAmount]}>{fmt(amount)}</Text>
          </View>
        );
      })}
    </>
  );
}

function SubTot({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.subTotal}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function EmpKV({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.empRow}>
      <Text style={styles.empRowLabel}>{label} :</Text>
      <Text style={styles.empRowValue}>{value || "—"}</Text>
    </View>
  );
}

function Kpi({ color, label, value }: { color: "emerald" | "violet" | "amber"; label: string; value: string }) {
  const dotStyle =
    color === "emerald" ? styles.kpiDotEmerald :
    color === "violet" ? styles.kpiDotViolet :
    styles.kpiDotAmber;
  const symbol = color === "emerald" ? "₣" : color === "violet" ? "P" : "€";
  return (
    <View style={styles.kpiBox}>
      <View style={[styles.kpiDot, dotStyle]}>
        <Text style={styles.kpiDotTxt}>{symbol}</Text>
      </View>
      <View>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );
}
