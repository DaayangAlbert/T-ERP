import { NextResponse } from "next/server";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;

  return NextResponse.json({
    items: [
      {
        id: "reglement-interieur-2026",
        title: "Règlement intérieur BatimCAM",
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
