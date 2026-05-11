import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

const DEFAULT_DT_ALERTS = {
  costDeviationThreshold: 10,
  delayThresholdDays: 14,
  marginThresholdPercent: 15,
  crewLoadThresholdPercent: 110,
  channel: "in-app" as "email" | "push" | "in-app",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const [prefs, signaturePower, managedSites] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId: session.sub } }),
    prisma.userSignaturePower.findUnique({ where: { userId: session.sub } }),
    prisma.site.findMany({
      where: { managerId: session.sub, status: { not: "ARCHIVED" } },
      select: { id: true, code: true, name: true },
      take: 5,
    }),
  ]);

  const dtAlerts = (prefs?.dtAlerts as Record<string, unknown> | null) ?? DEFAULT_DT_ALERTS;

  return NextResponse.json({
    alertsConfig: { ...DEFAULT_DT_ALERTS, ...dtAlerts },
    signaturePower: signaturePower
      ? {
          soloLimit: Number(signaturePower.soloLimit),
          coSignLimit: Number(signaturePower.coSignLimit),
          coSigners: signaturePower.coSigners,
        }
      : {
          // Valeurs par défaut conformes au prompt 2.3
          soloLimit: 50_000_000,
          coSignLimit: 200_000_000,
          coSigners: ["DG", "Président CA"],
        },
    personInCharge: managedSites,
  });
}

export async function PATCH(req: NextRequest) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const body = await req.json();
  const merged = { ...DEFAULT_DT_ALERTS, ...(body.alertsConfig ?? {}) };

  await prisma.userPreferences.upsert({
    where: { userId: session.sub },
    update: { dtAlerts: merged as object },
    create: { userId: session.sub, dtAlerts: merged as object },
  });

  return NextResponse.json({ ok: true, alertsConfig: merged });
}
