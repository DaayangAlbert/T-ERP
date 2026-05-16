import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";
import { AttendanceSession, AttendanceStatus } from "@prisma/client";

const schema = z.object({
  date: z.string(),
  session: z.nativeEnum(AttendanceSession),
});

export async function POST(req: Request) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session: sess, siteId } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const date = new Date(parsed.data.date);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const attendances = await prisma.attendance.findMany({
    where: { siteId, date: day, session: parsed.data.session },
  });
  const total = await prisma.siteWorkforceMember.count({
    where: { siteId, endedAt: null },
  });
  const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
  const absentCount = attendances.filter(
    (a) => a.status === AttendanceStatus.ABSENT || a.status === AttendanceStatus.JUSTIFIED_ABSENT
  ).length;

  const completion = await prisma.attendanceSessionCompletion.upsert({
    where: {
      siteId_date_session: {
        siteId,
        date: day,
        session: parsed.data.session,
      },
    },
    create: {
      siteId,
      date: day,
      session: parsed.data.session,
      completedById: sess.sub,
      completedAt: new Date(),
      presentCount,
      absentCount,
      totalCount: total,
    },
    update: {
      completedAt: new Date(),
      presentCount,
      absentCount,
      totalCount: total,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: sess.tenantId!,
      userId: sess.sub,
      action: "cc.attendance.session.complete",
      entityType: "AttendanceSessionCompletion",
      entityId: completion.id,
      metadata: { siteId, session: parsed.data.session, presentCount, absentCount },
    },
  });

  return NextResponse.json({ presentCount, absentCount, totalCount: total });
}
