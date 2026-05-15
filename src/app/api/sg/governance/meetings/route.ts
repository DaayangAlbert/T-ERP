import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import { MeetingStatus, MeetingType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as MeetingStatus | null;
  const type = url.searchParams.get("type") as MeetingType | null;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (type) where.type = type;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [meetings, scheduledCount, completedYtd, nextMeeting] = await Promise.all([
    prisma.governanceMeeting.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      include: {
        _count: { select: { decisions: true } },
      },
    }),
    prisma.governanceMeeting.count({ where: { tenantId, status: MeetingStatus.SCHEDULED } }),
    prisma.governanceMeeting.count({
      where: { tenantId, status: MeetingStatus.COMPLETED, scheduledAt: { gte: yearStart } },
    }),
    prisma.governanceMeeting.findFirst({
      where: { tenantId, status: MeetingStatus.SCHEDULED, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      include: { decisions: { orderBy: { decisionNumber: "asc" } } },
    }),
  ]);

  const boardCount = await prisma.boardMember.count({ where: { tenantId, status: "ACTIVE" } });

  return NextResponse.json({
    kpis: {
      boardMembersCount: boardCount,
      scheduledCount,
      completedYtd,
      nextMeetingDaysAway: nextMeeting
        ? Math.max(0, Math.ceil((nextMeeting.scheduledAt.getTime() - now.getTime()) / 86_400_000))
        : null,
    },
    nextMeeting: nextMeeting
      ? {
          id: nextMeeting.id,
          type: nextMeeting.type,
          scheduledAt: nextMeeting.scheduledAt.toISOString(),
          location: nextMeeting.location,
          status: nextMeeting.status,
          convocationsSentAt: nextMeeting.convocationsSentAt?.toISOString() ?? null,
          agenda: nextMeeting.agenda,
          convocationsRecipients: nextMeeting.convocationsRecipients,
          pvSignedAt: nextMeeting.pvSignedAt?.toISOString() ?? null,
          decisionsCount: nextMeeting.decisions.length,
        }
      : null,
    meetings: meetings.map((m) => ({
      id: m.id,
      type: m.type,
      scheduledAt: m.scheduledAt.toISOString(),
      location: m.location,
      status: m.status,
      convocationsSentAt: m.convocationsSentAt?.toISOString() ?? null,
      pvSignedAt: m.pvSignedAt?.toISOString() ?? null,
      pvDocumentUrl: m.pvDocumentUrl,
      decisionsCount: m._count.decisions,
    })),
  });
}

const createSchema = z.object({
  type: z.nativeEnum(MeetingType),
  scheduledAt: z.string().datetime(),
  location: z.string().min(2).max(200),
  agenda: z
    .object({
      items: z
        .array(
          z.object({
            num: z.number().int().positive(),
            title: z.string().min(2).max(200),
            duration: z.string().optional(),
          }),
        )
        .min(1),
    })
    .default({ items: [] }),
  convocationsRecipients: z.any().default({}),
});

export async function POST(req: Request) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const created = await prisma.governanceMeeting.create({
      data: {
        tenantId,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        location: data.location,
        agenda: data.agenda,
        convocationsRecipients: data.convocationsRecipients ?? {},
        status: MeetingStatus.SCHEDULED,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
