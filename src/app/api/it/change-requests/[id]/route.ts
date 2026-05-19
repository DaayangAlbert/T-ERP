import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, ProfileChangeRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().max(1000).optional(),
});

/** Liste blanche des champs qu'on accepte de modifier sur le profil User. */
const ALLOWED_FIELDS = new Set([
  "firstName",
  "lastName",
  "phone",
  "phoneMobile",
  "personalEmail",
  "address",
  "dateOfBirth",
  "cniNumber",
  "familyStatus",
  "emergencyContactName",
  "emergencyContactPhone",
  "cnpsNumber",
  "niu",
  "bankName",
  "bankAgency",
  "rib",
  "professionalCategory",
  "position",
]);

const DATE_FIELDS = new Set(["dateOfBirth"]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt("canManageUsers");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const cr = await prisma.profileChangeRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, tenantId: true } } },
  });
  if (!cr) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (cr.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  if (cr.status !== "PENDING") {
    return NextResponse.json(
      { error: `Demande déjà traitée (${cr.status})` },
      { status: 400 },
    );
  }

  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "reject") {
    await prisma.profileChangeRequest.update({
      where: { id: cr.id },
      data: {
        status: ProfileChangeRequestStatus.REJECTED,
        reviewedBy: session.sub,
        reviewedAt: now,
        reviewComment: parsed.data.comment ?? null,
      },
    });
    await prisma.notification
      .create({
        data: {
          userId: cr.userId,
          type: "profile_change_rejected",
          title: "Demande de modification refusée",
          body: parsed.data.comment ?? "Votre demande a été refusée par l'administrateur IT.",
          link: "/employe/profil",
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // approve : applique les changements au User cible
  const changes = Array.isArray(cr.changes) ? (cr.changes as Array<{
    field: string;
    requestedValue: string | null;
  }>) : [];

  const updateData: Prisma.UserUpdateInput = {};
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const ch of changes) {
    if (!ALLOWED_FIELDS.has(ch.field)) {
      skipped.push(ch.field);
      continue;
    }
    const v = ch.requestedValue;
    if (DATE_FIELDS.has(ch.field)) {
      (updateData as Record<string, unknown>)[ch.field] = v ? new Date(v) : null;
    } else {
      (updateData as Record<string, unknown>)[ch.field] = v || null;
    }
    applied.push(ch.field);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: cr.userId },
      data: updateData,
    }),
    prisma.profileChangeRequest.update({
      where: { id: cr.id },
      data: {
        status: ProfileChangeRequestStatus.APPROVED,
        reviewedBy: session.sub,
        reviewedAt: now,
        reviewComment: parsed.data.comment ?? null,
      },
    }),
  ]);

  await prisma.notification
    .create({
      data: {
        userId: cr.userId,
        type: "profile_change_approved",
        title: "Modifications de profil approuvées",
        body: `Champs mis à jour : ${applied.join(", ")}`,
        link: "/employe/profil",
      },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    appliedFields: applied,
    skippedFields: skipped,
  });
}
