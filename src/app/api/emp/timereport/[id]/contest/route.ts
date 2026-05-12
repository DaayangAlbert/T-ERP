import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

const CONTEST_WINDOW_HOURS = 48;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as { kind?: string; expectedTime?: string; reason?: string };
  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: "Justification requise (5+ caractères)" }, { status: 400 });
  }

  const report = await prisma.timeReport.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });
  if (report.userId !== session.sub) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (report.contestedAt) return NextResponse.json({ error: "Pointage déjà contesté" }, { status: 409 });

  const hoursSince = (Date.now() - report.date.getTime()) / 3600_000;
  if (hoursSince > CONTEST_WINDOW_HOURS) {
    return NextResponse.json({ error: `Délai dépassé : signalement possible sous ${CONTEST_WINDOW_HOURS}h` }, { status: 422 });
  }

  await prisma.timeReport.update({
    where: { id: params.id },
    data: {
      contestedAt: new Date(),
      contestReason: `[${body.kind ?? "OTHER"}] heure attendue ${body.expectedTime ?? "—"} · ${body.reason}`,
    },
  });

  return NextResponse.json({ ok: true });
}
