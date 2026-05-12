import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(10).max(2000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      stage: true,
      jobOffer: {
        select: {
          title: true,
          tenantId: true,
        },
      },
    },
  });
  if (!app)
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  if (app.userId !== session.sub)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  if (["HIRED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(app.stage))
    return NextResponse.json(
      { error: "Cette candidature n'est plus active" },
      { status: 400 },
    );

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Notifier les RH du tenant
  const hrUsers = await prisma.user.findMany({
    where: { tenantId: app.jobOffer.tenantId, role: "HR" },
    select: { id: true },
  });
  for (const hr of hrUsers) {
    await prisma.notification
      .create({
        data: {
          userId: hr.id,
          type: "candidate_followup",
          title: `Relance candidat — ${app.jobOffer.title}`,
          body: parsed.data.message,
          link: `/rh/recrutement/candidatures/${app.id}`,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, notified: hrUsers.length });
}
