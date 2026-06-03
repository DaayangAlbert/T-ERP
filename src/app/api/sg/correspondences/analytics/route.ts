import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgCorrespondence } from "@/lib/rbac/sg-guard";
import { CorrespondenceDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_GROUPS = [
  { id: "MINTP", label: "MINTP", patterns: ["MINTP", "Travaux publics"] },
  { id: "MINEE", label: "MINEE", patterns: ["MINEE", "Eau", "Énergie"] },
  { id: "MUNICIPALITIES", label: "Communes", patterns: ["Commune", "Mairie"] },
  { id: "TAX_SOCIAL", label: "DGI + CNPS", patterns: ["DGI", "CNPS", "fiscal", "Impôts"] },
  { id: "COURTS", label: "Tribunaux", patterns: ["Tribunal", "TPI", "TC ", "Justice", "Cour"] },
  { id: "PRIVATE_CLIENTS", label: "Clients privés", patterns: [] },
];

export async function GET() {
  const guard = await guardSgCorrespondence();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const items = await prisma.officialCorrespondence.findMany({
    where: { tenantId, date: { gte: monthStart } },
    select: {
      direction: true,
      correspondentName: true,
      correspondentEntity: true,
    },
  });

  const counts = ADMIN_GROUPS.map((g) => ({ id: g.id, label: g.label, count: 0 }));
  for (const c of items) {
    const text = `${c.correspondentName ?? ""} ${c.correspondentEntity ?? ""}`;
    let assigned = false;
    for (let i = 0; i < ADMIN_GROUPS.length - 1; i++) {
      const g = ADMIN_GROUPS[i];
      if (g.patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()))) {
        counts[i].count++;
        assigned = true;
        break;
      }
    }
    if (!assigned) counts[counts.length - 1].count++;
  }

  return NextResponse.json({
    month: monthStart.toISOString(),
    totalThisMonth: items.length,
    byAdmin: counts,
    breakdown: {
      incoming: items.filter((c) => c.direction === CorrespondenceDirection.INCOMING).length,
      outgoing: items.filter((c) => c.direction === CorrespondenceDirection.OUTGOING).length,
    },
  });
}
