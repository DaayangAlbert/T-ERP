/**
 * Attestation de revenus PDF (Phase 2 / Bloc 5 — fn 5.3).
 * Format conforme aux exigences DGI Cameroun pour la déclaration annuelle.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface Props {
  user: { name: string; position: string | null; cnpsNumber: string | null; niu: string | null };
  tenant: { name: string; niu: string | null };
  year: number;
  data: {
    grossAnnual: string;
    taxableGross: string;
    netAnnual: string;
    irppRetained: string;
    cacRetained: string;
    cnpsRetained: string;
    cfcRetained: string;
    payslipsCount: number;
  };
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  header: { borderBottomWidth: 2, borderBottomColor: "#A855F7", paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 8, color: "#7E22CE", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 8, textAlign: "center" },
  subtitle: { fontSize: 11, color: "#6B7280", marginTop: 4, textAlign: "center" },
  section: { fontSize: 11, fontWeight: "bold", color: "#7E22CE", textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 2 },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  label: { fontSize: 10, color: "#374151", flex: 2 },
  value: { fontSize: 10, color: "#1F2A3D", flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
  total: { backgroundColor: "#FAF5FF", borderTopWidth: 2, borderTopColor: "#A855F7" },
  totalLabel: { fontSize: 11, color: "#7E22CE", flex: 2, fontWeight: "bold" },
  totalValue: { fontSize: 12, color: "#7E22CE", flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9CA3AF", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6, textAlign: "center" },
  signature: { marginTop: 30, fontSize: 9, color: "#374151" },
});

function fmt(v: string): string {
  // Normalise les espaces fins (U+202F, U+00A0, U+2009) en espace classique :
  // certains visualiseurs PDF affichent un fallback "/" si le glyphe manque.
  return new Intl.NumberFormat("fr-FR").format(Number(v)).replace(/[   ]/g, " ") + " FCFA";
}

export function IncomeAttestationPDF({ user, tenant, year, data, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{tenant.name} · ATTESTATION FISCALE</Text>
          <Text style={styles.title}>Attestation de revenus annuels</Text>
          <Text style={styles.subtitle}>Exercice fiscal {year}</Text>
        </View>

        <Text style={styles.section}>Identité du bénéficiaire</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nom et prénom</Text>
          <Text style={styles.value}>{user.name}</Text>
        </View>
        {user.position && (
          <View style={styles.row}>
            <Text style={styles.label}>Fonction</Text>
            <Text style={styles.value}>{user.position}</Text>
          </View>
        )}
        {user.cnpsNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>N° CNPS</Text>
            <Text style={styles.value}>{user.cnpsNumber}</Text>
          </View>
        )}
        {user.niu && (
          <View style={styles.row}>
            <Text style={styles.label}>NIU</Text>
            <Text style={styles.value}>{user.niu}</Text>
          </View>
        )}

        <Text style={styles.section}>Identité de l'employeur</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Raison sociale</Text>
          <Text style={styles.value}>{tenant.name}</Text>
        </View>
        {tenant.niu && (
          <View style={styles.row}>
            <Text style={styles.label}>NIU employeur</Text>
            <Text style={styles.value}>{tenant.niu}</Text>
          </View>
        )}

        <Text style={styles.section}>Récapitulatif des revenus {year}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Salaire brut annuel</Text>
          <Text style={styles.value}>{fmt(data.grossAnnual)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Brut imposable</Text>
          <Text style={styles.value}>{fmt(data.taxableGross)}</Text>
        </View>
        <View style={[styles.row, styles.total]}>
          <Text style={styles.totalLabel}>Net à payer annuel</Text>
          <Text style={styles.totalValue}>{fmt(data.netAnnual)}</Text>
        </View>

        <Text style={styles.section}>Retenues fiscales et sociales {year}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>IRPP retenu</Text>
          <Text style={styles.value}>{fmt(data.irppRetained)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CAC (centimes additionnels)</Text>
          <Text style={styles.value}>{fmt(data.cacRetained)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CFC (Crédit Foncier)</Text>
          <Text style={styles.value}>{fmt(data.cfcRetained)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CNPS salarié</Text>
          <Text style={styles.value}>{fmt(data.cnpsRetained)}</Text>
        </View>

        <Text style={styles.section}>Période couverte</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre de bulletins payés</Text>
          <Text style={styles.value}>{data.payslipsCount}</Text>
        </View>

        <Text style={styles.signature}>
          Fait à Yaoundé, le {new Date(generatedAt).toLocaleDateString("fr-FR")}
        </Text>
        <Text style={styles.signature}>Pour {tenant.name},</Text>

        <Text style={styles.footer}>
          Document généré par T-ERP. À utiliser pour la déclaration annuelle de revenus auprès de la DGI Cameroun.
        </Text>
      </Page>
    </Document>
  );
}
