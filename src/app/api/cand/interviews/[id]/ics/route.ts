import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function icsDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}
function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      applicationId: true,
      scheduledAt: true,
      duration: true,
      mode: true,
      location: true,
    },
  });
  if (!interview)
    return NextResponse.json({ error: "Entretien introuvable" }, { status: 404 });

  const app = await prisma.application.findUnique({
    where: { id: interview.applicationId },
    select: { userId: true, jobOffer: { select: { title: true } } },
  });
  if (!app || app.userId !== session.sub)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const start = new Date(interview.scheduledAt);
  const end = new Date(start.getTime() + interview.duration * 60_000);

  const summary = `Entretien — ${app.jobOffer.title}`;
  const description =
    `Entretien ${interview.mode}${interview.location ? ` · ${interview.location}` : ""}.\n` +
    `Confirmer votre présence sur https://terpgroup.com/cand/entretiens`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//T-ERP//Candidat//FR",
    "BEGIN:VEVENT",
    `UID:${interview.id}@terpgroup.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(description)}`,
    interview.location ? `LOCATION:${escape(interview.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="entretien-${interview.id}.ics"`,
    },
  });
}
