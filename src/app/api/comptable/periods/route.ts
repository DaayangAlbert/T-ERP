import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { periodOf } from "@/lib/comptable/periods";
import { Role, PeriodStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

/** La clôture est une action de direction (jamais du comptable chantier). */
async function isDirection(session: { sub: string; role: string }): Promise<boolean> {
  if (session.role !== Role.ACCOUNTANT) return true;
  const allowed = await getAccessibleSiteIds(session.sub);
  return allowed === null;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (!(await isDirection(session))) {
    return NextResponse.json({ forbidden: true });
  }

  // 12 derniers mois (mois courant inclus).
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [entries, rows] = await Promise.all([
    prisma.entry.findMany({
      where: { tenantId: session.tenantId, entryDate: { gte: start } },
      select: { entryDate: true, lines: { select: { debit: true, credit: true } } },
    }),
    prisma.accountingPeriod.findMany({ where: { tenantId: session.tenantId } }),
  ]);

  const rowByPeriod = new Map(rows.map((r) => [r.period, r]));
  const agg = new Map<string, { entries: number; debit: bigint; credit: bigint }>();
  for (const e of entries) {
    const p = periodOf(e.entryDate);
    const cur = agg.get(p) ?? { entries: 0, debit: 0n, credit: 0n };
    cur.entries += 1;
    for (const l of e.lines) {
      cur.debit += BigInt(l.debit);
      cur.credit += BigInt(l.credit);
    }
    agg.set(p, cur);
  }

  const items = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = periodOf(d);
    const row = rowByPeriod.get(period);
    const a = agg.get(period) ?? { entries: 0, debit: 0n, credit: 0n };
    return {
      period,
      status: row?.status ?? PeriodStatus.OPEN,
      closedAt: row?.closedAt?.toISOString() ?? null,
      entries: a.entries,
      debit: a.debit.toString(),
      credit: a.credit.toString(),
      balanced: a.debit === a.credit,
    };
  });

  return NextResponse.json({ items, isDirection: true });
}

const actionSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Période invalide (YYYY-MM)"),
  action: z.enum(["close", "reopen"]),
});

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (!(await isDirection(session))) {
    return NextResponse.json({ error: "Clôture réservée au Comptable Direction / DAF" }, { status: 403 });
  }

  try {
    const { period, action } = actionSchema.parse(await req.json());
    const [yy, mm] = period.split("-").map(Number);
    const gte = new Date(yy, mm - 1, 1);
    const lt = new Date(yy, mm, 1);

    const existing = await prisma.accountingPeriod.findFirst({ where: { tenantId: session.tenantId, period } });

    if (action === "reopen") {
      if (!existing) return NextResponse.json({ ok: true }); // déjà ouverte
      await prisma.accountingPeriod.update({
        where: { id: existing.id },
        data: { status: PeriodStatus.OPEN, closedAt: null, closedBy: null },
      });
    } else {
      // Empêche la clôture d'une période déséquilibrée.
      const lines = await prisma.entryLine.findMany({
        where: { entry: { tenantId: session.tenantId, entryDate: { gte, lt } } },
        select: { debit: true, credit: true },
      });
      let debit = 0n, credit = 0n;
      for (const l of lines) { debit += BigInt(l.debit); credit += BigInt(l.credit); }
      if (debit !== credit) {
        return NextResponse.json({ error: `Période déséquilibrée (écart ${(debit - credit).toString()} FCFA) — corrigez avant de clôturer.` }, { status: 400 });
      }
      const entryCount = await prisma.entry.count({ where: { tenantId: session.tenantId, entryDate: { gte, lt } } });
      const data = {
        status: PeriodStatus.CLOSED,
        closedAt: new Date(),
        closedBy: session.sub,
        totalEntries: entryCount,
        totalDebit: debit,
        totalCredit: credit,
      };
      if (existing) await prisma.accountingPeriod.update({ where: { id: existing.id }, data });
      else await prisma.accountingPeriod.create({ data: { tenantId: session.tenantId, period, ...data } });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: action === "close" ? "cpt.period.close" : "cpt.period.reopen",
        entityType: "AccountingPeriod",
        entityId: period,
        metadata: { period },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/comptable/periods]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
