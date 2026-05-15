import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role, LeaveStatus, LeaveType } from "@prisma/client";
import { sickReportSchema, leaveTypeLabel } from "@/schemas/ouv-leave";

export const dynamic = "force-dynamic";

// POST /api/ouv/leaves/sick — Signalement maladie.
// Si > 3 jours : certificat médical obligatoire dans medicalCert (dataURL).
// Si > 3 jours : flag reportedToCnps = true (la déclaration CNPS effective
// se fera par RH/DAF côté workflow Bloc 2 — ici on marque l'obligation).
const SICK_CERT_THRESHOLD_DAYS = 3;

export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = sickReportSchema.parse(body);

    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T00:00:00.000Z`);
    if (end < start) {
      return NextResponse.json({ error: "Date fin avant date début" }, { status: 400 });
    }

    // Jours calendaires (la maladie compte tous les jours, pas seulement ouvrés)
    const days =
      Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;

    if (days > SICK_CERT_THRESHOLD_DAYS && !input.medicalCert) {
      return NextResponse.json(
        {
          error: `Certificat médical obligatoire pour un arrêt > ${SICK_CERT_THRESHOLD_DAYS} jours`,
          code: "MEDICAL_CERT_REQUIRED",
        },
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

    // Validateur = Chef Chantier (ou HR si pas de CC)
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
        type: LeaveType.SICK,
        startDate: start,
        endDate: end,
        daysCount: days,
        reason: input.symptoms ?? null,
        justificationDoc: input.medicalCert ?? null,
        status: LeaveStatus.PENDING,
        validatorUserId: validator?.id ?? null,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        daysCount: true,
        type: true,
      },
    });

    // TODO Bloc 2 RH : déclaration CNPS auto si days > 3
    // TODO fn 1.6 : notification WhatsApp CC

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
        cnpsNotificationRequired: days > SICK_CERT_THRESHOLD_DAYS,
        message:
          days > SICK_CERT_THRESHOLD_DAYS
            ? "Arrêt > 3 jours — déclaration CNPS programmée"
            : "Arrêt enregistré, prend soin de toi",
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
    console.error("[POST /api/ouv/leaves/sick]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
