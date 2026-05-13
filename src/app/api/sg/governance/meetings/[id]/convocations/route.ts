import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { GedAuditAction, MeetingType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  recipients: z.array(
    z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
  ),
  channels: z.array(z.enum(["EMAIL", "WHATSAPP", "REGISTERED_MAIL"])).min(1),
  message: z.string().optional(),
});

// POST /api/sg/governance/meetings/:id/convocations — enregistre l'envoi de
// convocations (multi-canal). Stub : trace l'action + horodate. Le vrai envoi
// est branché à Resend (email) + ouvertures (WhatsApp) en phase 2.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  const m = await prisma.governanceMeeting.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, status: true, type: true, scheduledAt: true, location: true },
  });
  if (!m) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
  if (m.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Convocations possibles uniquement avant tenue" }, { status: 409 });
  }

  // Vérification délai légal : 15 j pour CA, 30 j pour AG
  const requiredDays = m.type === MeetingType.BOARD_MEETING ? 15 : 30;
  const daysToMeeting = Math.ceil((m.scheduledAt.getTime() - Date.now()) / 86_400_000);
  if (daysToMeeting < requiredDays) {
    return NextResponse.json(
      {
        error: `Délai légal non respecté : ${requiredDays} j requis pour ${m.type === MeetingType.BOARD_MEETING ? "CA" : "AG"}, ${daysToMeeting} j restants`,
      },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.$transaction([
      prisma.governanceMeeting.update({
        where: { id: m.id },
        data: {
          convocationsSentAt: new Date(),
          convocationsRecipients: {
            count: data.recipients.length,
            channels: data.channels,
            sentAt: new Date().toISOString(),
            sentBy: userId,
          },
        },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.DIFFUSION,
          metadata: {
            kind: "GOVERNANCE_CONVOCATIONS",
            meetingId: m.id,
            recipientsCount: data.recipients.length,
            channels: data.channels,
            messagePreview: data.message?.slice(0, 200) ?? null,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      recipientsCount: data.recipients.length,
      channels: data.channels,
      legalDelayOk: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
