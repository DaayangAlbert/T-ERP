/**
 * Génération PDF d'un bulletin de paie BatimCAM.
 *
 * Layout simple, lisible, A4 portrait, conforme aux usages camerounais
 * (en-tête employeur · pavé employé · tableau composantes · totaux ·
 * mention CNPS). La version "ENSAH pixel-perfect avec codes SYSCOHADA
 * A001-A072" mentionnée par la doc viendra plus tard via un template
 * dédié — ici on couvre les besoins de la fonction 1.2 (consultation
 * mobile, envoi WhatsApp).
 */
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatFcfa, formatPeriodLabel } from "@/lib/emp-format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  header: { borderBottomWidth: 2, borderBottomColor: "#A855F7", paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 16, fontWeight: 700, color: "#7E22CE" },
  brandSubtitle: { fontSize: 9, color: "#475569", marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 6 },
  block: { borderWidth: 1, borderColor: "#E2E8F0", padding: 10, marginBottom: 10 },
  blockTitle: { fontSize: 9, color: "#7E22CE", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: "#475569", flex: 1 },
  value: { color: "#0F172A", fontWeight: 700 },
  table: { borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableHeaderCell: { fontSize: 8, color: "#475569", fontWeight: 700, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  cellLabel: { flex: 3 },
  cellQty: { flex: 1, textAlign: "right" },
  cellAmount: { flex: 2, textAlign: "right", fontWeight: 700 },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#F5F3FF",
    borderTopWidth: 1,
    borderTopColor: "#A855F7",
  },
  totalLabel: { flex: 3, fontWeight: 700, color: "#7E22CE" },
  totalAmount: { flex: 2, textAlign: "right", fontWeight: 700, color: "#7E22CE", fontSize: 11 },
  netBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#7E22CE",
    color: "#FFFFFF",
    borderRadius: 6,
  },
  netLabel: { color: "#E9D5FF", fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  netAmount: { color: "#FFFFFF", fontSize: 18, fontWeight: 700, marginTop: 2 },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    fontSize: 7,
    color: "#64748B",
    textAlign: "center",
  },
});

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export interface PayslipPdfData {
  period: Date;
  periodLabel: string | null;
  periodEnd: Date | null;
  paymentDate: Date;
  paymentBankAccount: string | null;
  paymentReference: string | null;
  baseSalary: number;
  overtimeAmount: number;
  overtimeHours: number;
  overtimeHours125: number;
  overtimeHours150: number;
  overtimeHours200: number;
  seniorityBonus: number;
  transportAllowance: number;
  grossAmount: number;
  cnpsAmount: number;
  irppAmount: number;
  otherDeductions: number;
  netAmount: number;
  workedDays: number;
  reportedHours: number;
  employee: {
    fullName: string;
    matricule: string;
    position: string | null;
    professionalCategory: string | null;
    cnpsNumber: string | null;
    niu: string | null;
    hireDate: Date | null;
    bankInfo: string | null;
  };
}

export function PayslipDocument({ data }: { data: PayslipPdfData }) {
  const overtimeLabel = [
    data.overtimeHours125 > 0 ? `${data.overtimeHours125} h × 125 %` : null,
    data.overtimeHours150 > 0 ? `${data.overtimeHours150} h × 150 %` : null,
    data.overtimeHours200 > 0 ? `${data.overtimeHours200} h × 200 %` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>BatimCAM SA</Text>
          <Text style={styles.brandSubtitle}>
            BTP Cameroun · NIU M021800012345 · CNPS Employeur CNPS-EMP-218
          </Text>
          <Text style={styles.title}>Bulletin de paie · {formatPeriodLabel(data.periodLabel, data.period)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Salarié</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom et prénom</Text>
            <Text style={styles.value}>{data.employee.fullName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Matricule</Text>
            <Text style={styles.value}>{data.employee.matricule}</Text>
          </View>
          {data.employee.position && (
            <View style={styles.row}>
              <Text style={styles.label}>Poste</Text>
              <Text style={styles.value}>{data.employee.position}</Text>
            </View>
          )}
          {data.employee.professionalCategory && (
            <View style={styles.row}>
              <Text style={styles.label}>Catégorie</Text>
              <Text style={styles.value}>{data.employee.professionalCategory}</Text>
            </View>
          )}
          {data.employee.cnpsNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>N° CNPS</Text>
              <Text style={styles.value}>{data.employee.cnpsNumber}</Text>
            </View>
          )}
          {data.employee.niu && (
            <View style={styles.row}>
              <Text style={styles.label}>NIU</Text>
              <Text style={styles.value}>{data.employee.niu}</Text>
            </View>
          )}
          {data.employee.hireDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Date d&apos;embauche</Text>
              <Text style={styles.value}>{formatDate(data.employee.hireDate)}</Text>
            </View>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Composantes du brut</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.cellLabel]}>Libellé</Text>
              <Text style={[styles.tableHeaderCell, styles.cellQty]}>Base/Qté</Text>
              <Text style={[styles.tableHeaderCell, styles.cellAmount]}>Montant</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellLabel}>Salaire de base</Text>
              <Text style={styles.cellQty}>{data.workedDays} j</Text>
              <Text style={styles.cellAmount}>{formatFcfa(data.baseSalary)}</Text>
            </View>
            {data.overtimeAmount > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.cellLabel}>Heures supplémentaires{overtimeLabel ? ` · ${overtimeLabel}` : ""}</Text>
                <Text style={styles.cellQty}>{data.overtimeHours} h</Text>
                <Text style={styles.cellAmount}>{formatFcfa(data.overtimeAmount)}</Text>
              </View>
            )}
            {data.seniorityBonus > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.cellLabel}>Prime d&apos;ancienneté</Text>
                <Text style={styles.cellQty}>—</Text>
                <Text style={styles.cellAmount}>{formatFcfa(data.seniorityBonus)}</Text>
              </View>
            )}
            {data.transportAllowance > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.cellLabel}>Indemnité transport</Text>
                <Text style={styles.cellQty}>—</Text>
                <Text style={styles.cellAmount}>{formatFcfa(data.transportAllowance)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total brut</Text>
              <Text style={styles.cellQty}> </Text>
              <Text style={styles.totalAmount}>{formatFcfa(data.grossAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Cotisations & retenues</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.cellLabel]}>Libellé</Text>
              <Text style={[styles.tableHeaderCell, styles.cellAmount]}>Montant</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellLabel}>CNPS salarié (4,2 %)</Text>
              <Text style={styles.cellAmount}>− {formatFcfa(data.cnpsAmount)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cellLabel}>IRPP (barème progressif)</Text>
              <Text style={styles.cellAmount}>− {formatFcfa(data.irppAmount)}</Text>
            </View>
            {data.otherDeductions > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.cellLabel}>Autres retenues</Text>
                <Text style={styles.cellAmount}>− {formatFcfa(data.otherDeductions)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total retenues</Text>
              <Text style={styles.totalAmount}>
                − {formatFcfa(data.cnpsAmount + data.irppAmount + data.otherDeductions)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Net à payer</Text>
          <Text style={styles.netAmount}>{formatFcfa(data.netAmount)}</Text>
        </View>

        <View style={[styles.block, { marginTop: 12 }]}>
          <Text style={styles.blockTitle}>Paiement</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mode</Text>
            <Text style={styles.value}>Virement bancaire</Text>
          </View>
          {data.paymentBankAccount && (
            <View style={styles.row}>
              <Text style={styles.label}>Compte</Text>
              <Text style={styles.value}>{data.paymentBankAccount}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(data.paymentDate)}</Text>
          </View>
          {data.paymentReference && (
            <View style={styles.row}>
              <Text style={styles.label}>Référence</Text>
              <Text style={styles.value}>{data.paymentReference}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Document généré par T-ERP · Conserver précieusement · Conforme à la
          réglementation camerounaise du travail · CNPS · DGI
        </Text>
      </Page>
    </Document>
  );
}

export function buildPayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
