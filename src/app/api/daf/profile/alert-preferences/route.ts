import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

interface AlertConfig {
  treasuryThreshold?: number;     // alerte trésorerie sous seuil (FCFA)
  dsoIncreaseAlert?: boolean;     // alerte DSO en hausse
  poAlertThreshold?: number;      // BC > X M = alerte immédiate (FCFA)
  taxDeadlineDaysBefore?: number; // rappel J-X
  channels?: string[];            // IN_APP / EMAIL / SMS / PUSH
}

const DEFAULT: Required<AlertConfig> = {
  treasuryThreshold: 50_000_000,
  dsoIncreaseAlert: true,
  poAlertThreshold: 20_000_000,
  taxDeadlineDaysBefore: 3,
  channels: ["IN_APP", "EMAIL"],
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const settings = await prisma.dafSettings.findUnique({ where: { userId: session.sub } });
  const config = ((settings?.alertsConfig as AlertConfig | null) ?? {}) as AlertConfig;
  return NextResponse.json({ ...DEFAULT, ...config });
}

export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as AlertConfig;
  const settings = await prisma.dafSettings.findUnique({ where: { userId: session.sub } });
  const merged: AlertConfig = { ...DEFAULT, ...((settings?.alertsConfig as AlertConfig | null) ?? {}), ...body };

  await prisma.dafSettings.upsert({
    where: { userId: session.sub },
    update: { alertsConfig: merged as object },
    create: { userId: session.sub, alertsConfig: merged as object },
  });

  return NextResponse.json({ ok: true, ...merged });
}
