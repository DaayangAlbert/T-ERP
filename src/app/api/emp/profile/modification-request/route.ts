import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { Prisma, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "phone",
  "phoneMobile",
  "address",
  "personalEmail",
  "familyStatus",
  "emergencyContactName",
  "emergencyContactPhone",
  "cniNumber",
  "cnpsNumber",
  "niu",
  "bankName",
  "bankAgency",
  "rib",
] as const;

/**
 * Endpoint historique (format singulier : 1 demande = 1 champ).
 * Crée maintenant un `ProfileChangeRequest` consommé par /informatique/
 * change-requests côté IT_ADMIN, et notifie l'IT (workflow validation).
 * Notifie aussi le RH en parallèle (suivi métier).
 */
export async function POST(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as {
    field?: string;
    newValue?: string;
    justification?: string;
  };
  if (
    !body.field ||
    !ALLOWED_FIELDS.includes(body.field as (typeof ALLOWED_FIELDS)[number])
  ) {
    return NextResponse.json({ error: "Champ non autorisé" }, { status: 400 });
  }
  if (
    !body.newValue ||
    !body.justification ||
    body.justification.trim().length < 5
  ) {
    return NextResponse.json(
      { error: "Nouvelle valeur et justification (5+ caractères) requises" },
      { status: 400 },
    );
  }

  // Refuse si une demande PENDING existe déjà
  const existing = await prisma.profileChangeRequest.findFirst({
    where: { userId: session.sub, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Une demande est déjà en attente. Attendez la décision de l'IT avant d'en soumettre une nouvelle.",
      },
      { status: 409 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      phoneMobile: true,
      address: true,
      personalEmail: true,
      familyStatus: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      cniNumber: true,
      cnpsNumber: true,
      niu: true,
      bankName: true,
      bankAgency: true,
      rib: true,
    },
  });
  if (!user)
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  const currentValue =
    ((user as unknown as Record<string, string | null>)[body.field] ?? "") || null;

  if (!session.tenantId) {
    return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
  }

  // Création de la demande structurée
  const cr = await prisma.profileChangeRequest.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      reason: body.justification,
      changes: [
        {
          field: body.field,
          currentValue,
          requestedValue: body.newValue,
        },
      ] as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  // Audit interne (compat historique)
  await prisma.auditLog
    .create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "emp.profile.modification_request",
        entityType: "User",
        entityId: session.sub,
        metadata: {
          changeRequestId: cr.id,
          field: body.field,
          currentValue: currentValue ?? "—",
          newValue: body.newValue,
          justification: body.justification,
        },
      },
    })
    .catch(() => {});

  // Notifications : IT_ADMIN (workflow d'approbation) + RH (suivi métier)
  const reviewers = await prisma.user.findMany({
    where: {
      tenantId: session.tenantId,
      role: { in: [Role.TENANT_ADMIN, Role.HR] },
      status: "ACTIVE",
    },
    select: { id: true, role: true },
  });
  for (const r of reviewers) {
    const isIt = r.role === Role.TENANT_ADMIN;
    await prisma.notification
      .create({
        data: {
          userId: r.id,
          type: isIt ? "profile_change_request" : "emp_profile_modification",
          title: isIt
            ? "Nouvelle demande de modification profil"
            : `Demande modif profil — ${user.firstName} ${user.lastName}`,
          body: `Champ « ${body.field} » : ${currentValue ?? "—"} → ${body.newValue}\nMotif : ${body.justification}`,
          link: isIt
            ? `/informatique/change-requests`
            : `/rh/personnel?focus=${session.sub}`,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    changeRequestId: cr.id,
    notified: reviewers.length,
  });
}
