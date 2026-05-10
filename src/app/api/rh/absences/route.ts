import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AbsenceReason } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const REASON_LABEL: Record<AbsenceReason, string> = {
  SICK: "Maladie",
  FAMILY: "Familial",
  UNJUSTIFIED: "Non justifiée",
  LATE: "Retard",
  STRIKE: "Grève",
  OTHER: "Autre",
};

async function ensureSeedAbsences(tenantId: string) {
  const existing = await prisma.absence.count({ where: { tenantId } });
  if (existing >= 10) return;
  const today = new Date();
  const pool = getSyntheticPersonnel(487).slice(8, 18);
  const reasons: AbsenceReason[] = ["SICK", "UNJUSTIFIED", "FAMILY", "LATE", "SICK", "STRIKE", "OTHER", "UNJUSTIFIED", "SICK", "FAMILY"];
  for (const [i, p] of pool.entries()) {
    const date = new Date(today.getTime() - (i + 1) * 86_400_000);
    await prisma.absence.create({
      data: {
        tenantId,
        employeeKey: p.id,
        employeeName: `${p.firstName} ${p.lastName}`,
        date,
        reason: reasons[i],
        justified: reasons[i] === "SICK" || reasons[i] === "FAMILY",
        reportedBy: "Chef chantier " + p.site,
        notes: i === 1 ? "Absence non justifiée — courrier envoyé" : null,
      },
    });
  }
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  await ensureSeedAbsences(session.tenantId);

  const url = new URL(req.url);
  const dateFilter = url.searchParams.get("date");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (dateFilter) {
    const d = new Date(dateFilter);
    where.date = {
      gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    };
  }

  const items = await prisma.absence.findMany({
    where,
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      employeeKey: a.employeeKey,
      employeeName: a.employeeName,
      date: a.date.toISOString(),
      reason: a.reason,
      reasonLabel: REASON_LABEL[a.reason],
      justified: a.justified,
      reportedBy: a.reportedBy,
      notes: a.notes,
    })),
  });
}
