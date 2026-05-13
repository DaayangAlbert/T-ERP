import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { PayrollStateData, PayrollStateRow } from "@/lib/payroll/build-payroll-state";

interface Props {
  state: PayrollStateData;
}

function money(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2pt solid #A855F7",
    paddingBottom: 10,
    marginBottom: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 36, height: 36, objectFit: "contain" },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#A855F7",
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  title: { fontSize: 18, color: "#2A1B3D", fontWeight: 700, textTransform: "uppercase" },
  meta: { marginTop: 2, color: "#6B7280" },
  status: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F3E8FF",
    color: "#7E22CE",
    fontWeight: 700,
  },
  kpis: { flexDirection: "row", gap: 8, marginBottom: 10 },
  kpi: {
    flex: 1,
    border: "1pt solid #E5E7EB",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#FAFAFA",
  },
  kpiPrimary: { backgroundColor: "#A855F7", color: "#FFFFFF", border: "1pt solid #A855F7" },
  kpiLabel: { fontSize: 7, color: "#6B7280", textTransform: "uppercase" },
  kpiLabelPrimary: { color: "#F3E8FF" },
  kpiValue: { marginTop: 4, fontSize: 11, fontWeight: 700 },
  sectionGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  section: { flex: 1, border: "1pt solid #E5E7EB", borderRadius: 6, padding: 8 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: "#2A1B3D", marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 3 },
  rowLabel: { color: "#6B7280" },
  rowValue: { fontWeight: 700, textAlign: "right" },
  table: { border: "1pt solid #D1D5DB", marginTop: 4 },
  tableHead: { flexDirection: "row", backgroundColor: "#2A1B3D", color: "#FFFFFF" },
  tableRow: { flexDirection: "row", borderTop: "1pt solid #E5E7EB" },
  cell: { padding: 3, borderRight: "1pt solid #E5E7EB" },
  cellRight: { textAlign: "right" },
  cellHeader: { fontWeight: 700, fontSize: 6.5 },
  footer: {
    marginTop: 8,
    borderTop: "1pt solid #E5E7EB",
    paddingTop: 6,
    color: "#6B7280",
    fontSize: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function PayrollStatePDF({ state }: Props) {
  const initials = state.tenant.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <Document title={`Etat des salaires ${state.tenant.name} ${state.cycle.period}`} author={state.tenant.name}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {state.tenant.logoUrl ? (
              <Image src={state.tenant.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.title}>Etat des salaires</Text>
              <Text style={styles.meta}>
                {state.tenant.name} · Periode {state.cycle.period} · Effectif {state.kpis.paidHeadcount}
              </Text>
              <Text style={styles.meta}>
                NIU {state.tenant.taxId ?? "-"} · CNPS {state.tenant.cnpsId ?? "-"}
              </Text>
            </View>
          </View>
          <Text style={styles.status}>{state.cycle.status}</Text>
        </View>

        <View style={styles.kpis}>
          <Kpi label="Masse salariale brute" value={money(state.kpis.grossPayroll)} />
          <Kpi label="Total retenues" value={money(state.kpis.totalDeductions)} />
          <Kpi label="Charges patronales" value={money(state.kpis.employerCharges)} />
          <Kpi label="Net a payer" value={money(state.kpis.netToPay)} primary />
          <Kpi label="Effectif paye" value={String(state.kpis.paidHeadcount)} />
        </View>

        <View style={styles.sectionGrid}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recapitulatif general</Text>
            <Amount label="Total des salaires bruts" value={state.recap.grossSalaries} />
            <Amount label="Primes & indemnites" value={state.recap.primesAndAllowances} />
            <Amount label="Brut imposable" value={state.recap.taxableGross} />
            <Amount label="Total retenues salariales" value={state.recap.salaryDeductions} />
            <Amount label="Net a payer aux employes" value={state.recap.netToPay} />
            <Amount label="Cout total employeur" value={state.recap.employerCost} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retenues salariales</Text>
            <Amount label="CNPS salarie" value={state.recap.cnpsEmployee} />
            <Amount label="IRPP" value={state.recap.irpp} />
            <Amount label="CAC" value={state.recap.cac} />
            <Amount label="Avances" value={state.recap.advances} />
            <Amount label="Autres retenues" value={state.recap.otherDeductions} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Charges patronales</Text>
            {state.employerChargeDetails.socialOrganizations.map((item) => (
              <Amount key={item.label} label={item.label} value={item.amount} />
            ))}
            {state.employerChargeDetails.other.map((item) => (
              <Amount key={item.label} label={item.label} value={item.amount} />
            ))}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fiscal & declarations</Text>
            <Amount label="Base imposable IRPP" value={state.fiscalSummary.irppTaxableBase} />
            <Amount label="IRPP preleve" value={state.fiscalSummary.irppWithheld} />
            <Amount label="CNPS salarie" value={state.fiscalSummary.cnpsEmployeeDeclared} />
            <Amount label="CNPS employeur" value={state.fiscalSummary.cnpsEmployerDeclared} />
            <Amount label="Organismes sociaux" value={state.fiscalSummary.socialOrganizationsTotal} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detail par salaries</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Head width="8%" label="Matricule" />
            <Head width="16%" label="Nom et prenoms" />
            <Head width="10%" label="Poste" />
            <Head width="8%" label="Categorie" />
            <Head width="6%" label="Jours" right />
            <Head width="8%" label="Brut" right />
            <Head width="8%" label="Retenues" right />
            <Head width="8%" label="Net" right />
            <Head width="8%" label="Charges" right />
            <Head width="8%" label="Cout total" right />
            <Head width="12%" label="Banque / Compte" />
          </View>
          {state.rows.slice(0, 28).map((row) => (
            <SalaryRow key={row.payslipId} row={row} />
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Document genere par T-ERP · Etat officiel de controle paie</Text>
          <Text>
            Totaux etat = bulletins generes · {state.rows.length} ligne{state.rows.length > 1 ? "s" : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function Kpi({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  const kpiStyle = primary ? [styles.kpi, styles.kpiPrimary] : [styles.kpi];
  const labelStyle = primary ? [styles.kpiLabel, styles.kpiLabelPrimary] : [styles.kpiLabel];
  return (
    <View style={kpiStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{money(value)}</Text>
    </View>
  );
}

function Head({ label, width, right }: { label: string; width: string; right?: boolean }) {
  const headStyle = right ? [styles.cell, { width }, styles.cellRight] : [styles.cell, { width }];
  return (
    <View style={headStyle}>
      <Text style={styles.cellHeader}>{label}</Text>
    </View>
  );
}

function Cell({
  children,
  width,
  right,
}: {
  children: ReactNode;
  width: string;
  right?: boolean;
}) {
  const cellStyle = right ? [styles.cell, { width }, styles.cellRight] : [styles.cell, { width }];
  return <View style={cellStyle}>{children}</View>;
}

function SalaryRow({ row }: { row: PayrollStateRow }) {
  return (
    <View style={styles.tableRow}>
      <Cell width="8%">
        <Text>{row.matricule}</Text>
      </Cell>
      <Cell width="16%">
        <Text>{row.fullName}</Text>
      </Cell>
      <Cell width="10%">
        <Text>{row.position ?? "-"}</Text>
      </Cell>
      <Cell width="8%">
        <Text>{row.category ?? "-"}</Text>
      </Cell>
      <Cell width="6%" right>
        <Text>{row.workedDays}</Text>
      </Cell>
      <Cell width="8%" right>
        <Text>{money(row.gross)}</Text>
      </Cell>
      <Cell width="8%" right>
        <Text>{money(row.totalDeductions)}</Text>
      </Cell>
      <Cell width="8%" right>
        <Text>{money(row.netToPay)}</Text>
      </Cell>
      <Cell width="8%" right>
        <Text>{money(row.employerCharges)}</Text>
      </Cell>
      <Cell width="8%" right>
        <Text>{money(row.employerCost)}</Text>
      </Cell>
      <Cell width="12%">
        <Text>{[row.bankName, row.bankAccount].filter(Boolean).join(" / ") || "-"}</Text>
      </Cell>
    </View>
  );
}
