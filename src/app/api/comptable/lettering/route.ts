import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const schema = z.object({
  lineIds: z.array(z.string()).min(2),
  code: z.string().min(1).max(10).optional(),
});

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const lines = await prisma.entryLine.findMany({
    where: { id: { in: parsed.data.lineIds } },
    include: { entry: true },
  });

  // Vérifier appartenance au tenant + équilibre
  for (const l of lines) {
    if (l.entry.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Ligne hors tenant" }, { status: 403 });
    }
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
  if (totalDebit !== totalCredit) {
    return NextResponse.json({ error: "Lettrage impossible : débit ≠ crédit" }, { status: 400 });
  }

  const code = parsed.data.code ?? `A${String(Date.now()).slice(-4)}`;
  await prisma.entryLine.updateMany({
    where: { id: { in: parsed.data.lineIds } },
    data: { lettering: code },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "lettering.create",
      entityType: "EntryLine",
      entityId: code,
      metadata: { count: lines.length, code, total: totalDebit },
    },
  });

  return NextResponse.json({ code, count: lines.length });
}
