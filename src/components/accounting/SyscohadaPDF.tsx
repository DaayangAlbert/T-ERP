/**
 * Template PDF SYSCOHADA générique (Phase 2 / Bloc 4 — fn 4.2).
 * Filigrane "DOCUMENT BROUILLON — Validation expert-comptable requise".
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface Props {
  state: string;
  stateLabel: string;
  tenantName: string;
  period: string;
  payload: Record<string, unknown>;
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  watermark: {
    position: "absolute",
    top: "45%",
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 36,
    color: "rgba(168, 85, 247, 0.18)",
    fontWeight: "bold",
    transform: "rotate(-22deg)",
  },
  brand: { fontSize: 8, color: "#7E22CE", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 6 },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  header: { borderBottomWidth: 2, borderBottomColor: "#A855F7", paddingBottom: 12, marginBottom: 16 },
  warning: { backgroundColor: "#FEF3C7", borderColor: "#B45309", borderWidth: 1, padding: 8, marginBottom: 16, fontSize: 9, color: "#B45309" },
  section: { fontSize: 11, fontWeight: "bold", color: "#7E22CE", textTransform: "uppercase", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 4 },
  cell: { fontSize: 10, color: "#374151" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#9CA3AF", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
});

export function SyscohadaPDF({ state, stateLabel, tenantName, period, payload, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BROUILLON</Text>

        <View style={styles.header}>
          <Text style={styles.brand}>SYSCOHADA · OHADA · {state.toUpperCase()}</Text>
          <Text style={styles.title}>{stateLabel}</Text>
          <Text style={styles.meta}>
            {tenantName} · Période {period} · Édité le {new Date(generatedAt).toLocaleDateString("fr-FR")}
          </Text>
        </View>

        <View style={styles.warning}>
          <Text>
            ⚠ DOCUMENT BROUILLON — Calculs automatisés indicatifs. La validation par un
            expert-comptable agréé OHADA est requise avant toute utilisation officielle (DGI, banques, AG).
          </Text>
        </View>

        <Text style={styles.section}>Données de l'état</Text>
        <View>
          {Object.entries(payload).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={[styles.cell, { flex: 1.2 }]}>{k}</Text>
              <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>Mentions légales</Text>
        <Text style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>
          Conformément à l'Acte Uniforme OHADA relatif au droit comptable et à l'information financière,
          les états financiers sont établis et présentés selon le Système Comptable OHADA (SYSCOHADA révisé,
          en vigueur depuis 2018). Le présent brouillon ne se substitue pas à la liasse fiscale officielle DSF.
        </Text>

        <View style={styles.footer}>
          <Text>{tenantName} · Document confidentiel</Text>
          <Text>Édité par T-ERP le {new Date(generatedAt).toLocaleDateString("fr-FR")}</Text>
        </View>
      </Page>
    </Document>
  );
}
