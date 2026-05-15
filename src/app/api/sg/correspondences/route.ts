import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import {
  CorrespondenceConfidentiality,
  CorrespondenceDirection,
  CorrespondenceStatus,
  Role,
} from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const direction = url.searchParams.get("direction") as CorrespondenceDirection | null;
  const status = url.searchParams.get("status") as CorrespondenceStatus | "DRAFTS" | "AWAITING_DG" | null;
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const q = url.searchParams.get("q")?.trim();

  const where: any = { tenantId };
  if (direction) where.direction = direction;
  if (status === "DRAFTS") {
    where.direction = CorrespondenceDirection.OUTGOING;
    where.status = CorrespondenceStatus.RECEIVED; // brouillon = OUTGOING + RECEIVED (avant submit)
  } else if (status === "AWAITING_DG") {
    where.status = CorrespondenceStatus.AWAITING_DG_SIGNATURE;
  } else if (status) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { correspondentName: { contains: q, mode: "insensitive" } },
      { correspondentEntity: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
    ];
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [items, countsRows] = await Promise.all([
    prisma.officialCorrespondence.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.officialCorrespondence.findMany({
      where: { tenantId },
      select: {
        direction: true,
        status: true,
        date: true,
        requiresDgSignature: true,
        signedByDgAt: true,
      },
    }),
  ]);

  let incomingMonth = 0;
  let outgoingMonth = 0;
  let awaitingDg = 0;
  let handledYtd = 0;
  let drafts = 0;
  let archived = 0;
  for (const c of countsRows) {
    const inMonth = c.date >= monthStart;
    if (inMonth && c.direction === CorrespondenceDirection.INCOMING) incomingMonth++;
    if (inMonth && c.direction === CorrespondenceDirection.OUTGOING) outgoingMonth++;
    if (c.status === CorrespondenceStatus.AWAITING_DG_SIGNATURE) awaitingDg++;
    if (c.status === CorrespondenceStatus.ARCHIVED) archived++;
    if (
      c.direction === CorrespondenceDirection.OUTGOING &&
      c.status === CorrespondenceStatus.RECEIVED
    )
      drafts++;
    if (c.date >= yearStart) handledYtd++;
  }

  const enriched = items.map((c) => ({
    id: c.id,
    reference: c.reference,
    direction: c.direction,
    date: c.date.toISOString(),
    correspondentName: c.correspondentName,
    correspondentEntity: c.correspondentEntity,
    subject: c.subject,
    summary: c.summary,
    confidentiality: c.confidentiality,
    status: c.status,
    dueDate: c.dueDate?.toISOString() ?? null,
    handledAt: c.handledAt?.toISOString() ?? null,
    requiresDgSignature: c.requiresDgSignature,
    submittedToDgAt: c.submittedToDgAt?.toISOString() ?? null,
    signedByDgAt: c.signedByDgAt?.toISOString() ?? null,
    documentUrl: c.documentUrl,
    archivedInGedAt: c.archivedInGedAt?.toISOString() ?? null,
    assignedTo: c.assignedTo
      ? {
          id: c.assignedTo.id,
          fullName: `${c.assignedTo.firstName} ${c.assignedTo.lastName}`,
          role: c.assignedTo.role,
        }
      : null,
  }));

  return NextResponse.json({
    items: enriched,
    counts: {
      incomingMonth,
      outgoingMonth,
      awaitingDg,
      handledYtd,
      drafts,
      archived,
      total: countsRows.length,
    },
  });
}

const CreateSchema = z.object({
  direction: z.nativeEnum(CorrespondenceDirection),
  date: z.string().datetime().optional(),
  correspondentName: z.string().min(2).max(200),
  correspondentEntity: z.string().max(200).optional().nullable(),
  subject: z.string().min(3).max(200),
  summary: z.string().max(2000).optional().nullable(),
  confidentiality: z.nativeEnum(CorrespondenceConfidentiality).default(CorrespondenceConfidentiality.STANDARD),
  assignedToRole: z.nativeEnum(Role).optional(),
  dueInDays: z.number().int().min(1).max(180).optional(),
  requiresDgSignature: z.boolean().default(false),
  documentUrl: z.string().url().optional().nullable(),
});

async function nextReference(tenantId: string, direction: CorrespondenceDirection): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = direction === CorrespondenceDirection.INCOMING ? "CE" : "CS";
  const pattern = `${prefix}-${year}-`;
  const last = await prisma.officialCorrespondence.findFirst({
    where: { tenantId, reference: { startsWith: pattern } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNum = last ? Number(last.reference.replace(pattern, "")) || 0 : 0;
  return `${pattern}${String(lastNum + 1).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const guard = await guardSgMutation("canManageOfficialCorrespondence");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  let assignedToUserId: string | null = null;
  if (parsed.data.assignedToRole) {
    const u = await prisma.user.findFirst({
      where: { tenantId, role: parsed.data.assignedToRole, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    assignedToUserId = u?.id ?? null;
  }

  const reference = await nextReference(tenantId, parsed.data.direction);
  const dueDate = parsed.data.dueInDays
    ? new Date(Date.now() + parsed.data.dueInDays * 86_400_000)
    : null;

  const created = await prisma.officialCorrespondence.create({
    data: {
      tenantId,
      reference,
      direction: parsed.data.direction,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      correspondentName: parsed.data.correspondentName,
      correspondentEntity: parsed.data.correspondentEntity ?? null,
      subject: parsed.data.subject,
      summary: parsed.data.summary ?? null,
      confidentiality: parsed.data.confidentiality,
      assignedToUserId,
      status: CorrespondenceStatus.RECEIVED,
      dueDate,
      requiresDgSignature: parsed.data.requiresDgSignature,
      documentUrl: parsed.data.documentUrl ?? null,
    },
    select: { id: true, reference: true },
  });

  return NextResponse.json(created, { status: 201 });
}
