import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSite, guardCcSiteMutation } from "@/lib/rbac/cc-guard";
import { AttendanceSession, AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  userId: z.string(),
  date: z.string(), // ISO date
  session: z.nativeEnum(AttendanceSession),
  status: z.nativeEnum(AttendanceStatus),
  reason: z.string().optional().nullable(),
  clientUuid: z.string().optional(),
  syncedFromOffline: z.boolean().optional(),
});

export async function GET(req: Request) {
  const guard = await guardCcSite();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const url = new URL(req.url);
  const session = (url.searchParams.get("session") as AttendanceSession | null) ?? AttendanceSession.MORNING;
  const dateStr = url.searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const items = await prisma.attendance.findMany({
    where: { siteId, date: day, session },
  });

  const completion = await prisma.attendanceSessionCompletion.findFirst({
    where: { siteId, date: day, session },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      userId: a.userId,
      status: a.status,
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      reason: a.reason,
    })),
    completion: completion
      ? {
          completedAt: completion.completedAt.toISOString(),
          presentCount: completion.presentCount,
          absentCount: completion.absentCount,
          totalCount: completion.totalCount,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session: sess, siteId } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const date = new Date(parsed.data.date);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Upsert : si déjà pointé pour ce user/site/date/session, on met à jour
  const attendance = await prisma.attendance.upsert({
    where: {
      siteId_userId_date_session: {
        siteId,
        userId: parsed.data.userId,
        date: day,
        session: parsed.data.session,
      },
    },
    create: {
      siteId,
      userId: parsed.data.userId,
      date: day,
      session: parsed.data.session,
      status: parsed.data.status,
      checkedInAt: parsed.data.status === AttendanceStatus.PRESENT ? new Date() : null,
      reason: parsed.data.reason ?? null,
      recordedById: sess.sub,
      syncedFromOffline: parsed.data.syncedFromOffline ?? false,
      clientUuid: parsed.data.clientUuid ?? null,
    },
    update: {
      status: parsed.data.status,
      checkedInAt: parsed.data.status === AttendanceStatus.PRESENT ? new Date() : null,
      reason: parsed.data.reason ?? null,
      recordedById: sess.sub,
    },
  });

  return NextResponse.json({ id: attendance.id }, { status: 201 });
}
