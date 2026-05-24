import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, EquipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const TYPE_LABEL: Record<string, string> = {
  TP_HEAVY: "Engin TP",
  TRUCK: "Camion",
  CONCRETE_MIXER: "Bétonnière",
  SERVICE_VEHICLE: "Véhicule",
  OTHER: "Autre",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = Date.now();
  const engins = await prisma.equipment.findMany({
    where: { tenantId: { in: scopeIds } },
    select: {
      id: true, registration: true, designation: true, type: true, status: true,
      isRented: true, currentValue: true,
      assignments: {
        orderBy: { startDate: "desc" },
        take: 10,
        select: { active: true, endDate: true, startDate: true, site: { select: { code: true, name: true } } },
      },
    },
    orderBy: { designation: "asc" },
  });

  let valeurParc = 0n;
  let auTravail = 0;
  let inactifs = 0;
  let enMaintenance = 0;
  let loues = 0;

  const items = engins.map((e) => {
    valeurParc += e.currentValue;
    if (e.isRented) loues++;
    const active = e.assignments.find((a) => a.active && a.site);
    let statut: string;
    let tone: "ok" | "warn" | "bad" | "neutral";
    let chantier: string | null = null;
    let inactifJours: number | null = null;

    if (e.status === EquipmentStatus.MAINTENANCE) { statut = "En maintenance"; tone = "warn"; enMaintenance++; }
    else if (e.status === EquipmentStatus.BREAKDOWN) { statut = "En panne"; tone = "bad"; enMaintenance++; }
    else if (e.status === EquipmentStatus.RETIRED) { statut = "Réformé"; tone = "neutral"; }
    else if (e.status === EquipmentStatus.TRANSFER) { statut = "En transfert"; tone = "warn"; }
    else if (active) { statut = "Au travail"; tone = "ok"; chantier = `${active.site!.code} · ${active.site!.name}`; auTravail++; }
    else {
      // IN_SERVICE sans affectation = inactif. Durée depuis la dernière fin d'affectation.
      statut = "Inactif";
      tone = "bad";
      inactifs++;
      const lastEnd = e.assignments
        .map((a) => a.endDate?.getTime() ?? null)
        .filter((x): x is number => x !== null)
        .sort((a, b) => b - a)[0];
      if (lastEnd) inactifJours = Math.floor((now - lastEnd) / 86_400_000);
    }

    return {
      id: e.id,
      immatriculation: e.registration,
      nom: e.designation,
      type: TYPE_LABEL[e.type] ?? e.type,
      statut,
      tone,
      chantier,
      inactifJours,
      isRented: e.isRented,
      valeur: e.currentValue.toString(),
    };
  });

  // Liste des chantiers ayant au moins un engin affecté (pour le filtre).
  const chantiers = Array.from(new Set(items.filter((i) => i.chantier).map((i) => i.chantier as string))).sort();

  return NextResponse.json({
    resume: {
      total: items.length,
      auTravail,
      inactifs,
      enMaintenance,
      loues,
      valeurParc: valeurParc.toString(),
    },
    chantiers,
    items,
  });
}
