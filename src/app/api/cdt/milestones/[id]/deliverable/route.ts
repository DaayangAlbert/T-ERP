import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.TECH_DIRECTOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

interface Deliverable {
  key: string;
  label: string;
  done: boolean;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé CDT/DT" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CDT);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { key?: string; done?: boolean };
  if (!body.key) return NextResponse.json({ error: "key requis" }, { status: 400 });

  const m = await prisma.cdtMilestone.findUnique({ where: { id: params.id } });
  if (!m) return NextResponse.json({ error: "Jalon introuvable" }, { status: 404 });

  const deliverables = (m.deliverables as unknown as Deliverable[]).map((d) =>
    d.key === body.key ? { ...d, done: body.done ?? !d.done } : d
  );
  const doneCount = deliverables.filter((d) => d.done).length;
  const preparation = deliverables.length === 0 ? 0 : Math.round((doneCount / deliverables.length) * 100);

  await prisma.cdtMilestone.update({
    where: { id: m.id },
    data: {
      deliverables: deliverables as object,
      preparation,
      status: preparation === 100 && m.status !== "REACHED" ? "READY_FOR_RECEPTION" : m.status,
    },
  });

  return NextResponse.json({ ok: true, preparation });
}
