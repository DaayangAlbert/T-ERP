import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { Role, LeaveType, LeaveStatus } from "@prisma/client";
import { countWorkingDays, getCameroonHolidays } from "@/lib/holidays-cameroon";
import { sendWhatsappTemplate } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

interface CreateBody {
  type: LeaveType;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  reason?: string;
  justificationDoc?: string;
}

/**
 * Création d'une demande de congé.
 *
 * Règles métier :
 *  - Maladie : certificat médical obligatoire (justificationDoc).
 *  - Calcul automatique du nombre de jours ouvrés (excl. dimanches +
 *    fériés camerounais).
 *  - Pour les congés payés : vérification du solde disponible.
 *  - Détermination du validateur : ouvrier → Chef de Chantier (SITE_MANAGER
 *    sur son chantier), employé bureau → premier manager direct trouvé.
 *  - Envoi d'une notification WhatsApp au validateur (template stub).
 */
export async function POST(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body || !body.type || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "type, startDate et endDate requis" }, { status: 400 });
  }

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début" }, { status: 400 });
  }

  // Certificat obligatoire pour maladie
  if (body.type === LeaveType.SICK && !body.justificationDoc) {
    return NextResponse.json(
      { error: "Certificat médical obligatoire pour un congé maladie" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      firstName: true,
      lastName: true,
      tenantId: true,
      role: true,
      assignedSiteIds: true,
    },
  });
  if (!me || !me.tenantId) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Jours ouvrés
  const year = start.getUTCFullYear();
  const holidays = getCameroonHolidays(year);
  const daysCount = countWorkingDays(start, end, holidays);
  if (daysCount === 0) {
    return NextResponse.json(
      { error: "Aucun jour ouvré sur la période sélectionnée (week-end ou férié uniquement)" },
      { status: 400 }
    );
  }

  // Vérif solde pour les congés payés
  if (body.type === LeaveType.PAID_LEAVE) {
    const balance = await prisma.leaveBalance.findFirst({
      where: { userId: session.sub, year },
      select: { paidLeaveRemaining: true },
    });
    const remaining = balance?.paidLeaveRemaining ?? 30;
    if (daysCount > remaining) {
      return NextResponse.json(
        { error: `Solde insuffisant : ${remaining} j disponibles, demande de ${daysCount} j` },
        { status: 400 }
      );
    }
  }

  // Détermination du validateur
  const primarySiteId = me.assignedSiteIds[0];
  let validator: { id: string; firstName: string; lastName: string; phoneMobile: string | null; phone: string | null } | null = null;
  if (me.role === Role.WORKER && primarySiteId) {
    // Ouvrier → Chef de Chantier du chantier
    validator = await prisma.user.findFirst({
      where: {
        role: Role.SITE_MANAGER,
        assignedSiteIds: { has: primarySiteId },
      },
      select: { id: true, firstName: true, lastName: true, phoneMobile: true, phone: true },
    });
  }
  if (!validator) {
    // Employée bureau ou pas de CC : prend la première personne HR du tenant
    validator = await prisma.user.findFirst({
      where: { tenantId: me.tenantId, role: Role.HR },
      select: { id: true, firstName: true, lastName: true, phoneMobile: true, phone: true },
    });
  }

  const created = await prisma.leaveRequest.create({
    data: {
      tenantId: me.tenantId,
      userId: session.sub,
      employeeKey: session.sub,
      employeeName: `${me.firstName} ${me.lastName}`,
      type: body.type,
      startDate: start,
      endDate: end,
      daysCount,
      reason: body.reason ?? null,
      justificationDoc: body.justificationDoc ?? null,
      status: LeaveStatus.PENDING,
      validatorUserId: validator?.id ?? null,
    },
    select: { id: true, daysCount: true, startDate: true, endDate: true, validatorUserId: true },
  });

  // Notification WhatsApp au validateur (stub) — le validateur reçoit un
  // appel à valider, pas le template "REQUEST_APPROVED" qui est pour la suite.
  // Ici on log seulement ; la queue de validation côté CC traitera le suivi.
  if (validator) {
    const validatorPhone = validator.phoneMobile ?? validator.phone;
    if (validatorPhone) {
      console.log(
        `[WhatsApp][stub] Validateur ${validator.firstName} ${validator.lastName} (${validatorPhone}) à notifier de la nouvelle demande ${created.id}`
      );
    }
  }

  return NextResponse.json({
    request: created,
    validator: validator ? `${validator.firstName} ${validator.lastName}` : null,
    daysCount,
    workingDaysCalculation: { holidaysExcluded: holidays.filter((h) => h.date >= body.startDate && h.date <= body.endDate) },
  });
}

/**
 * Validation/Rejet d'une demande par le manager — utile pour le démo
 * "Jean valide la demande de François". Vérifie que le caller est bien
 * le validateur attribué ; sinon 403.
 */
export async function PATCH(req: Request) {
  const guard = guardEmp();
  // Permet aussi à un CC (SITE_MANAGER) de valider — donc on relâche le guard EMP
  // pour cette route en faisant la vérif manuellement.
  // Récupération de session via le module session direct.
  // Ici on garde guardEmp() seulement si on veut interdire les rôles non-EMP ;
  // pour la validation, on autorise les rôles managers via une vérif séparée.
  const { getCurrentSession } = await import("@/lib/session");
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  void guard; // garde non utilisée — on n'impose pas EMP ici

  const body = (await req.json().catch(() => null)) as
    | { requestId: string; decision: "APPROVE" | "REJECT"; rejectionReason?: string }
    | null;
  if (!body) return NextResponse.json({ error: "requestId et decision requis" }, { status: 400 });

  const lr = await prisma.leaveRequest.findUnique({
    where: { id: body.requestId },
    select: { id: true, userId: true, validatorUserId: true, status: true, type: true, daysCount: true, employeeName: true, startDate: true, endDate: true, tenantId: true },
  });
  if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (lr.status !== "PENDING") {
    return NextResponse.json({ error: `Demande déjà ${lr.status}` }, { status: 400 });
  }
  if (lr.validatorUserId && lr.validatorUserId !== session.sub) {
    return NextResponse.json({ error: "Vous n'êtes pas le validateur assigné" }, { status: 403 });
  }

  if (body.decision === "APPROVE") {
    await prisma.leaveRequest.update({
      where: { id: lr.id },
      data: {
        status: "RH_APPROVED",
        rhValidatedBy: session.sub,
        rhValidatedAt: new Date(),
      },
    });
    // Décrémenter le solde pour les congés payés
    if (lr.type === "PAID_LEAVE" && lr.userId) {
      const year = lr.startDate.getUTCFullYear();
      const balance = await prisma.leaveBalance.findFirst({
        where: { userId: lr.userId, year },
        select: { id: true, paidLeaveTaken: true, paidLeaveRemaining: true },
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            paidLeaveTaken: balance.paidLeaveTaken + lr.daysCount,
            paidLeaveRemaining: Math.max(0, balance.paidLeaveRemaining - lr.daysCount),
          },
        });
      }
    }
    // Notification WhatsApp au demandeur
    if (lr.userId) {
      const owner = await prisma.user.findUnique({
        where: { id: lr.userId },
        select: { firstName: true, phoneMobile: true, phone: true },
      });
      const validator = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { firstName: true, lastName: true },
      });
      const phone = owner?.phoneMobile ?? owner?.phone;
      if (owner && phone && validator) {
        await sendWhatsappTemplate({
          templateKey: "LEAVE_REQUEST_APPROVED",
          toUserId: lr.userId,
          toPhone: phone,
          variables: {
            nom: owner.firstName,
            date_debut: lr.startDate.toISOString().slice(0, 10),
            date_fin: lr.endDate.toISOString().slice(0, 10),
            validator: `${validator.firstName} ${validator.lastName}`,
          },
        });
      }
    }
    return NextResponse.json({ ok: true, status: "RH_APPROVED" });
  }

  if (body.decision === "REJECT") {
    if (!body.rejectionReason) {
      return NextResponse.json({ error: "Motif de refus requis" }, { status: 400 });
    }
    await prisma.leaveRequest.update({
      where: { id: lr.id },
      data: {
        status: "REJECTED",
        rejectionReason: body.rejectionReason,
        rhValidatedBy: session.sub,
        rhValidatedAt: new Date(),
      },
    });
    if (lr.userId) {
      const owner = await prisma.user.findUnique({
        where: { id: lr.userId },
        select: { firstName: true, phoneMobile: true, phone: true },
      });
      const validator = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { firstName: true, lastName: true },
      });
      const phone = owner?.phoneMobile ?? owner?.phone;
      if (owner && phone && validator) {
        await sendWhatsappTemplate({
          templateKey: "LEAVE_REQUEST_REJECTED",
          toUserId: lr.userId,
          toPhone: phone,
          variables: {
            nom: owner.firstName,
            date_debut: lr.startDate.toISOString().slice(0, 10),
            date_fin: lr.endDate.toISOString().slice(0, 10),
            validator: `${validator.firstName} ${validator.lastName}`,
            raison: body.rejectionReason,
          },
        });
      }
    }
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  return NextResponse.json({ error: "Décision invalide" }, { status: 400 });
}
