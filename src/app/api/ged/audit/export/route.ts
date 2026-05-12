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

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");

  const events = await prisma.gedAuditEvent.findMany({
    where: {
      tenantId: session.tenantId,
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      actor: { select: { firstName: true, lastName: true, role: true } },
      document: { select: { name: true, internalReference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const lines = [
    ["Date", "Heure", "Utilisateur", "Rôle", "Action", "Document", "Référence", "IP", "Anomalie"].map(csvEscape).join(";"),
    ...events.map((e) =>
      [
        e.createdAt.toISOString().slice(0, 10),
        e.createdAt.toISOString().slice(11, 19),
        e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : "Système",
        e.actor?.role ?? "",
        e.action,
        e.document?.name ?? "",
        e.document?.internalReference ?? "",
        e.ipAddress ?? "",
        e.anomaly ? "OUI" : "non",
      ]
        .map(csvEscape)
        .join(";"),
    ),
  ];
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-audit-ged-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
