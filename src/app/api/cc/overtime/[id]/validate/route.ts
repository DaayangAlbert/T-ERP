import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "MODIFY"]),
  overtimeHours: z.number().min(0).max(16).optional(),
  overtimeType: z.enum(["evening_125", "night_150", "sunday_200"]).optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Le Chef de Chantier valide / rejette / modifie une déclaration d'heures
 * supplémentaires d'un ouvrier.
 *
 * Actions :
 *   - APPROVE  : confirme tel quel → `pointedBy` passe à l'id du CC
 *                (le pointage devient éligible à la remontée auto en paie).
 *   - REJECT   : marque le pointage contesté (contestedAt + reason),
 *                la remontée auto l'exclura.
 *   - MODIFY   : ajuste overtimeHours / overtimeType + valide
 *                (`pointedBy` = id du CC). La justification est obligatoire.
 *
 * Audit : un AuditLog est créé pour traçabilité réglementaire.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER && session.role !== Role.TENANT_ADMIN && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Chef de Chantier" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Données invalides", details: (err as Error).message }, { status: 400 });
  }

  const report = await prisma.timeReport.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: {
      id: true,
      userId: true,
      siteId: true,
      date: true,
      overtimeHours: true,
      overtimeType: true,
      pointedBy: true,
      contestedAt: true,
      resolvedAt: true,
    },
  });
  if (!report) return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });

  // Périmètre : le CC doit gérer le site du pointage
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const mySiteIds = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (report.siteId && !mySiteIds.has(report.siteId) && session.role === Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Pointage hors de votre périmètre" }, { status: 403 });
  }

  const previous = {
    overtimeHours: report.overtimeHours,
    overtimeType: report.overtimeType,
    pointedBy: report.pointedBy,
    contestedAt: report.contestedAt,
  };

  if (body.action === "APPROVE") {
    await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        pointedBy: session.sub,
        contestedAt: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    });
  } else if (body.action === "REJECT") {
    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Une justification d'au moins 5 caractères est requise pour rejeter" },
        { status: 400 },
      );
    }
    await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        contestedAt: new Date(),
        contestReason: `[CC] ${body.reason.trim()}`,
        // Met à zéro les heures sup rejetées pour ne pas être comptabilisées
        overtimeHours: 0,
        overtimeType: null,
      },
    });
  } else if (body.action === "MODIFY") {
    if (body.overtimeHours === undefined || !body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { error: "overtimeHours et reason (≥ 5 caractères) requis pour MODIFY" },
        { status: 400 },
      );
    }
    await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        overtimeHours: body.overtimeHours,
        overtimeType: body.overtimeType ?? report.overtimeType ?? "evening_125",
        pointedBy: session.sub,
        contestedAt: null,
        resolvedAt: null,
        resolvedBy: null,
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `cc.overtime.${body.action.toLowerCase()}`,
      entityType: "TimeReport",
      entityId: report.id,
      metadata: {
        targetUserId: report.userId,
        date: report.date.toISOString().slice(0, 10),
        previous,
        next: {
          overtimeHours: body.action === "REJECT" ? 0 : body.overtimeHours ?? report.overtimeHours,
          action: body.action,
          reason: body.reason ?? null,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, action: body.action });
}
