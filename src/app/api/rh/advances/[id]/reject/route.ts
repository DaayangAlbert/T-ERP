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
 * Refuse une demande d'avance avec un motif obligatoire. Notifie
 * l'ouvrier demandeur du refus + motif.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (!ALLOWED_ROLES.has(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) {
    return NextResponse.json(
      { error: "Motif de refus requis (3 caractères minimum)" },
      { status: 400 },
    );
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
      status: SalaryAdvanceStatus.REJECTED,
      validatedAt: new Date(),
      validatedById: session.sub,
      rejectionReason: reason,
    },
    select: { id: true, status: true },
  });

  await prisma.notification.create({
    data: {
      userId: advance.userId,
      type: "advance_request_rejected",
      title: "Avance refusée",
      body: `Votre demande de ${Number(advance.amountXAF).toLocaleString("fr-FR")} FCFA est refusée. Motif : ${reason.slice(0, 100)}`,
      link: "/ouv/paie",
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
