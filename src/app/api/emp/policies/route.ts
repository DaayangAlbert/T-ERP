import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Récupère le nom du tenant pour générer un titre cohérent avec
  // l'entreprise courante (multi-tenant SaaS).
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId! },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? "l'entreprise";

  return NextResponse.json({
    items: [
      {
        id: "reglement-interieur-2026",
        title: `Règlement intérieur ${tenantName}`,
        version: "2026.1",
        publishedAt: "2026-01-02",
        category: "INTERNAL_RULES",
        acknowledgmentRequired: true,
      },
      {
        id: "politique-heures-sup",
        title: "Politique heures supplémentaires",
        version: "2025.3",
        publishedAt: "2025-09-15",
        category: "HR_POLICY",
        acknowledgmentRequired: false,
      },
      {
        id: "convention-collective-btp-cm",
        title: "Convention collective BTP Cameroun",
        version: "2024",
        publishedAt: "2024-04-01",
        category: "COLLECTIVE_AGREEMENT",
        acknowledgmentRequired: false,
      },
    ],
  });
}
