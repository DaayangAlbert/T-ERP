import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  reason: z.string().max(2000).optional(),
  changes: z
    .array(
      z.object({
        field: z.string().min(1).max(60),
        currentValue: z.string().nullable().optional(),
        requestedValue: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});

/**
 * Soumission d'une demande de modification de profil par l'employé.
 * L'IT_ADMIN du tenant traitera la demande depuis /informatique/change-requests.
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Refuse si une demande PENDING existe déjà pour cet user (anti-spam)
  const existing = await prisma.profileChangeRequest.findFirst({
    where: { userId: session.sub, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Une demande est déjà en attente. Attendez la décision de l'IT avant d'en soumettre une nouvelle.",
        existingId: existing.id,
      },
      { status: 409 },
    );
  }

  const created = await prisma.profileChangeRequest.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      reason: parsed.data.reason ?? null,
      changes: parsed.data.changes,
    },
    select: { id: true, createdAt: true },
  });

  // Notifications IT_ADMIN du tenant
  const itAdmins = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: "TENANT_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  for (const admin of itAdmins) {
    await prisma.notification
      .create({
        data: {
          userId: admin.id,
          type: "profile_change_request",
          title: "Nouvelle demande de modification profil",
          body: parsed.data.reason
            ? `Raison : ${parsed.data.reason.slice(0, 240)}`
            : `${parsed.data.changes.length} champ(s) à modifier`,
          link: `/informatique/change-requests/${created.id}`,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json(
    {
      ok: true,
      id: created.id,
      createdAt: created.createdAt.toISOString(),
      notified: itAdmins.length,
    },
    { status: 201 },
  );
}

/**
 * GET : liste des demandes de l'utilisateur connecté (historique).
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const items = await prisma.profileChangeRequest.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      reason: true,
      changes: true,
      reviewComment: true,
      reviewedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      reviewedAt: i.reviewedAt?.toISOString() ?? null,
    })),
  });
}
