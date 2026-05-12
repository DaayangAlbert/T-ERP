import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.ARCHIVIST, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

function csvEscape(s: string): string {
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé GED / DG / DAF" }, { status: 403 });
  }

  const items = await prisma.documentClassification.findMany({
    where: { tenantId: session.tenantId, active: true },
    include: { workflow: { select: { code: true } } },
    orderBy: [{ category: "asc" }, { prefix: "asc" }],
  });

  const lines = [
    ["Préfixe", "Code", "Libellé", "Catégorie", "DUA", "Années DUA", "Déclencheur", "Confidentialité", "Workflow"]
      .map(csvEscape)
      .join(";"),
    ...items.map((c) =>
      [
        c.prefix,
        c.code,
        c.name,
        c.category,
        c.dua,
        c.duaYears?.toString() ?? "",
        c.duaTrigger,
        c.confidentiality,
        c.workflow?.code ?? "",
      ]
        .map(csvEscape)
        .join(";"),
    ),
  ];

  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomenclature-ged-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
