import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

// Pour Comptable Chantier : seuls ACH/VTE/CAI sont accessibles. Autres journaux interdits.
const SITE_ACCOUNTANT_JOURNALS = new Set(["ACH", "VTE", "CAI"]);

const lineSchema = z.object({
  accountCode: z.string().min(1),
  thirdPartyId: z.string().nullable().optional(),
  description: z.string(),
  debit: z.coerce.number().nonnegative().default(0),
  credit: z.coerce.number().nonnegative().default(0),
  siteId: z.string().nullable().optional(),
});

const createSchema = z.object({
  journalCode: z.string().min(2),
  entryDate: z.string(), // ISO
  reference: z.string().min(1),
  description: z.string().min(1),
  siteId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(2),
  validate: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const journal = url.searchParams.get("journal");
  const period = url.searchParams.get("period"); // "YYYY-MM"

  const allowed = await getAccessibleSiteIds(session.sub);
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (journal) where.journalCode = journal;
  if (allowed !== null) where.siteId = { in: allowed };
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [yy, mm] = period.split("-").map(Number);
    where.entryDate = {
      gte: new Date(yy, mm - 1, 1),
      lt: new Date(yy, mm, 1),
    };
  }

  const items = await prisma.entry.findMany({
    where,
    orderBy: { entryDate: "desc" },
    include: {
      lines: true,
      site: { select: { code: true, name: true } },
    },
  });

  // Totaux
  const totalDebit = items.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + Number(l.debit), 0),
    0
  );
  const totalCredit = items.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + Number(l.credit), 0),
    0
  );

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      reference: e.reference,
      entryDate: e.entryDate.toISOString(),
      description: e.description,
      journalCode: e.journalCode,
      site: e.site,
      siteId: e.siteId,
      status: e.status,
      lines: e.lines.map((l) => ({
        ...l,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
      totalDebit: e.lines.reduce((a, l) => a + Number(l.debit), 0),
      totalCredit: e.lines.reduce((a, l) => a + Number(l.credit), 0),
    })),
    totals: { debit: totalDebit, credit: totalCredit, balanced: totalDebit === totalCredit },
    scope: { isDirection: allowed === null, siteIds: allowed },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  // Comptable Chantier : limité aux journaux ACH/VTE/CAI
  if (allowed !== null && !SITE_ACCOUNTANT_JOURNALS.has(parsed.data.journalCode)) {
    return NextResponse.json(
      { error: "Comptable Chantier limité aux journaux ACH, VTE, CAI" },
      { status: 403 }
    );
  }

  // Vérification du périmètre chantier
  if (parsed.data.siteId && !isSiteAllowed(allowed, parsed.data.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  if (allowed !== null && !parsed.data.siteId) {
    return NextResponse.json(
      { error: "Le Comptable Chantier doit rattacher l'écriture à un de ses chantiers" },
      { status: 400 }
    );
  }
  for (const line of parsed.data.lines) {
    if (line.siteId && !isSiteAllowed(allowed, line.siteId)) {
      return NextResponse.json({ error: "Une ligne pointe vers un chantier hors périmètre" }, { status: 403 });
    }
  }

  // Vérification équilibre débit/crédit
  const totalDebit = parsed.data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = parsed.data.lines.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit || totalDebit === 0) {
    return NextResponse.json({ error: "Écriture non équilibrée (débit ≠ crédit)" }, { status: 400 });
  }

  const created = await prisma.entry.create({
    data: {
      tenantId: session.tenantId,
      siteId: parsed.data.siteId ?? null,
      journalCode: parsed.data.journalCode,
      entryDate: new Date(parsed.data.entryDate),
      reference: parsed.data.reference,
      description: parsed.data.description,
      status: parsed.data.validate ? CptEntryStatus.VALIDATED : CptEntryStatus.DRAFT,
      createdById: session.sub,
      validatedById: parsed.data.validate ? session.sub : null,
      validatedAt: parsed.data.validate ? new Date() : null,
      lines: {
        create: parsed.data.lines.map((l) => ({
          accountCode: l.accountCode,
          thirdPartyId: l.thirdPartyId ?? null,
          description: l.description,
          debit: BigInt(Math.round(l.debit)),
          credit: BigInt(Math.round(l.credit)),
          siteId: l.siteId ?? parsed.data.siteId ?? null,
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: parsed.data.validate ? "entry.validate" : "entry.create",
      entityType: "Entry",
      entityId: created.id,
      metadata: {
        journal: parsed.data.journalCode,
        amount: totalDebit,
        siteId: parsed.data.siteId,
      },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
