import { NextResponse } from "next/server";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { getCameroonHolidays } from "@/lib/holidays-cameroon";

export const dynamic = "force-dynamic";

/**
 * Liste des jours fériés camerounais pour l'année demandée. Sert à
 * l'étape 2 du wizard pour calculer en direct le nombre de jours ouvrés
 * d'une demande et signaler quand le créneau contient un jour férié.
 */
export async function GET(req: Request) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const holidays = getCameroonHolidays(year);

  return NextResponse.json({ year, holidays });
}
