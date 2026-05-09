import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PayslipDetail, PayslipLine } from "@/hooks/usePayslips";

const PAYMENT_MODE_LABEL: Record<string, string> = {
  VIREMENT: "VIREMENT",
  ESPECES: "EN ESPECES",
  CHEQUE: "PAR CHEQUE",
  MOMO: "MOBILE MONEY",
};

function fmt(amount: string | null | undefined): string {
  if (!amount) return "";
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}
function fmtRate(rate: number | null | undefined): string {
  if (!rate) return "";
  return rate.toFixed(2).replace(".", ",");
}
function fmtQty(q: number | null | undefined): string {
  if (!q) return "";
  return q.toString();
}
function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

const BORDER = "1pt solid #999";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#000",
  },
  // Header band
  topRow: {
    flexDirection: "row",
    borderTop: BORDER,
    borderLeft: BORDER,
    borderRight: BORDER,
  },
  topCellLeftEmpty: { width: "30%", borderRight: BORDER, padding: 4, minHeight: 18 },
  topCellPeriod: { width: "30%", borderRight: BORDER, padding: 4, fontStyle: "italic" },
  topCellLabel: { width: "15%", borderRight: BORDER, padding: 4, textAlign: "center" },
  topCellDate: { width: "15%", borderRight: BORDER, padding: 4, textAlign: "center", fontWeight: 700 },
  topCellMode: { width: "10%", padding: 4, textAlign: "center", fontWeight: 700 },

  // Title row
  titleRow: { flexDirection: "row", borderTop: BORDER, borderLeft: BORDER, borderRight: BORDER },
  titleBand: {
    width: "30%",
    borderRight: BORDER,
    padding: 5,
    backgroundColor: "#FEF3C7",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  titleHeadCell: {
    backgroundColor: "#D1F2EB",
    padding: 4,
    textAlign: "center",
    fontWeight: 600,
    borderRight: BORDER,
  },

  // Employer row
  blockRow: { flexDirection: "row", borderTop: BORDER, borderLeft: BORDER, borderRight: BORDER },
  employerCell: {
    width: "30%",
    backgroundColor: "#D6E4F5",
    padding: 6,
    borderRight: BORDER,
  },
  employerName: { fontWeight: 700, fontSize: 10, textAlign: "center", marginBottom: 3 },
  employerMeta: { fontSize: 8.5, lineHeight: 1.4 },
  cellCenter: { padding: 4, textAlign: "center", borderRight: BORDER },
  cellLeft: { padding: 4, borderRight: BORDER },
  cellEmpty: { padding: 4, borderRight: BORDER, minHeight: 18 },

  // Mid headers and values
  miniHead: {
    backgroundColor: "#D1F2EB",
    padding: 4,
    textAlign: "center",
    fontWeight: 600,
    borderRight: BORDER,
  },
  yellowCell: {
    backgroundColor: "#FFF8C5",
    padding: 4,
    textAlign: "center",
    fontWeight: 600,
    borderRight: BORDER,
  },
  greenCell: { backgroundColor: "#E8F5E9", padding: 4, textAlign: "center", borderRight: BORDER },

  // Identity full-width
  identityName: {
    width: "100%",
    padding: 5,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 11,
  },

  // Codes header
  codesHeaderRow: {
    flexDirection: "row",
    borderTop: BORDER,
    borderLeft: BORDER,
    borderRight: BORDER,
    backgroundColor: "#5DA9D8",
  },
  codeHead: {
    color: "#fff",
    padding: 5,
    textAlign: "center",
    fontWeight: 700,
    borderRight: BORDER,
  },
  // Code line columns
  codeLine: {
    flexDirection: "row",
    borderTop: BORDER,
    borderLeft: BORDER,
    borderRight: BORDER,
  },
  cCode: { width: "10%", padding: 4, textAlign: "center", borderRight: BORDER },
  cLabel: { width: "30%", padding: 4, borderRight: BORDER },
  cQty: { width: "8%", padding: 4, textAlign: "right", borderRight: BORDER },
  cBase: { width: "12%", padding: 4, textAlign: "right", borderRight: BORDER },
  cRate: { width: "8%", padding: 4, textAlign: "right", borderRight: BORDER },
  cPlus: { width: "12%", padding: 4, textAlign: "right", borderRight: BORDER },
  cMinus: { width: "10%", padding: 4, textAlign: "right", borderRight: BORDER },
  cPatron: { width: "10%", padding: 4, textAlign: "right" },

  // Totals row
  totalsRow: {
    flexDirection: "row",
    borderTop: "2pt solid #555",
    borderLeft: BORDER,
    borderRight: BORDER,
    backgroundColor: "#F7F7F7",
  },
  totalsLabel: {
    width: "60%",
    padding: 5,
    textAlign: "right",
    fontWeight: 700,
    borderRight: BORDER,
  },
  totalsPlus: { width: "12%", padding: 5, textAlign: "right", fontWeight: 700, borderRight: BORDER },
  totalsMinus: { width: "10%", padding: 5, textAlign: "right", fontWeight: 700, borderRight: BORDER },
  totalsPatron: { width: "10%", padding: 5, textAlign: "right", fontWeight: 700 },

  // Net row
  netRow: {
    flexDirection: "row",
    borderTop: "2pt solid #555",
    borderLeft: BORDER,
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  netLabel: {
    width: "60%",
    padding: 6,
    textAlign: "right",
    fontWeight: 700,
    fontSize: 11,
    borderRight: BORDER,
  },
  netValue: {
    width: "30%",
    padding: 6,
    textAlign: "center",
    backgroundColor: "#FEF3C7",
    fontWeight: 700,
    fontSize: 12,
    borderRight: BORDER,
  },
  netMode: {
    width: "10%",
    padding: 6,
    textAlign: "center",
    fontWeight: 700,
  },

  // Cumul band
  cumul: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F7F7F7",
    border: BORDER,
    fontSize: 8.5,
    color: "#333",
  },
  cumulMeta: { color: "#666", fontStyle: "italic", marginTop: 4 },
});

interface Props {
  payslip: PayslipDetail;
}

export function PayslipPDF({ payslip }: Props) {
  const periodFrom = new Date(payslip.period);
  const periodTo = new Date(periodFrom.getFullYear(), periodFrom.getMonth() + 1, 0);
  const tenantName = (payslip.tenant?.name ?? "").toUpperCase();
  const fullName = `${payslip.user.lastName.toUpperCase()} ${payslip.user.firstName}`;
  const seniority = payslip.user.hireDate
    ? `${Math.max(
        0,
        Math.floor((Date.now() - new Date(payslip.user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      )} mois`
    : "";

  const cotisations =
    Number(payslip.socialCharges) + Number(payslip.fiscalCharges);

  return (
    <Document
      title={`Bulletin ${tenantName} ${fullName} ${fmtDate(periodFrom)}`}
      author={tenantName}
    >
      <Page size="A4" style={styles.page}>
        {/* === Top : period + payment === */}
        <View style={styles.topRow}>
          <View style={styles.topCellLeftEmpty}>
            <Text> </Text>
          </View>
          <View style={styles.topCellPeriod}>
            <Text>
              Paie du {fmtDate(periodFrom)} au {fmtDate(periodTo)}
            </Text>
          </View>
          <View style={styles.topCellLabel}>
            <Text>Paiement le</Text>
          </View>
          <View style={styles.topCellDate}>
            <Text>{fmtDate(payslip.paymentDate)}</Text>
          </View>
          <View style={styles.topCellMode}>
            <Text>{PAYMENT_MODE_LABEL[payslip.paymentMode] ?? payslip.paymentMode}</Text>
          </View>
        </View>

        {/* === BULLETIN DE PAIE banner + headers === */}
        <View style={styles.titleRow}>
          <View style={styles.titleBand}>
            <Text>BULLETIN DE PAIE</Text>
          </View>
          <View style={[styles.titleHeadCell, { width: "12%" }]}>
            <Text>Matricule</Text>
          </View>
          <View style={[styles.titleHeadCell, { width: "13%" }]}>
            <Text>Catégorie</Text>
          </View>
          <View style={[styles.titleHeadCell, { width: "10%" }]}>
            <Text>Échelon</Text>
          </View>
          <View style={[styles.titleHeadCell, { width: "10%" }]}>
            <Text>Ancienneté</Text>
          </View>
          <View style={[styles.titleHeadCell, { width: "25%", borderRight: undefined }]}>
            <Text>N° CNPS</Text>
          </View>
        </View>

        {/* === Employer + matricule values === */}
        <View style={styles.blockRow}>
          <View style={styles.employerCell}>
            <Text style={styles.employerName}>{tenantName}</Text>
            <Text style={styles.employerMeta}>
              {payslip.tenant?.taxId ? `N° Contribuable : ${payslip.tenant.taxId}\n` : ""}
              {payslip.tenant?.cnpsId ? `N° CNPS employeur : ${payslip.tenant.cnpsId}\n` : ""}
              Cameroun
            </Text>
          </View>
          <View style={[styles.cellCenter, { width: "12%", fontWeight: 700 }]}>
            <Text>{payslip.user.employeeId ?? "—"}</Text>
          </View>
          <View style={[styles.cellCenter, { width: "13%" }]}>
            <Text>{payslip.user.category ?? ""}</Text>
          </View>
          <View style={[styles.cellEmpty, { width: "10%" }]}>
            <Text> </Text>
          </View>
          <View style={[styles.greenCell, { width: "10%" }]}>
            <Text>{seniority}</Text>
          </View>
          <View style={[styles.cellCenter, { width: "25%", borderRight: undefined }]}>
            <Text>{payslip.user.cnpsNumber ?? ""}</Text>
          </View>
        </View>

        {/* === Conv. coll. / Emploi / Département === */}
        <View style={styles.blockRow}>
          <View style={[styles.miniHead, { width: "30%" }]}>
            <Text>Conv. coll.</Text>
          </View>
          <View style={[styles.miniHead, { width: "45%" }]}>
            <Text>Emploi occupé</Text>
          </View>
          <View style={[styles.miniHead, { width: "25%", borderRight: undefined }]}>
            <Text>Département</Text>
          </View>
        </View>
        <View style={styles.blockRow}>
          <View style={[styles.cellCenter, { width: "30%" }]}>
            <Text>CCT BTP Cameroun</Text>
          </View>
          <View style={[styles.cellCenter, { width: "45%" }]}>
            <Text>{payslip.user.position ?? ""}</Text>
          </View>
          <View style={[styles.cellEmpty, { width: "25%", borderRight: undefined }]}>
            <Text> </Text>
          </View>
        </View>

        {/* === Hire date + Family situation === */}
        <View style={styles.blockRow}>
          <View style={[styles.cellEmpty, { width: "30%" }]}>
            <Text> </Text>
          </View>
          <View style={[styles.miniHead, { width: "25%" }]}>
            <Text>Date d'embauche</Text>
          </View>
          <View style={[styles.miniHead, { width: "10%" }]}>
            <Text>Horaire</Text>
          </View>
          <View style={[styles.miniHead, { width: "35%", borderRight: undefined }]}>
            <Text>SITUATION DE FAMILLE</Text>
          </View>
        </View>
        <View style={styles.blockRow}>
          <View style={[styles.cellEmpty, { width: "30%" }]}>
            <Text> </Text>
          </View>
          <View style={[styles.yellowCell, { width: "25%" }]}>
            <Text>{fmtDate(payslip.user.hireDate)}</Text>
          </View>
          <View style={[styles.cellCenter, { width: "10%" }]}>
            <Text>169h33</Text>
          </View>
          <View style={[styles.cellEmpty, { width: "35%", borderRight: undefined }]}>
            <Text> </Text>
          </View>
        </View>

        {/* === Employee identity === */}
        <View style={styles.blockRow}>
          <View style={[styles.cellEmpty, { width: "30%" }]}>
            <Text> </Text>
          </View>
          <View
            style={{
              width: "70%",
              padding: 5,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            <Text>{fullName}</Text>
          </View>
        </View>
        <View style={styles.blockRow}>
          <View style={[styles.cellEmpty, { width: "30%" }]}>
            <Text> </Text>
          </View>
          <View style={[styles.cellLeft, { width: "70%", borderRight: undefined }]}>
            <Text>N° de Compte :</Text>
          </View>
        </View>
        <View style={styles.blockRow}>
          <View style={[styles.cellEmpty, { width: "30%" }]}>
            <Text> </Text>
          </View>
          <View style={[styles.cellLeft, { width: "70%", borderRight: undefined }]}>
            <Text>Domiciliation :</Text>
          </View>
        </View>

        {/* === Codes header === */}
        <View style={styles.codesHeaderRow}>
          <View style={[styles.codeHead, { width: "10%" }]}>
            <Text>Code</Text>
          </View>
          <View style={[styles.codeHead, { width: "30%" }]}>
            <Text>LIBELLES</Text>
          </View>
          <View style={[styles.codeHead, { width: "8%" }]}>
            <Text>NOMBRE</Text>
          </View>
          <View style={[styles.codeHead, { width: "12%" }]}>
            <Text>BASE</Text>
          </View>
          <View style={[styles.codeHead, { width: "8%" }]}>
            <Text>TAUX</Text>
          </View>
          <View style={[styles.codeHead, { width: "12%" }]}>
            <Text>MONTANT+</Text>
          </View>
          <View style={[styles.codeHead, { width: "10%" }]}>
            <Text>MONTANT-</Text>
          </View>
          <View style={[styles.codeHead, { width: "10%", borderRight: undefined }]}>
            <Text>RET PATRON</Text>
          </View>
        </View>

        {/* === Lines === */}
        {payslip.lines.map((l) => (
          <BulletinLineRow key={l.id} line={l} />
        ))}

        {/* === Totals === */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsLabel}>
            <Text>TOTAUX</Text>
          </View>
          <View style={styles.totalsPlus}>
            <Text>{fmt(payslip.grossAmount)}</Text>
          </View>
          <View style={styles.totalsMinus}>
            <Text>{fmt(cotisations.toString())}</Text>
          </View>
          <View style={styles.totalsPatron}>
            <Text>{fmt(payslip.employerCharges)}</Text>
          </View>
        </View>

        {/* === Net to pay === */}
        <View style={styles.netRow}>
          <View style={styles.netLabel}>
            <Text>NET A PAYER</Text>
          </View>
          <View style={styles.netValue}>
            <Text>{fmt(payslip.netAmount)} FCFA</Text>
          </View>
          <View style={styles.netMode}>
            <Text>{PAYMENT_MODE_LABEL[payslip.paymentMode] ?? payslip.paymentMode}</Text>
          </View>
        </View>

        {/* === Cumul === */}
        <View style={styles.cumul}>
          <Text>
            Cumuls de l'année : Brut {fmt(payslip.grossAmount)} FCFA · Imposable{" "}
            {fmt(payslip.taxableGross)} FCFA · Charges salariales {fmt(cotisations.toString())} FCFA
          </Text>
          <Text style={styles.cumulMeta}>
            Bulletin généré le {fmtDate(new Date())} · à conserver sans limite — code du travail
            Cameroun
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function BulletinLineRow({ line }: { line: PayslipLine }) {
  const italic = line.code === "A001";
  const cellStyle = italic ? { fontStyle: "italic" as const } : {};
  return (
    <View style={styles.codeLine}>
      <View style={[styles.cCode, cellStyle]}>
        <Text>{line.code}</Text>
      </View>
      <View style={[styles.cLabel, cellStyle]}>
        <Text>{line.label}</Text>
      </View>
      <View style={[styles.cQty, cellStyle]}>
        <Text>{fmtQty(line.quantity)}</Text>
      </View>
      <View style={[styles.cBase, cellStyle]}>
        <Text>{fmt(line.base)}</Text>
      </View>
      <View style={[styles.cRate, cellStyle]}>
        <Text>{fmtRate(line.rate)}</Text>
      </View>
      <View style={[styles.cPlus, cellStyle]}>
        <Text>{fmt(line.amountPlus)}</Text>
      </View>
      <View style={[styles.cMinus, cellStyle]}>
        <Text>{fmt(line.amountMinus)}</Text>
      </View>
      <View style={[styles.cPatron, cellStyle]}>
        <Text>{fmt(line.employerAmount)}</Text>
      </View>
    </View>
  );
}
