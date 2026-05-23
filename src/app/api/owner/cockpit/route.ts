import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import {
  Role,
  ProjectAccountEntryType,
  MovementDirection,
  ValidationStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

// Lecture réservée au Propriétaire / PCA (et super-admin pour supervision).
const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const SITE_OK = ["ACTIVE", "AT_RISK", "DRIFTING"];
const SITE_TROUBLE = ["AT_RISK", "DRIFTING"];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [banks, bankMoves, projDebtRows, sites, headcount, payrollAgg, newSitesCount, pendingDecisions] =
    await Promise.all([
      prisma.bankAccount.findMany({
        where: { tenantId: { in: scopeIds }, isActive: true },
        select: { balance: true, creditLineGranted: true, creditLineUsed: true },
      }),
      prisma.bankMovement.findMany({
        where: { bankAccount: { tenantId: { in: scopeIds } }, occurredAt: { gte: monthStart } },
        select: { direction: true, amount: true },
      }),
      prisma.projectAccountMovement.groupBy({
        by: ["type"],
        where: {
          account: { tenantId: { in: scopeIds } },
          type: { in: [ProjectAccountEntryType.FUNDING, ProjectAccountEntryType.REPAYMENT] },
        },
        _sum: { amount: true },
      }),
      prisma.site.findMany({
        where: { tenantId: { in: scopeIds } },
        select: {
          status: true,
          budget: true,
          margin: true,
          createdAt: true,
          contract: { select: { currentAmount: true } },
        },
      }),
      prisma.user.count({
        where: { tenantId: { in: scopeIds }, status: "ACTIVE", role: { notIn: [Role.CANDIDATE] } },
      }),
      prisma.user.aggregate({
        where: { tenantId: { in: scopeIds }, status: "ACTIVE", baseSalary: { not: null } },
        _sum: { baseSalary: true },
      }),
      prisma.site.count({ where: { tenantId: { in: scopeIds }, createdAt: { gte: monthStart } } }),
      prisma.validation.count({ where: { tenantId: { in: scopeIds }, status: ValidationStatus.PENDING } }),
    ]);

  // ── Finance ────────────────────────────────────────────────────────────
  const tresorerie = banks.reduce((s, b) => s + b.balance, 0n);
  const ligneCredit = banks.reduce((s, b) => s + (b.creditLineGranted - b.creditLineUsed), 0n);
  let entreesMois = 0n;
  let sortiesMois = 0n;
  for (const m of bankMoves) {
    if (m.direction === MovementDirection.INBOUND) entreesMois += m.amount;
    else sortiesMois += m.amount;
  }
  let funded = 0n;
  let repaid = 0n;
  for (const r of projDebtRows) {
    if (r.type === ProjectAccountEntryType.FUNDING) funded = r._sum.amount ?? 0n;
    if (r.type === ProjectAccountEntryType.REPAYMENT) repaid = r._sum.amount ?? 0n;
  }
  const detteProjets = funded - repaid;

  // ── Chantiers ────────────────────────────────────────────────────────────
  const actifs = sites.filter((s) => SITE_OK.includes(s.status)).length;
  const enDifficulte = sites.filter((s) => SITE_TROUBLE.includes(s.status)).length;
  const clotures = sites.filter((s) => s.status === "COMPLETED").length;
  const planifies = sites.filter((s) => s.status === "PLANNED").length;
  const valeurPortefeuille = sites
    .filter((s) => s.status !== "ARCHIVED")
    .reduce((sum, s) => sum + (s.contract?.currentAmount ?? s.budget), 0n);
  const activeMargins = sites.filter((s) => SITE_OK.includes(s.status)).map((s) => s.margin);
  const margeMoyenne = activeMargins.length
    ? Math.round((activeMargins.reduce((a, b) => a + b, 0) / activeMargins.length) * 10) / 10
    : 0;

  // ── Commercial ────────────────────────────────────────────────────────────
  const nombreMarches = sites.filter((s) => s.status !== "ARCHIVED").length;

  return NextResponse.json({
    finance: {
      tresorerie: tresorerie.toString(),
      ligneCredit: ligneCredit.toString(),
      entreesMois: entreesMois.toString(),
      sortiesMois: sortiesMois.toString(),
      fluxNetMois: (entreesMois - sortiesMois).toString(),
      detteProjets: detteProjets.toString(),
    },
    chantiers: {
      total: sites.length,
      actifs,
      enDifficulte,
      clotures,
      planifies,
      valeurPortefeuille: valeurPortefeuille.toString(),
      margeMoyenne,
    },
    personnel: {
      effectif: headcount,
      masseSalariale: (payrollAgg._sum.baseSalary ?? 0n).toString(),
    },
    commercial: {
      nombreMarches,
      valeurMarches: valeurPortefeuille.toString(),
      nouveauxMarchesMois: newSitesCount,
      decisionsEnAttente: pendingDecisions,
    },
    generatedAt: now.toISOString(),
  });
}
