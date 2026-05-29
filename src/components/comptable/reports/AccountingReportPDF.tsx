import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface BalanceRow {
  code: string;
  label?: string | null;
  debit: string;
  credit: string;
  balance: string;
}

export interface AccountingReportData {
  title: string;
  periodLabel: string;
  tenantName: string;
  generatedAt: string;
  rows: BalanceRow[];
  totals: { debit: string; credit: string };
}

function fcfa(s: string) {
  return new Intl.NumberFormat("fr-FR").format(BigInt(s));
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1F2A3D" },
  brand: { fontSize: 14, fontWeight: "bold" },
  muted: { color: "#6B7280", fontSize: 8 },
  title: { fontSize: 15, fontWeight: "bold", marginTop: 14 },
  sub: { fontSize: 9, color: "#6B7280", marginTop: 2 },
  th: { flexDirection: "row", backgroundColor: "#F3F4F6", paddingVertical: 5, paddingHorizontal: 6, marginTop: 14, fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#374151" },
  td: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  cCode: { flex: 2 },
  cNum: { flex: 1.5, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, marginTop: 4, backgroundColor: "#F9FAFB", fontWeight: "bold" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 7, color: "#9CA3AF" },
});

export function AccountingReportPDF({ data }: { data: AccountingReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.brand}>{data.tenantName}</Text>
          <Text style={styles.muted}>Édité le {data.generatedAt}</Text>
        </View>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.sub}>{data.periodLabel} · norme SYSCOHADA · montants en FCFA</Text>

        <View style={styles.th}>
          <Text style={styles.cCode}>Compte</Text>
          <Text style={styles.cNum}>Débit</Text>
          <Text style={styles.cNum}>Crédit</Text>
          <Text style={styles.cNum}>Solde</Text>
        </View>
        {data.rows.length === 0 ? (
          <Text style={{ marginTop: 10, color: "#6B7280" }}>Aucun mouvement sur la période.</Text>
        ) : (
          data.rows.map((r, i) => (
            <View style={styles.td} key={i}>
              <Text style={styles.cCode}>{r.code}{r.label ? ` — ${r.label}` : ""}</Text>
              <Text style={styles.cNum}>{fcfa(r.debit)}</Text>
              <Text style={styles.cNum}>{fcfa(r.credit)}</Text>
              <Text style={styles.cNum}>{fcfa(r.balance)}</Text>
            </View>
          ))
        )}
        <View style={styles.totalRow}>
          <Text style={styles.cCode}>TOTAUX</Text>
          <Text style={styles.cNum}>{fcfa(data.totals.debit)}</Text>
          <Text style={styles.cNum}>{fcfa(data.totals.credit)}</Text>
          <Text style={styles.cNum}>{fcfa(String(BigInt(data.totals.debit) - BigInt(data.totals.credit)))}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {data.tenantName} — {data.title} — document généré par T-ERP
        </Text>
      </Page>
    </Document>
  );
}
