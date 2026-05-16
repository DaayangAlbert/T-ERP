import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds, describeScope } from "@/lib/rbac/site-filter";
import { Role, CptEntryStatus, InvoiceStatus, BillingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const COMPTABLE_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!COMPTABLE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sevenDaysAhead = new Date(todayStart.getTime() + 7 * 24 * 3600 * 1000);

  const baseSiteFilter = allowed === null ? {} : { siteId: { in: allowed } };
  const tenantFilter = { tenantId: session.tenantId };

  const [totalSites, scopedSites, todayEntries, draftEntries, invoicesToAccount, invoicesDueSoon, billingsPending, recentEntries] =
    await Promise.all([
      prisma.site.count({ where: { tenantId: session.tenantId } }),
      allowed === null
        ? prisma.site.findMany({
            where: { tenantId: session.tenantId },
            select: { id: true, code: true, name: true, budget: true },
          })
        : prisma.site.findMany({
            where: { id: { in: allowed } },
            select: { id: true, code: true, name: true, budget: true },
          }),
      prisma.entry.count({
        where: { ...tenantFilter, ...baseSiteFilter, entryDate: { gte: todayStart } },
      }),
      prisma.entry.count({
        where: { ...tenantFilter, ...baseSiteFilter, status: CptEntryStatus.DRAFT },
      }),
      prisma.supplierInvoice.count({
        where: { ...tenantFilter, ...baseSiteFilter, status: { in: [InvoiceStatus.RECEIVED, InvoiceStatus.PENDING_3WAY_MATCH] } },
      }),
      prisma.supplierInvoice.count({
        where: {
          ...tenantFilter,
          ...baseSiteFilter,
          status: { in: [InvoiceStatus.ACCOUNTED, InvoiceStatus.PENDING_PAYMENT] },
          dueDate: { lte: sevenDaysAhead },
        },
      }),
      prisma.progressBilling.findMany({
        where: { ...tenantFilter, ...baseSiteFilter, status: BillingStatus.DRAFT },
        select: { id: true, billingNumber: true, period: true, dueDate: true, site: { select: { name: true, code: true } } },
        take: 6,
        orderBy: { dueDate: "asc" },
      }),
      prisma.entry.findMany({
        where: { ...tenantFilter, ...baseSiteFilter, createdById: session.sub },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { site: { select: { code: true, name: true } } },
      }),
    ]);

  const cumulatedBudget = scopedSites.reduce((s, x) => s + Number(x.budget), 0);
  const scopeLabel = describeScope(allowed, totalSites);

  // Évolution écritures saisies sur 30 jours (par jour)
  const evolutionStart = new Date(todayStart.getTime() - 29 * 24 * 3600 * 1000);
  const lastMonthEntries = await prisma.entry.findMany({
    where: { ...tenantFilter, ...baseSiteFilter, entryDate: { gte: evolutionStart } },
    select: { entryDate: true, journalCode: true },
  });
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(evolutionStart.getTime() + i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  for (const e of lastMonthEntries) {
    const key = e.entryDate.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const entriesEvolution = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  // Répartition par journal
  const journals = ["ACH", "VTE", "BQ", "OD", "PAIE", "CAI"];
  const journalDist = journals.map((code) => ({
    code,
    label: { ACH: "Achats", VTE: "Ventes", BQ: "Banque", OD: "OD", PAIE: "Paie", CAI: "Caisse" }[code] ?? code,
    count: lastMonthEntries.filter((e) => e.journalCode === code).length,
  }));

  // Priorités du jour (synthèse heuristique)
  const priorities: Array<{ kind: string; label: string; severity: "info" | "warning" | "danger" }> = [];
  if (invoicesToAccount > 0) {
    priorities.push({
      kind: "invoices",
      label: `${invoicesToAccount} facture${invoicesToAccount > 1 ? "s" : ""} fournisseur${invoicesToAccount > 1 ? "s" : ""} à comptabiliser`,
      severity: "warning",
    });
  }
  for (const b of billingsPending) {
    priorities.push({
      kind: "billing",
      label: `Situation ${b.billingNumber} ${b.site.code} à émettre avant ${new Date(b.dueDate).toLocaleDateString("fr-FR")}`,
      severity: "danger",
    });
  }
  if (draftEntries > 0) {
    priorities.push({
      kind: "drafts",
      label: `${draftEntries} écriture${draftEntries > 1 ? "s" : ""} en brouillard à valider`,
      severity: "info",
    });
  }

  return NextResponse.json({
    scope: {
      label: scopeLabel,
      isDirection: allowed === null,
      siteCount: allowed === null ? totalSites : allowed.length,
      sites: scopedSites.slice(0, 5).map((s) => ({ id: s.id, code: s.code, name: s.name })),
      cumulatedBudget,
    },
    kpis: {
      todayEntries,
      draftEntries,
      invoicesToAccount,
      invoicesDueSoon,
    },
    priorities,
    recentEntries: recentEntries.map((e) => ({
      id: e.id,
      reference: e.reference,
      description: e.description,
      journalCode: e.journalCode,
      entryDate: e.entryDate.toISOString(),
      siteCode: e.site?.code ?? null,
      status: e.status,
    })),
    entriesEvolution,
    journalDistribution: journalDist,
  });
}
