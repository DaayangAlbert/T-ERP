import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

// 7 templates DT (cf. ReportType : DT_WEEKLY_TECHNICAL etc.)
const DT_TEMPLATES = [
  {
    type: "DT_WEEKLY_TECHNICAL",
    title: "Reporting hebdomadaire technique",
    description: "Synthèse hebdomadaire envoyée chaque lundi 7h au DG",
    audience: "Directeur Général",
    frequency: "Hebdomadaire (lundi 7h)",
    icon: "calendar-days",
  },
  {
    type: "DT_MONTHLY_PRODUCTION",
    title: "Reporting mensuel production",
    description: "Tableau comparatif chantiers, avancement physique vs financier",
    audience: "DG + COMEX",
    frequency: "Mensuel (5 du mois)",
    icon: "trending-up",
  },
  {
    type: "DT_QUARTERLY_TECHNICAL",
    title: "Bilan technique trimestriel",
    description: "Synthèse production + alertes + pipeline pour COMEX/CA",
    audience: "COMEX + Conseil d'Administration",
    frequency: "Trimestriel",
    icon: "bar-chart",
  },
  {
    type: "DT_HSE_MONTHLY",
    title: "Rapport sinistralité HSE",
    description: "Incidents, accidents, TF1, jours sans accident grave",
    audience: "CHSCT",
    frequency: "Mensuel",
    icon: "shield",
  },
  {
    type: "DT_TENDERS_QUARTERLY",
    title: "Rapport études et taux de transformation",
    description: "Pipeline AO, transformation, marge moyenne offre",
    audience: "Direction commerciale + DG",
    frequency: "Trimestriel",
    icon: "clipboard-list",
  },
  {
    type: "DT_ISO_ANNUAL",
    title: "Bilan certifications ISO",
    description: "ISO 9001 / 14001 / 45001 — synthèse audits surveillance",
    audience: "Direction Qualité + DG",
    frequency: "Annuel",
    icon: "award",
  },
  {
    type: "DT_MOA_MONTHLY",
    title: "Reporting MOA par chantier",
    description: "Génération multiple : 1 PDF par chantier vers chaque MOA",
    audience: "23 maîtres d'ouvrage",
    frequency: "Mensuel (fin de mois)",
    icon: "send",
    batch: true,
  },
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }
  return NextResponse.json({ templates: DT_TEMPLATES });
}
