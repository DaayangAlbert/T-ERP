import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export interface PoLine {
  designation: string;
  unit?: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export interface PoPdfData {
  reference: string;
  date: string;
  label: string;
  category: string;
  amount: string;
  status: string;
  chantier: string | null;
  initiator: string;
  lines: PoLine[];
  supplier: { name: string; taxId: string | null; rccm: string | null; phone: string | null; address: string | null; city: string | null };
  tenant: { name: string; address: string | null; phone: string | null; email: string | null; taxId: string | null; primaryColor: string | null };
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_DAF: "En attente validation DAF",
  PENDING_DG: "En attente validation DG",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  CANCELLED: "Annulé",
};

function fcfa(s: string) {
  return new Intl.NumberFormat("fr-FR").format(BigInt(s)) + " FCFA";
}
function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1F2A3D" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#6B7280", fontSize: 9 },
  title: { fontSize: 20, fontWeight: "bold", marginTop: 18 },
  ref: { fontSize: 11, marginTop: 2 },
  box: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 10, marginTop: 14 },
  boxTitle: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  label: { color: "#6B7280" },
  line: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  th: { flexDirection: "row", backgroundColor: "#F9FAFB", padding: 6, marginTop: 14, fontSize: 8, color: "#6B7280", textTransform: "uppercase" },
  td: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
  totalBox: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 12, width: 240 },
  totalLabel: { fontSize: 9, color: "#6B7280" },
  totalValue: { fontSize: 16, fontWeight: "bold", marginTop: 2 },
  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signBox: { width: 200 },
  signLine: { borderTopWidth: 1, borderTopColor: "#9CA3AF", marginTop: 36, paddingTop: 4, fontSize: 9, color: "#6B7280" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9CA3AF" },
});

export function PurchaseOrderPDF({ po }: { po: PoPdfData }) {
  const accent = po.tenant.primaryColor || "#9333EA";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête entreprise */}
        <View style={styles.row}>
          <View>
            <Text style={[styles.brand, { color: accent }]}>{po.tenant.name}</Text>
            {po.tenant.address ? <Text style={styles.muted}>{po.tenant.address}</Text> : null}
            <Text style={styles.muted}>
              {[po.tenant.phone, po.tenant.email].filter(Boolean).join(" · ")}
            </Text>
            {po.tenant.taxId ? <Text style={styles.muted}>NIU : {po.tenant.taxId}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>BON DE COMMANDE</Text>
            <Text style={styles.ref}>N° {po.reference}</Text>
            <Text style={styles.muted}>Date : {dateFr(po.date)}</Text>
            <Text style={styles.muted}>Statut : {STATUS_LABEL[po.status] ?? po.status}</Text>
          </View>
        </View>

        {/* Fournisseur */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Fournisseur</Text>
          <Text style={{ fontWeight: "bold", fontSize: 11 }}>{po.supplier.name}</Text>
          {po.supplier.address || po.supplier.city ? (
            <Text style={styles.muted}>{[po.supplier.address, po.supplier.city].filter(Boolean).join(", ")}</Text>
          ) : null}
          <Text style={styles.muted}>
            {[po.supplier.phone, po.supplier.taxId ? `NIU ${po.supplier.taxId}` : null, po.supplier.rccm ? `RCCM ${po.supplier.rccm}` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        {/* Détail des articles */}
        <Text style={[styles.muted, { marginTop: 14 }]}>Catégorie : {po.category}{po.chantier ? ` · Chantier : ${po.chantier}` : ""}</Text>
        <View style={styles.th}>
          <Text style={{ flex: 4 }}>Désignation</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>Qté</Text>
          <Text style={{ flex: 1.5, textAlign: "right" }}>Prix unit.</Text>
          <Text style={{ flex: 1.5, textAlign: "right" }}>Montant</Text>
        </View>
        {po.lines.map((l, i) => (
          <View style={styles.td} key={i}>
            <Text style={{ flex: 4 }}>{l.designation}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{new Intl.NumberFormat("fr-FR").format(l.quantity)}{l.unit ? ` ${l.unit}` : ""}</Text>
            <Text style={{ flex: 1.5, textAlign: "right" }}>{new Intl.NumberFormat("fr-FR").format(BigInt(l.unitPrice))}</Text>
            <Text style={{ flex: 1.5, textAlign: "right" }}>{new Intl.NumberFormat("fr-FR").format(BigInt(l.amount))}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.total}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Montant total de la commande</Text>
            <Text style={[styles.totalValue, { color: accent }]}>{fcfa(po.amount)}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.sign}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Établi par : {po.initiator}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Validation / Cachet</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {po.tenant.name} — Bon de commande {po.reference} — Document généré par T-ERP
        </Text>
      </Page>
    </Document>
  );
}
