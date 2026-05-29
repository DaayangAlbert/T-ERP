import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface PnLAccountRow {
  code: string;
  label?: string | null;
  amount: string; // signe correct : positif = charge (classe 6) ou produit (classe 7)
}

export interface ProfitLossData {
  title: string;
  periodLabel: string;
  tenantName: string;
  generatedAt: string;
  charges: PnLAccountRow[]; // classe 6
  produits: PnLAccountRow[]; // classe 7
  totalCharges: string;
  totalProduits: string;
}

function fcfa(s: string) {
  const n = BigInt(s);
  const neg = n < 0n;
  const abs = neg ? -n : n;
  return (neg ? "(" : "") + new Intl.NumberFormat("fr-FR").format(abs) + (neg ? ")" : "");
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1F2A3D" },
  brand: { fontSize: 14, fontWeight: "bold" },
  muted: { color: "#6B7280", fontSize: 8 },
  title: { fontSize: 15, fontWeight: "bold", marginTop: 14 },
  sub: { fontSize: 9, color: "#6B7280", marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginTop: 18, marginBottom: 4, color: "#374151", textTransform: "uppercase" },
  th: { flexDirection: "row", backgroundColor: "#F3F4F6", paddingVertical: 4, paddingHorizontal: 6, fontSize: 8, fontWeight: "bold", color: "#374151" },
  td: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  cCode: { flex: 3 },
  cNum: { flex: 1.5, textAlign: "right" },
  subtotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, marginTop: 4, backgroundColor: "#F9FAFB", fontWeight: "bold" },
  resultBox: { marginTop: 18, padding: 10, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 4 },
  resultLabel: { fontSize: 10, color: "#6B7280", textTransform: "uppercase" },
  resultValue: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 7, color: "#9CA3AF" },
});

export function ProfitLossReportPDF({ data }: { data: ProfitLossData }) {
  const resultat = BigInt(data.totalProduits) - BigInt(data.totalCharges);
  const isBenefice = resultat >= 0n;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.brand}>{data.tenantName}</Text>
          <Text style={styles.muted}>Édité le {data.generatedAt}</Text>
        </View>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.sub}>{data.periodLabel} · norme SYSCOHADA · montants en FCFA</Text>

        {/* CHARGES (classe 6) */}
        <Text style={styles.sectionTitle}>Charges (classe 6)</Text>
        <View style={styles.th}>
          <Text style={styles.cCode}>Compte</Text>
          <Text style={styles.cNum}>Montant</Text>
        </View>
        {data.charges.length === 0 ? (
          <Text style={{ marginTop: 6, color: "#6B7280" }}>Aucune charge sur la période.</Text>
        ) : (
          data.charges.map((r, i) => (
            <View style={styles.td} key={`c-${i}`}>
              <Text style={styles.cCode}>{r.code}{r.label ? ` — ${r.label}` : ""}</Text>
              <Text style={styles.cNum}>{fcfa(r.amount)}</Text>
            </View>
          ))
        )}
        <View style={styles.subtotal}>
          <Text style={styles.cCode}>TOTAL CHARGES</Text>
          <Text style={styles.cNum}>{fcfa(data.totalCharges)}</Text>
        </View>

        {/* PRODUITS (classe 7) */}
        <Text style={styles.sectionTitle}>Produits (classe 7)</Text>
        <View style={styles.th}>
          <Text style={styles.cCode}>Compte</Text>
          <Text style={styles.cNum}>Montant</Text>
        </View>
        {data.produits.length === 0 ? (
          <Text style={{ marginTop: 6, color: "#6B7280" }}>Aucun produit sur la période.</Text>
        ) : (
          data.produits.map((r, i) => (
            <View style={styles.td} key={`p-${i}`}>
              <Text style={styles.cCode}>{r.code}{r.label ? ` — ${r.label}` : ""}</Text>
              <Text style={styles.cNum}>{fcfa(r.amount)}</Text>
            </View>
          ))
        )}
        <View style={styles.subtotal}>
          <Text style={styles.cCode}>TOTAL PRODUITS</Text>
          <Text style={styles.cNum}>{fcfa(data.totalProduits)}</Text>
        </View>

        {/* RÉSULTAT */}
        <View style={[styles.resultBox, { backgroundColor: isBenefice ? "#ECFDF5" : "#FEF2F2", borderColor: isBenefice ? "#A7F3D0" : "#FECACA" }]}>
          <Text style={styles.resultLabel}>{isBenefice ? "Bénéfice de l'exercice" : "Perte de l'exercice"}</Text>
          <Text style={[styles.resultValue, { color: isBenefice ? "#047857" : "#B91C1C" }]}>
            {fcfa(resultat.toString())} FCFA
          </Text>
          <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>
            Produits − Charges = {fcfa(data.totalProduits)} − {fcfa(data.totalCharges)}
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          {data.tenantName} — {data.title} — document généré par T-ERP
        </Text>
      </Page>
    </Document>
  );
}
