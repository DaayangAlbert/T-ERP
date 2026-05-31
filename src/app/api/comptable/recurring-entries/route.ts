import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const lineSchema = z.object({
  accountCode: z.string().min(1),
  description: z.string().optional().nullable(),
  debit: z.coerce.number().nonnegative().default(0),
  credit: z.coerce.number().nonnegative().default(0),
  thirdPartyId: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
});

const createSchema = z.object({
  label: z.string().min(2).max(120),
  journalCode: z.string().min(2).max(10),
  description: z.string().min(1).max(200),
  dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
  lines: z.array(lineSchema).min(2),
});

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const items = await prisma.recurringEntry.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ active: "desc" }, { label: "asc" }],
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      label: r.label,
      journalCode: r.journalCode,
      description: r.description,
      lines: r.lines,
      active: r.active,
      dayOfMonth: r.dayOfMonth,
      lastRunAt: r.lastRunAt?.toISOString() ?? null,
      lastRunPeriod: r.lastRunPeriod,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const data = createSchema.parse(await req.json());

    // Équilibre débit = crédit.
    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit || totalDebit === 0) {
      return NextResponse.json({ error: "Modèle non équilibré (débit ≠ crédit)" }, { status: 400 });
    }

    // Plan comptable : comptes inconnus refusés (si le tenant a un plan).
    const codes = Array.from(new Set(data.lines.map((l) => l.accountCode)));
    const known = await prisma.chartOfAccounts.findMany({
      where: { tenantId: session.tenantId, code: { in: codes } },
      select: { code: true, requiresThirdParty: true },
    });
    const knownMap = new Map(known.map((k) => [k.code, k]));
    if (known.length < codes.length) {
      const chartSize = await prisma.chartOfAccounts.count({ where: { tenantId: session.tenantId } });
      if (chartSize > 0) {
        const unknown = codes.filter((c) => !knownMap.has(c));
        return NextResponse.json(
          { error: `Compte(s) inconnu(s) au plan : ${unknown.join(", ")}.` },
          { status: 400 },
        );
      }
    }

    // Tiers obligatoire sur comptes auxiliaires.
    const missingTiers = data.lines.filter(
      (l) => knownMap.get(l.accountCode)?.requiresThirdParty && !(l.thirdPartyId && l.thirdPartyId.trim()),
    );
    if (missingTiers.length > 0) {
      return NextResponse.json(
        { error: `Tiers requis pour le(s) compte(s) : ${Array.from(new Set(missingTiers.map((l) => l.accountCode))).join(", ")}` },
        { status: 400 },
      );
    }

    const created = await prisma.recurringEntry.create({
      data: {
        tenantId: session.tenantId,
        label: data.label.trim(),
        journalCode: data.journalCode.trim(),
        description: data.description.trim(),
        dayOfMonth: data.dayOfMonth ?? null,
        lines: data.lines as object,
        createdById: session.sub,
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/comptable/recurring-entries]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
