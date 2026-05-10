import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getActiveOffers } from "@/lib/rh-recruitment";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }
  return NextResponse.json({ items: getActiveOffers() });
}
