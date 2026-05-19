import { NextResponse } from "next/server";
import { Role, SalaryAdvanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: ReadonlySet<Role> = new Set<Role>([
  Role.HR,
  Role.DAF,
  Role.DG,
  Role.TENANT_ADMIN,
]);

/**
 * Approuve une demande d'avance sur salaire. Notifie l'ouvrier
 * demandeur via Notification (link → /ouv/paie pour voir le statut).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (!ALLOWED_ROLES.has(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);

  const advance = await prisma.salaryAdvanceRequest.findFirst({
    where: { id: params.id, tenantId: { in: tenantIds } },
    select: { id: true, status: true, userId: true, amountXAF: true },
  });
  if (!advance) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (advance.status !== SalaryAdvanceStatus.PENDING) {
    return NextResponse.json(
      { error: `Demande déjà ${advance.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  const updated = await prisma.salaryAdvanceRequest.update({
    where: { id: params.id },
    data: {
      status: SalaryAdvanceStatus.APPROVED,
      validatedAt: new Date(),
      validatedById: session.sub,
    },
    select: { id: true, status: true, amountXAF: true },
  });

  // Notifie l'ouvrier de l'approbation
  await prisma.notification.create({
    data: {
      userId: advance.userId,
      type: "advance_request_approved",
      title: "Avance approuvée",
      body: `Votre demande de ${Number(advance.amountXAF).toLocaleString("fr-FR")} FCFA est validée. Virement sous 48h.`,
      link: "/ouv/paie",
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
