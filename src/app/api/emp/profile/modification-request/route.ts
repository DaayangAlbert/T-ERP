import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "phoneMobile",
  "address",
  "personalEmail",
  "familyStatus",
  "emergencyContactName",
  "emergencyContactPhone",
  "bankName",
  "rib",
] as const;

export async function POST(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as { field?: string; newValue?: string; justification?: string };
  if (!body.field || !ALLOWED_FIELDS.includes(body.field as (typeof ALLOWED_FIELDS)[number])) {
    return NextResponse.json({ error: "Champ non autorisé" }, { status: 400 });
  }
  if (!body.newValue || !body.justification || body.justification.trim().length < 5) {
    return NextResponse.json({ error: "Nouvelle valeur et justification (5+ caractères) requises" }, { status: 400 });
  }

  // Récupération de la valeur actuelle pour traçabilité
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { firstName: true, lastName: true, phoneMobile: true, address: true, personalEmail: true, familyStatus: true, emergencyContactName: true, emergencyContactPhone: true, bankName: true, rib: true },
  });
  if (!user) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const currentValue = (user as unknown as Record<string, string | null>)[body.field] ?? "—";

  // AuditLog (demande de modif)
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "emp.profile.modification_request",
      entityType: "User",
      entityId: session.sub,
      metadata: {
        field: body.field,
        currentValue,
        newValue: body.newValue,
        justification: body.justification,
        status: "PENDING_HR",
      },
    },
  });

  // Notification RH du tenant
  const hrUsers = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: Role.HR },
    select: { id: true },
  });
  for (const hr of hrUsers) {
    await prisma.notification.create({
      data: {
        userId: hr.id,
        type: "emp_profile_modification",
        title: `Demande modif profil — ${user.firstName} ${user.lastName}`,
        body: `Champ « ${body.field} » : ${currentValue} → ${body.newValue}`,
        link: `/rh/personnel?focus=${session.sub}`,
      },
    });
  }

  return NextResponse.json({ ok: true, pendingValidators: hrUsers.length });
}
