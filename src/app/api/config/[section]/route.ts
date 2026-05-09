import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const SECTION_FIELD: Record<string, string> = {
  entreprise: "identity",
  modules: "modules",
  paie: "payrollRates",
  workflows: "workflows",
  notifications: "notifications",
  integrations: "integrations",
  comptable: "identity", // V2 : à éclater dans une colonne dédiée
  referentiels: "identity",
};

const DG_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function PATCH(req: Request, { params }: { params: { section: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DG_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const field = SECTION_FIELD[params.section];
  if (!field) return NextResponse.json({ error: "Section inconnue" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps JSON requis" }, { status: 400 });
  }

  const before = await prisma.tenantSettings.findUnique({
    where: { tenantId: session.tenantId },
    select: { [field]: true } as Record<string, true>,
  });

  await prisma.tenantSettings.update({
    where: { tenantId: session.tenantId },
    data: { [field]: body as object },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `config.${params.section}.update`,
      entityType: "TenantSettings",
      entityId: session.tenantId,
      metadata: { before: before?.[field as keyof typeof before] ?? null, after: body },
    },
  });

  return NextResponse.json({ ok: true });
}
