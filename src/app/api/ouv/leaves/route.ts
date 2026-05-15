import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role, LeaveStatus, LeaveType } from "@prisma/client";
import { countWorkingDays, getCameroonHolidays } from "@/lib/holidays-cameroon";
import {
  annualLeaveRequestSchema,
  mapToPrismaLeaveType,
  leaveTypeLabel,
} from "@/schemas/ouv-leave";

export const dynamic = "force-dynamic";

// GET /api/ouv/leaves — Mes demandes (pending + history).
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const all = await prisma.leaveRequest.findMany({
    where: { userId: session.sub },
    orderBy: [{ startDate: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      daysCount: true,
      reason: true,
      justificationDoc: true,
      status: true,
      n1ValidatedAt: true,
      rhValidatedAt: true,
      rejectionReason: true,
      createdAt: true,
      validator: { select: { firstName: true, lastName: true } },
    },
  });

  const serialize = (r: (typeof all)[number]) => ({
    id: r.id,
    type: r.type,
    typeLabel: leaveTypeLabel(r.type),
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    daysCount: r.daysCount,
    reason: r.reason,
    hasJustificationDoc: Boolean(r.justificationDoc),
    status: r.status,
    n1ValidatedAt: r.n1ValidatedAt?.toISOString() ?? null,
    rhValidatedAt: r.rhValidatedAt?.toISOString() ?? null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    validatorName: r.validator
      ? `${r.validator.firstName} ${r.validator.lastName}`
      : null,
  });

  return NextResponse.json({
    pending: all.filter((r) => r.status === LeaveStatus.PENDING).map(serialize),
    history: all.filter((r) => r.status !== LeaveStatus.PENDING).map(serialize),
  });
}

// POST /api/ouv/leaves — Demande de congé annuel (PAID_LEAVE par défaut),
// événement familial, sans solde, exceptionnel. SICK passe par /sick.
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = annualLeaveRequestSchema.parse(body);
    if (input.type === "sick") {
      return NextResponse.json(
        { error: "Utilise POST /api/ouv/leaves/sick pour signaler une maladie" },
        { status: 400 }
      );
    }

    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T00:00:00.000Z`);
    if (end < start) {
      return NextResponse.json({ error: "Date fin avant date début" }, { status: 400 });
    }

    const prismaType = mapToPrismaLeaveType(input.type);
    const year = start.getUTCFullYear();
    const holidays = getCameroonHolidays(year);
    const daysCount = countWorkingDays(start, end, holidays);
    if (daysCount === 0) {
      return NextResponse.json(
        { error: "Aucun jour ouvré sur la période (week-end ou férié uniquement)" },
        { status: 400 }
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        firstName: true,
        lastName: true,
        tenantId: true,
        assignedSiteIds: true,
      },
    });
    if (!me || !me.tenantId) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Vérif solde si congé payé
    if (prismaType === LeaveType.PAID_LEAVE) {
      const balance = await prisma.leaveBalance.findFirst({
        where: { userId: session.sub, year },
        select: { paidLeaveRemaining: true },
      });
      const remaining = balance?.paidLeaveRemaining ?? 30;
      if (daysCount > remaining) {
        return NextResponse.json(
          {
            error: `Solde insuffisant : ${remaining} j disponibles, demande de ${daysCount} j`,
            code: "INSUFFICIENT_BALANCE",
            remaining,
            requested: daysCount,
          },
          { status: 400 }
        );
      }
    }

    // Validateur = Chef Chantier du chantier principal
    const primarySiteId = me.assignedSiteIds[0];
    let validator: { id: string } | null = null;
    if (primarySiteId) {
      validator = await prisma.user.findFirst({
        where: { role: Role.SITE_MANAGER, assignedSiteIds: { has: primarySiteId } },
        select: { id: true },
      });
    }
    if (!validator) {
      validator = await prisma.user.findFirst({
        where: { tenantId: me.tenantId, role: Role.HR },
        select: { id: true },
      });
    }

    const created = await prisma.leaveRequest.create({
      data: {
        tenantId: me.tenantId,
        userId: session.sub,
        employeeKey: session.sub,
        employeeName: `${me.firstName} ${me.lastName}`,
        type: prismaType as LeaveType,
        startDate: start,
        endDate: end,
        daysCount,
        reason: input.reason ?? null,
        status: LeaveStatus.PENDING,
        validatorUserId: validator?.id ?? null,
      },
      select: { id: true, daysCount: true, startDate: true, endDate: true, type: true },
    });

    // TODO fn 1.6 : notification WhatsApp au validateur

    return NextResponse.json(
      {
        request: {
          id: created.id,
          type: created.type,
          typeLabel: leaveTypeLabel(created.type),
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          daysCount: created.daysCount,
          status: LeaveStatus.PENDING,
        },
        daysCount,
        message: `Demande envoyée — ${daysCount} jour${daysCount > 1 ? "s" : ""} ouvré${daysCount > 1 ? "s" : ""}, en attente de validation`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/leaves]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
