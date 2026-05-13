import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PayslipDetail, PayslipLine } from "@/hooks/usePayslips";

interface Props {
  payslip: PayslipDetail;
  qrDataUrl?: string;
  publicUrl?: string;
}

const GOLD = "#D6A84F";
const PURPLE = "#2A1B3D";
const PRIMARY = "#A855F7";
const BORDER = "1pt solid #E5E7EB";

function fmt(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR").format(d);
}

function fmtPeriod(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(date));
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function lineAmount(lines: PayslipLine[], code: string, field: "amountPlus" | "amountMinus" | "employerAmount") {
  return lines
    .filter((line) => line.code === code)
    .reduce((sum, line) => sum + Number(line[field] ?? 0), 0);
}

function byPrefix(lines: PayslipLine[], prefix: string): PayslipLine[] {
  return lines.filter((line) => line.code.startsWith(prefix));
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  securityBand: {
    height: 6,
    backgroundColor: PURPLE,
    borderBottom: `2pt solid ${GOLD}`,
    marginBottom: 10,
  },
  header: { flexDirection: "row", gap: 10, marginBottom: 10 },
  company: {
    flex: 1.2,
    border: BORDER,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  logoFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  titlePanel: {
    flex: 1,
    border: `1.5pt solid ${PURPLE}`,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: 700, color: PURPLE, textTransform: "uppercase" },
  titleMeta: { marginTop: 4, color: "#6B7280", textTransform: "uppercase" },
  qrPanel: {
    width: 100,
    border: BORDER,
    borderRadius: 8,
    padding: 7,
    alignItems: "center",
  },
  qr: { width: 70, height: 70 },
  qrFallback: {
    width: 70,
    height: 70,
    border: `1pt solid ${PURPLE}`,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 4,
    fontSize: 6,
  },
  qrCode: { marginTop: 4, fontSize: 6, color: "#6B7280", textAlign: "center" },
  companyName: { fontSize: 12, fontWeight: 700, color: PURPLE, textTransform: "uppercase" },
  muted: { color: "#6B7280" },
  layout: { flexDirection: "row", gap: 10 },
  left: { width: "28%", gap: 8 },
  right: { flex: 1, gap: 8 },
  employeeCard: { border: BORDER, borderRadius: 8, padding: 9 },
  employeeTop: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  photo: { width: 48, height: 58, objectFit: "cover", borderRadius: 6 },
  photoFallback: {
    width: 48,
    height: 58,
    borderRadius: 6,
    backgroundColor: "#F3E8FF",
    color: "#7E22CE",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  employeeName: { fontSize: 11, fontWeight: 700, color: "#111827", textTransform: "uppercase" },
  section: { border: BORDER, borderRadius: 8, padding: 9 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: { color: PURPLE, fontSize: 9, fontWeight: 700, textTransform: "uppercase" },
  metricRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1pt solid #F3F4F6", paddingVertical: 2 },
  metricLabel: { color: "#6B7280" },
  metricValue: { fontWeight: 700, textAlign: "right" },
  summaryNet: {
    marginTop: 7,
    borderRadius: 8,
    padding: 9,
    backgroundColor: PURPLE,
    color: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryNetLabel: { textTransform: "uppercase", color: "#E9D5FF", fontSize: 9 },
  summaryNetValue: { fontSize: 15, fontWeight: 700 },
  columns: { flexDirection: "row", gap: 8 },
  column: { flex: 1, border: BORDER, borderRadius: 8, padding: 8 },
  tableHead: { flexDirection: "row", backgroundColor: PURPLE, color: "#FFFFFF", borderRadius: 4 },
  lineRow: { flexDirection: "row", borderBottom: "1pt solid #F3F4F6" },
  cell: { padding: 4 },
  cellCode: { width: "14%" },
  cellLabel: { width: "42%" },
  cellNumber: { width: "22%", textAlign: "right" },
  cellHeader: { fontSize: 6.5, fontWeight: 700 },
  auth: {
    marginTop: 8,
    border: `1pt solid ${GOLD}`,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFBEB",
  },
  footer: {
    marginTop: 8,
    borderTop: BORDER,
    paddingTop: 6,
    fontSize: 7,
    color: "#6B7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function PayslipPDF({ payslip, qrDataUrl, publicUrl }: Props) {
  const tenantName = payslip.tenant?.name ?? "Entreprise";
  const snapshot = payslip.snapshot;
  const firstName = snapshot?.firstName ?? payslip.user.firstName;
  const lastName = snapshot?.lastName ?? payslip.user.lastName;
  const fullName = snapshot?.fullName ?? `${firstName} ${lastName}`;
  const matricule = snapshot?.matricule ?? payslip.user.matricule ?? payslip.user.employeeId ?? "-";
  const category = snapshot?.category ?? payslip.user.category ?? "-";
  const position = snapshot?.position ?? payslip.user.position ?? "-";
  const photoUrl = snapshot?.profilePhotoUrl ?? payslip.user.avatarUrl ?? null;
  const bankName = snapshot?.bankName ?? payslip.user.bankName ?? "-";
  const bankAccount = snapshot?.bankAccount ?? payslip.user.rib ?? payslip.paymentBankAccount ?? "-";
  const periodStart = new Date(payslip.period);
  const periodEnd = payslip.periodEnd ? new Date(payslip.periodEnd) : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
  const gains = byPrefix(payslip.lines, "A");
  const deductions = byPrefix(payslip.lines, "B");
  const employerCharges = byPrefix(payslip.lines, "C");
  const gross = Number(payslip.grossAmount);
  const totalDeductions = Number(payslip.socialCharges) + Number(payslip.fiscalCharges) + Number(payslip.otherDeductions ?? 0);

  return (
    <Document title={`Bulletin ${tenantName} ${fullName} ${fmtPeriod(payslip.period)}`} author={tenantName}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.securityBand} />
        <View style={styles.header}>
          <View style={styles.company}>
            {payslip.tenant?.logoUrl ? (
              <Image src={payslip.tenant.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text>{tenantName.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.companyName}>{tenantName}</Text>
              <Text style={styles.muted}>NIU : {payslip.tenant?.taxId ?? "-"}</Text>
              <Text style={styles.muted}>CNPS employeur : {payslip.tenant?.cnpsId ?? "-"}</Text>
              <Text style={styles.muted}>Document securise T-ERP</Text>
            </View>
          </View>
          <View style={styles.titlePanel}>
            <Text style={styles.title}>Bulletin de paie</Text>
            <Text style={styles.titleMeta}>{fmtPeriod(payslip.period)}</Text>
            <Text style={styles.titleMeta}>
              Du {fmtDate(periodStart)} au {fmtDate(periodEnd)}
            </Text>
          </View>
          <View style={styles.qrPanel}>
            {qrDataUrl ? (
              <Image src={qrDataUrl} style={styles.qr} />
            ) : (
              <View style={styles.qrFallback}>
                <Text>QR verification</Text>
              </View>
            )}
            <Text style={styles.qrCode}>{payslip.verificationCode ?? "CODE A GENERER"}</Text>
          </View>
        </View>

        <View style={styles.layout}>
          <View style={styles.left}>
            <View style={styles.employeeCard}>
              <View style={styles.employeeTop}>
                {photoUrl ? (
                  <Image src={photoUrl} style={styles.photo} />
                ) : (
                  <View style={styles.photoFallback}>
                    <Text>{initials(firstName, lastName)}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.employeeName}>{fullName}</Text>
                  <Text style={styles.muted}>{position}</Text>
                  <Text style={styles.muted}>Matricule {matricule}</Text>
                </View>
              </View>
              <Metric label="Categorie" value={category} />
              <Metric label="Contrat" value={snapshot?.contractType ?? payslip.user.contractType ?? "-"} />
              <Metric label="Date embauche" value={fmtDate(snapshot?.hireDate ?? payslip.user.hireDate)} />
              <Metric label="N CNPS" value={snapshot?.cnpsNumber ?? payslip.user.cnpsNumber ?? "-"} />
              <Metric label="Mode paiement" value={payslip.paymentMode} />
              <Metric label="Banque" value={bankName} />
              <Metric label="Compte bancaire" value={bankAccount} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recapitulatif</Text>
              </View>
              <Metric label="Salaire brut" value={`${fmt(payslip.grossAmount)} FCFA`} />
              <Metric label="Brut imposable" value={`${fmt(payslip.taxableGross)} FCFA`} />
              <Metric label="Retenues" value={`${fmt(totalDeductions)} FCFA`} />
              <Metric label="Charges patronales" value={`${fmt(payslip.employerCharges)} FCFA`} />
              <View style={styles.summaryNet}>
                <Text style={styles.summaryNetLabel}>Net a payer</Text>
                <Text style={styles.summaryNetValue}>{fmt(payslip.netAmount)} FCFA</Text>
              </View>
            </View>

            <View style={styles.auth}>
              <Text style={styles.sectionTitle}>Authentification</Text>
              <Text>Code : {payslip.verificationCode ?? "-"}</Text>
              <Text>URL : {publicUrl ?? payslip.verifiedPublicUrl ?? "-"}</Text>
              <Text>Statut : {payslip.status}</Text>
            </View>
          </View>

          <View style={styles.right}>
            <View style={styles.columns}>
              <LineSection title="1. Gains" lines={gains} field="amountPlus" total={gross} />
              <LineSection title="2. Retenues salariales" lines={deductions} field="amountMinus" total={totalDeductions} />
            </View>
            <View style={styles.columns}>
              <LineSection
                title="3. Charges patronales"
                lines={employerCharges}
                field="employerAmount"
                total={Number(payslip.employerCharges)}
              />
              <View style={styles.column}>
                <Text style={styles.sectionTitle}>4. Synthese</Text>
                <Metric label="Base CNPS" value={`${fmt(lineAmount(payslip.lines, "B001", "amountMinus") ? payslip.taxableGross : "0")} FCFA`} />
                <Metric label="CNPS salarie" value={`${fmt(payslip.cnpsAmount)} FCFA`} />
                <Metric label="IRPP" value={`${fmt(payslip.irppAmount)} FCFA`} />
                <Metric label="Autres retenues" value={`${fmt(payslip.otherDeductions ?? "0")} FCFA`} />
                <Metric label="Cumul brut annuel" value={`${fmt(payslip.grossAmount)} FCFA`} />
                <Metric label="Conges payes" value="A renseigner" />
                <Metric label="Absences" value="A renseigner" />
                <Metric label="Edition" value={fmtDate(payslip.issuedAt ?? new Date().toISOString())} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Bulletin securise. Le QR code et le bouton employe ouvrent le meme lien public de verification.
          </Text>
          <Text>Cachet / signature entreprise</Text>
        </View>
      </Page>
    </Document>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function LineSection({
  title,
  lines,
  field,
  total,
}: {
  title: string;
  lines: PayslipLine[];
  field: "amountPlus" | "amountMinus" | "employerAmount";
  total: number;
}) {
  return (
    <View style={styles.column}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <View style={[styles.cell, styles.cellCode]}>
          <Text style={styles.cellHeader}>Code</Text>
        </View>
        <View style={[styles.cell, styles.cellLabel]}>
          <Text style={styles.cellHeader}>Libelle</Text>
        </View>
        <View style={[styles.cell, styles.cellNumber]}>
          <Text style={styles.cellHeader}>Base</Text>
        </View>
        <View style={[styles.cell, styles.cellNumber]}>
          <Text style={styles.cellHeader}>Montant</Text>
        </View>
      </View>
      {lines.map((line) => (
        <View key={line.id} style={styles.lineRow}>
          <View style={[styles.cell, styles.cellCode]}>
            <Text>{line.code}</Text>
          </View>
          <View style={[styles.cell, styles.cellLabel]}>
            <Text>{line.label}</Text>
          </View>
          <View style={[styles.cell, styles.cellNumber]}>
            <Text>{fmt(line.base)}</Text>
          </View>
          <View style={[styles.cell, styles.cellNumber]}>
            <Text>{fmt(line[field])}</Text>
          </View>
        </View>
      ))}
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Total</Text>
        <Text style={styles.metricValue}>{fmt(total)} FCFA</Text>
      </View>
    </View>
  );
}
