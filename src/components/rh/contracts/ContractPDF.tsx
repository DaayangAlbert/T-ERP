import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Police par défaut : Helvetica (cf PayslipPDF.tsx — Font.register déclenche
// des crashs intermittents sur Windows).
const FONT = "Helvetica";

const TYPE_LABEL: Record<string, string> = {
  CDI: "Contrat de Travail à Durée Indéterminée",
  CDD: "Contrat de Travail à Durée Déterminée",
  STAGE: "Convention de Stage",
  JOURNALIER: "Contrat Journalier",
  PRESTATAIRE: "Contrat de Prestation de Services",
};

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: FONT, fontSize: 10, color: "#1f2937", lineHeight: 1.5 },
  header: { textAlign: "center", marginBottom: 20 },
  companyName: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  companyDetails: { fontSize: 9, color: "#475569", marginTop: 2 },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginTop: 12, marginBottom: 4, textTransform: "uppercase" },
  reference: { fontSize: 10, textAlign: "center", color: "#64748b", marginBottom: 24 },
  partiesBlock: { marginBottom: 16 },
  partyLabel: { fontWeight: "bold", fontSize: 10, textDecoration: "underline", marginBottom: 4 },
  partyLine: { marginBottom: 2, fontSize: 10 },
  articleTitle: { fontSize: 11, fontWeight: "bold", marginTop: 12, marginBottom: 6, color: "#0f172a" },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  table: { marginTop: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row" as const, borderBottom: "1pt solid #e5e7eb", paddingVertical: 4 },
  tableCellLabel: { width: "40%", fontWeight: "bold", fontSize: 10 },
  tableCellValue: { width: "60%", fontSize: 10 },
  signaturesBlock: { marginTop: 30, flexDirection: "row" as const, justifyContent: "space-between" as const },
  signatureBox: { width: "45%", borderTop: "1pt solid #1f2937", paddingTop: 6 },
  signatureLabel: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },
  signatureText: { fontSize: 9, marginTop: 2, fontStyle: "italic" as const },
  footer: { position: "absolute" as const, bottom: 28, left: 50, right: 50, fontSize: 8, color: "#94a3b8", textAlign: "center" },
  bulletList: { marginLeft: 14, marginTop: 2 },
  bullet: { fontSize: 10, marginBottom: 2 },
});

function fmtFCFA(amount: number | bigint | string): string {
  const n = typeof amount === "bigint" ? Number(amount) : Number(amount);
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(n))
    .replace(/[   ]/g, " ");
}

function fmtDate(iso: string | Date | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export interface ContractPdfData {
  reference: string;
  type: "CDI" | "CDD" | "STAGE" | "JOURNALIER" | "PRESTATAIRE";
  jobTitle: string;
  professionalCategory?: string | null;
  baseSalary: number;
  trialPeriodDays?: number | null;
  startDate: string;
  endDate?: string | null;
  workLocation?: string | null;
  workingHours?: string | null;
  benefits: string[];
  customClauses: Array<{ title: string; body: string }>;
  internshipSchool?: string | null;
  internshipTutor?: string | null;
  providerCompanyName?: string | null;
  providerRccm?: string | null;
  providerNiu?: string | null;
  dailyRate?: number | null;
  cdiMotive?: string | null;
  employerSignedAt?: string | null;
  employerSignatureText?: string | null;
  employeeSignedAt?: string | null;
  employeeSignatureText?: string | null;
  employee: {
    fullName: string;
    matricule?: string | null;
    cnpsNumber?: string | null;
    niu?: string | null;
    identityCard?: string | null;
    address?: { city?: string; neighborhood?: string; line1?: string } | null;
    familyStatus?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  company: {
    name: string;
    legalForm?: string;
    capital?: string;
    rccm?: string;
    niu?: string;
    address?: string;
    represented?: string;
  };
}

export function ContractPDF({ data }: { data: ContractPdfData }) {
  const isFixedTerm = data.type === "CDD" || data.type === "STAGE" || data.type === "JOURNALIER";
  const employeeAddr = data.employee.address
    ? [data.employee.address.line1, data.employee.address.neighborhood, data.employee.address.city]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.company.name}</Text>
          <Text style={styles.companyDetails}>
            {data.company.legalForm ? `${data.company.legalForm} · ` : ""}
            {data.company.capital ? `Capital ${data.company.capital} · ` : ""}
            {data.company.rccm ? `RCCM ${data.company.rccm}` : ""}
          </Text>
          {data.company.niu ? <Text style={styles.companyDetails}>NIU : {data.company.niu}</Text> : null}
          {data.company.address ? <Text style={styles.companyDetails}>{data.company.address}</Text> : null}
        </View>

        <Text style={styles.title}>{TYPE_LABEL[data.type]}</Text>
        <Text style={styles.reference}>Référence : {data.reference}</Text>

        {/* PARTIES */}
        <View style={styles.partiesBlock}>
          <Text style={styles.partyLabel}>ENTRE LES SOUSSIGNÉS :</Text>
          <Text style={styles.partyLine}>
            {data.company.name}, {data.company.legalForm ?? ""}
            {data.company.represented ? `, représentée par ${data.company.represented}` : ""}, dûment habilité(e)
            aux fins des présentes,
          </Text>
          <Text style={[styles.partyLine, { fontStyle: "italic", marginTop: 2 }]}>
            Ci-après dénommée « l'Employeur »,
          </Text>
          <Text style={[styles.partyLabel, { marginTop: 10 }]}>D'UNE PART,</Text>
          <Text style={[styles.partyLabel, { marginTop: 10 }]}>ET</Text>
          <Text style={styles.partyLine}>
            {data.employee.fullName}
            {data.employee.identityCard ? `, titulaire de la CNI n° ${data.employee.identityCard}` : ""}
            {employeeAddr ? `, domicilié(e) à ${employeeAddr}` : ""}
            {data.employee.cnpsNumber ? `, n° CNPS ${data.employee.cnpsNumber}` : ""}
            {data.employee.niu ? `, NIU ${data.employee.niu}` : ""}.
          </Text>
          <Text style={[styles.partyLine, { fontStyle: "italic", marginTop: 2 }]}>
            Ci-après dénommé(e) « le Salarié »,
          </Text>
          <Text style={[styles.partyLabel, { marginTop: 10 }]}>D'AUTRE PART,</Text>
          <Text style={[styles.paragraph, { marginTop: 10, fontWeight: "bold" }]}>
            IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
          </Text>
        </View>

        {/* ARTICLE 1 — OBJET */}
        <Text style={styles.articleTitle}>Article 1 — Objet du contrat</Text>
        <Text style={styles.paragraph}>
          {data.type === "STAGE"
            ? `La présente convention a pour objet de définir les conditions du stage de formation effectué au sein de l'entreprise par le Stagiaire au poste de ${data.jobTitle}.`
            : data.type === "PRESTATAIRE"
              ? `Le Prestataire s'engage à fournir à l'Employeur, en toute indépendance, des prestations de ${data.jobTitle}.`
              : `L'Employeur engage le Salarié au poste de ${data.jobTitle}${
                  data.professionalCategory ? `, classé(e) ${data.professionalCategory} suivant la Convention Collective des Entreprises du Bâtiment et des Travaux Publics du Cameroun` : ""
                }.`}
          {data.type === "CDD" && data.cdiMotive
            ? ` Le présent contrat est conclu à durée déterminée pour le motif suivant : ${data.cdiMotive}.`
            : ""}
        </Text>

        {/* ARTICLE 2 — DURÉE */}
        <Text style={styles.articleTitle}>Article 2 — Durée et prise d'effet</Text>
        <Text style={styles.paragraph}>
          {data.type === "CDI"
            ? `Le présent contrat prend effet le ${fmtDate(data.startDate)}. Il est conclu pour une durée indéterminée.`
            : `Le présent contrat prend effet le ${fmtDate(data.startDate)} et prend fin le ${fmtDate(data.endDate ?? null)}.`}
          {data.trialPeriodDays && data.trialPeriodDays > 0
            ? ` Il est précédé d'une période d'essai de ${data.trialPeriodDays} jours pendant laquelle chacune des parties pourra y mettre fin sans préavis ni indemnité.`
            : ""}
        </Text>

        {/* ARTICLE 3 — LIEU & HORAIRES */}
        <Text style={styles.articleTitle}>Article 3 — Lieu de travail et horaires</Text>
        <Text style={styles.paragraph}>
          Le Salarié exerce ses fonctions à {data.workLocation ?? "tout site désigné par l'Employeur"}.
          L'Employeur se réserve le droit de modifier ce lieu en fonction des besoins du service.
          La durée hebdomadaire du travail est fixée à {data.workingHours ?? "40 heures"}, conformément à
          la législation en vigueur et à la Convention Collective applicable.
        </Text>

        {/* ARTICLE 4 — RÉMUNÉRATION */}
        <Text style={styles.articleTitle}>Article 4 — Rémunération</Text>
        {data.type === "JOURNALIER" ? (
          <Text style={styles.paragraph}>
            Le Salarié percevra une rémunération journalière de{" "}
            <Text style={{ fontWeight: "bold" }}>{fmtFCFA(data.dailyRate ?? 0)} FCFA</Text>, payable selon les
            modalités convenues. Les charges sociales obligatoires (CNPS, CFC, IRPP) sont retenues sur
            chaque paiement conformément à la législation camerounaise.
          </Text>
        ) : data.type === "PRESTATAIRE" ? (
          <Text style={styles.paragraph}>
            Les honoraires du Prestataire sont fixés forfaitairement à{" "}
            <Text style={{ fontWeight: "bold" }}>{fmtFCFA(data.baseSalary)} FCFA</Text> HT, payables selon
            l'échéancier annexé. Le Prestataire assume seul ses obligations fiscales et sociales.
          </Text>
        ) : (
          <Text style={styles.paragraph}>
            Le Salarié percevra une rémunération mensuelle brute de{" "}
            <Text style={{ fontWeight: "bold" }}>{fmtFCFA(data.baseSalary)} FCFA</Text>, payable à terme échu.
            Les cotisations sociales (CNPS, CFC) et l'impôt sur le revenu (IRPP, TCS, CAC) seront retenus à
            la source conformément à la législation fiscale et sociale camerounaise.
          </Text>
        )}

        {/* ARTICLE 5 — AVANTAGES */}
        {data.benefits.length > 0 ? (
          <>
            <Text style={styles.articleTitle}>Article 5 — Avantages en nature</Text>
            <Text style={styles.paragraph}>
              En sus de la rémunération principale, le Salarié bénéficie des avantages suivants :
            </Text>
            <View style={styles.bulletList}>
              {data.benefits.map((b, i) => (
                <Text key={i} style={styles.bullet}>• {b}</Text>
              ))}
            </View>
          </>
        ) : null}

        {/* SPÉCIFIQUES STAGE */}
        {data.type === "STAGE" ? (
          <>
            <Text style={styles.articleTitle}>Article — Encadrement pédagogique</Text>
            <Text style={styles.paragraph}>
              Le Stagiaire est inscrit à {data.internshipSchool ?? "—"}.
              {data.internshipTutor ? ` Son tuteur en entreprise est ${data.internshipTutor}.` : ""}
              {" "}Une attestation de fin de stage sera remise à l'issue de la période.
            </Text>
          </>
        ) : null}

        {/* SPÉCIFIQUES PRESTATAIRE */}
        {data.type === "PRESTATAIRE" ? (
          <>
            <Text style={styles.articleTitle}>Article — Identification du Prestataire</Text>
            <Text style={styles.paragraph}>
              Raison sociale : {data.providerCompanyName ?? "—"}
              {data.providerRccm ? ` · RCCM : ${data.providerRccm}` : ""}
              {data.providerNiu ? ` · NIU : ${data.providerNiu}` : ""}
              . Le Prestataire est indépendant : aucun lien de subordination ne le lie à l'Employeur.
            </Text>
          </>
        ) : null}

        {/* CLAUSES PERSONNALISÉES */}
        {data.customClauses.length > 0
          ? data.customClauses.map((c, i) => (
              <View key={i}>
                <Text style={styles.articleTitle}>{c.title}</Text>
                <Text style={styles.paragraph}>{c.body}</Text>
              </View>
            ))
          : null}

        {/* CLAUSES STANDARDS */}
        <Text style={styles.articleTitle}>Article — Obligations générales</Text>
        <Text style={styles.paragraph}>
          {data.type === "PRESTATAIRE"
            ? "Le Prestataire s'engage à respecter la confidentialité et à fournir ses prestations avec diligence et conformément aux règles de l'art."
            : "Le Salarié s'engage à exécuter ses fonctions avec diligence et loyauté, à respecter les règlements internes, ainsi que la confidentialité des informations dont il pourrait avoir connaissance dans le cadre de ses fonctions."}
        </Text>

        {!isFixedTerm && data.type !== "PRESTATAIRE" ? (
          <>
            <Text style={styles.articleTitle}>Article — Rupture du contrat</Text>
            <Text style={styles.paragraph}>
              Le présent contrat peut être rompu par l'une ou l'autre des parties dans les conditions prévues
              par le Code du Travail camerounais et la Convention Collective applicable, sous réserve du
              préavis légal.
            </Text>
          </>
        ) : null}

        <Text style={styles.articleTitle}>Article — Droit applicable & juridiction</Text>
        <Text style={styles.paragraph}>
          Le présent contrat est régi par la loi camerounaise. Tout litige relatif à son interprétation ou
          son exécution relèvera de la compétence du Tribunal du Travail du lieu d'exécution.
        </Text>

        {/* SIGNATURES */}
        <View style={styles.signaturesBlock}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Pour l'Employeur</Text>
            {data.employerSignedAt ? (
              <>
                <Text style={styles.signatureText}>« Lu et approuvé »</Text>
                <Text style={styles.signatureText}>{data.employerSignatureText}</Text>
                <Text style={[styles.signatureText, { color: "#64748b" }]}>
                  Signé le {fmtDate(data.employerSignedAt)}
                </Text>
              </>
            ) : (
              <Text style={[styles.signatureText, { color: "#94a3b8" }]}>En attente de signature</Text>
            )}
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              Pour le {data.type === "STAGE" ? "Stagiaire" : data.type === "PRESTATAIRE" ? "Prestataire" : "Salarié"}
            </Text>
            {data.employeeSignedAt ? (
              <>
                <Text style={styles.signatureText}>« Lu et approuvé »</Text>
                <Text style={styles.signatureText}>{data.employeeSignatureText}</Text>
                <Text style={[styles.signatureText, { color: "#64748b" }]}>
                  Signé le {fmtDate(data.employeeSignedAt)}
                </Text>
              </>
            ) : (
              <Text style={[styles.signatureText, { color: "#94a3b8" }]}>En attente de signature</Text>
            )}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {data.company.name} — Contrat {data.reference} — Document confidentiel.
        </Text>
      </Page>
    </Document>
  );
}
