import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const DIRECTION_TEMPLATES = [
  { type: "CPT_GENERAL_LEDGER", label: "Grand livre complet", desc: "Tous les comptes sur la période" },
  { type: "CPT_BALANCE_GENERAL", label: "Balance générale", desc: "Soldes débiteurs / créditeurs classes 1-7" },
  { type: "CPT_BALANCE_AUX_SUPPLIERS", label: "Balance auxiliaire fournisseurs", desc: "Détail par tiers" },
  { type: "CPT_BALANCE_AUX_CUSTOMERS", label: "Balance auxiliaire clients", desc: "Détail par client MOA" },
  { type: "CPT_JOURNAL_CENTRALIZER", label: "Journal centralisateur", desc: "Récap par journal" },
  { type: "CPT_MONTHLY_SYNTHESIS", label: "État de synthèse mensuel", desc: "P&L + bilan provisoire" },
  { type: "CPT_DSF_PREP", label: "Liasse DSF préparatoire", desc: "Annuel — états OHADA" },
  { type: "CPT_AGED_BALANCE_SUPPLIERS", label: "Balance âgée fournisseurs", desc: "Échéances dépassées" },
  { type: "CPT_AGED_BALANCE_CUSTOMERS", label: "Balance âgée clients", desc: "Recouvrement" },
  { type: "CPT_ANALYTICAL_CONSOLIDATED", label: "Reporting analytique consolidé", desc: "Tous les chantiers" },
];

const SITE_TEMPLATES = [
  { type: "CPT_SITE_LEDGER", label: "Grand livre chantier", desc: "Mes chantiers uniquement" },
  { type: "CPT_SITE_BALANCE", label: "Balance analytique chantier", desc: "Soldes par chantier" },
  { type: "CPT_SITE_EXPENSES", label: "État des dépenses chantier", desc: "Détail charges" },
  { type: "CPT_SITE_BILLINGS", label: "Suivi situations émises", desc: "Factures clients" },
  { type: "CPT_SITE_MONTHLY", label: "Reporting comptable chantier", desc: "Mensuel" },
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let isDirection = true;
  if (session.role === Role.ACCOUNTANT) {
    const u = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true },
    });
    isDirection = !u || u.assignedSiteIds.length === 0;
  }

  return NextResponse.json({
    templates: isDirection ? DIRECTION_TEMPLATES : SITE_TEMPLATES,
    isDirection,
  });
}
