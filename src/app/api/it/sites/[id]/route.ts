/**
 * Marché/chantier (espace IT) — détail pour préremplir le formulaire + édition.
 * Cohérent avec POST /api/it/sites (mêmes champs, financement inclus).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt, guardItMutation } from "@/lib/rbac/it-guard";
import { SiteType, SiteStatus, MoaType, ContractTypeSite, FinancingType } from "@prisma/client";

export const dynamic = "force-dynamic";

function addMonths(start: Date, months: number): Date {
  const d = new Date(start);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

function asFinancings(v: unknown): { label: string; amountHT: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is { label?: unknown; amountHT?: unknown } => typeof x === "object" && x !== null)
    .map((x) => ({ label: String(x.label ?? ""), amountHT: String(x.amountHT ?? "0") }));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const s = await prisma.site.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  });
  if (!s) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  return NextResponse.json({
    id: s.id,
    code: s.code,
    name: s.name,
    client: s.client,
    type: s.type,
    region: s.region ?? "",
    status: s.status,
    managerId: s.managerId ?? "",
    marginTarget: s.marginTarget,
    moaName: s.moaName ?? "",
    moaTypeKind: s.moaTypeKind ?? "",
    contractTypeKind: s.contractTypeKind ?? "",
    financingType: s.financingType,
    financings: asFinancings(s.financings),
    vatRate: s.vatRate,
    irRate: s.irRate,
    startDate: s.startDate.toISOString().slice(0, 10),
    durationMonths: s.durationMonths ?? 12,
  });
}

const financingRowSchema = z.object({
  label: z.string().max(120).default(""),
  amountHT: z.number().int().nonnegative(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(160),
  client: z.string().min(2).max(160),
  type: z.nativeEnum(SiteType),
  region: z.string().max(80).optional(),
  status: z.nativeEnum(SiteStatus),
  managerId: z.string().optional().nullable(),
  marginTarget: z.number().min(0).max(100).default(20),
  moaName: z.string().max(160).optional(),
  moaTypeKind: z.nativeEnum(MoaType).optional(),
  contractTypeKind: z.nativeEnum(ContractTypeSite).optional(),
  financingType: z.nativeEnum(FinancingType).default(FinancingType.SINGLE),
  financings: z.array(financingRowSchema).min(1),
  vatRate: z.number().min(0).max(100).default(19.25),
  irRate: z.number().min(0).max(100).default(0),
  startDate: z.string().min(8),
  durationMonths: z.number().int().min(1).max(600),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardItMutation("canManageTenantSettings");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const existing = await prisma.site.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Manager : doit appartenir au tenant si fourni.
  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: data.managerId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!manager) return NextResponse.json({ error: "Manager introuvable dans le tenant" }, { status: 404 });
  }

  const totalHT = data.financings.reduce((sum, f) => sum + f.amountHT, 0);
  const startDate = new Date(data.startDate);
  const plannedEndDate = addMonths(startDate, data.durationMonths);
  const financings = data.financings.map((f) => ({ label: f.label.trim(), amountHT: String(f.amountHT) }));

  await prisma.site.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      client: data.client,
      type: data.type,
      region: data.region || null,
      status: data.status,
      managerId: data.managerId || null,
      marginTarget: data.marginTarget,
      moaName: data.moaName ?? null,
      moaTypeKind: data.moaTypeKind ?? null,
      contractTypeKind: data.contractTypeKind ?? null,
      financingType: data.financingType,
      financings,
      vatRate: data.vatRate,
      irRate: data.irRate,
      budget: BigInt(totalHT),
      startDate,
      plannedEndDate,
      durationMonths: data.durationMonths,
    },
    select: { id: true, code: true, name: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "it.site.update",
      entityType: "Site",
      entityId: existing.id,
      metadata: { name: data.name },
    },
  });

  const updated = await prisma.site.findUnique({
    where: { id: existing.id },
    select: { id: true, code: true, name: true },
  });
  return NextResponse.json({ ok: true, site: updated });
}
