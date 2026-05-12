import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, ClassificationCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

const CATEGORY_LABELS: Record<ClassificationCategory, string> = {
  MARKETS: "Marchés",
  TECHNICAL: "Techniques",
  HR: "RH",
  ACCOUNTING: "Comptables",
  LEGAL: "Juridiques",
  QSE: "QSE",
  OTHER: "Autres",
};

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé GED / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as ClassificationCategory | null;

  const where = {
    tenantId: session.tenantId,
    active: true,
    ...(category && Object.keys(CATEGORY_LABELS).includes(category) ? { category } : {}),
  };

  const [items, counts, docCounts] = await Promise.all([
    prisma.documentClassification.findMany({
      where,
      include: { workflow: { select: { code: true, name: true } } },
      orderBy: [{ category: "asc" }, { prefix: "asc" }],
    }),
    prisma.documentClassification.groupBy({
      by: ["category"],
      where: { tenantId: session.tenantId, active: true },
      _count: { _all: true },
    }),
    prisma.document.groupBy({
      by: ["classificationId"],
      where: { tenantId: session.tenantId },
      _count: { _all: true },
    }),
  ]);

  const usageByClassif = new Map<string, number>();
  for (const d of docCounts) if (d.classificationId) usageByClassif.set(d.classificationId, d._count._all);

  const totalsByCategory: Record<string, number> = {};
  for (const c of counts) totalsByCategory[c.category] = c._count._all;
  const totalAll = Object.values(totalsByCategory).reduce((s, n) => s + n, 0);

  return NextResponse.json({
    totals: {
      all: totalAll,
      byCategory: totalsByCategory,
    },
    categoryLabels: CATEGORY_LABELS,
    items: items.map((c) => ({
      id: c.id,
      prefix: c.prefix,
      code: c.code,
      name: c.name,
      category: c.category,
      categoryLabel: CATEGORY_LABELS[c.category],
      dua: c.dua,
      duaYears: c.duaYears,
      duaTrigger: c.duaTrigger,
      confidentiality: c.confidentiality,
      workflowCode: c.workflow?.code ?? null,
      workflowName: c.workflow?.name ?? null,
      requiredValidators: c.requiredValidators,
      documentsCount: usageByClassif.get(c.id) ?? 0,
    })),
  });
}

const NEW_CLASSIFICATION_REQUIRED_ROLES: Role[] = [Role.ARCHIVIST, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!NEW_CLASSIFICATION_REQUIRED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Archiviste" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    prefix?: string;
    code?: string;
    name?: string;
    category?: ClassificationCategory;
    dua?: string;
    duaYears?: number;
    duaTrigger?: string;
    confidentiality?: string;
    workflowCode?: string;
  };

  if (!body.prefix || !body.code || !body.name || !body.category || !body.dua || !body.confidentiality) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const exists = await prisma.documentClassification.findUnique({
    where: { tenantId_prefix: { tenantId: session.tenantId, prefix: body.prefix } },
  });
  if (exists) return NextResponse.json({ error: "Préfixe déjà utilisé" }, { status: 409 });

  let workflowId: string | null = null;
  if (body.workflowCode) {
    const wf = await prisma.documentWorkflowTemplate.findFirst({
      where: { tenantId: session.tenantId, code: body.workflowCode },
    });
    workflowId = wf?.id ?? null;
  }

  const created = await prisma.documentClassification.create({
    data: {
      tenantId: session.tenantId,
      prefix: body.prefix,
      code: body.code,
      name: body.name,
      category: body.category,
      dua: body.dua,
      duaYears: body.duaYears ?? null,
      duaTrigger: (body.duaTrigger as "CREATION_DATE" | "END_OF_FISCAL_YEAR" | "EMPLOYEE_DEPARTURE" | "PROJECT_CLOSURE" | "OTHER") ?? "CREATION_DATE",
      confidentiality: body.confidentiality as "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL",
      workflowId,
      requiredValidators: [],
      active: true,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
