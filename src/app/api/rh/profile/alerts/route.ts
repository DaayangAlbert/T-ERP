import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.TENANT_ADMIN];

interface AlertConfig {
  medicalVisitDaysBefore: number;     // alerte avant visite médicale
  trainingRecycleDaysBefore: number;  // alerte avant recyclage CACES
  cddEndingDaysBefore: number;        // alerte avant fin CDD
  leaveAccumulationThreshold: number; // alerte au-delà de X demandes en attente
  payrollInputDeadlineDays: number;   // rappel deadline saisie paie
  channels: string[];                 // IN_APP / EMAIL / SMS / PUSH
}

const DEFAULT: AlertConfig = {
  medicalVisitDaysBefore: 30,
  trainingRecycleDaysBefore: 60,
  cddEndingDaysBefore: 30,
  leaveAccumulationThreshold: 10,
  payrollInputDeadlineDays: 3,
  channels: ["IN_APP", "EMAIL"],
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }
  const settings = await prisma.rhSettings.findUnique({ where: { userId: session.sub } });
  const config = ((settings?.alertsConfig as AlertConfig | null) ?? {}) as AlertConfig;
  return NextResponse.json({ ...DEFAULT, ...config });
}

export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<AlertConfig>;
  const settings = await prisma.rhSettings.findUnique({ where: { userId: session.sub } });
  const merged: AlertConfig = { ...DEFAULT, ...((settings?.alertsConfig as AlertConfig | null) ?? {}), ...body };

  await prisma.rhSettings.upsert({
    where: { userId: session.sub },
    update: { alertsConfig: merged as object },
    create: { userId: session.sub, alertsConfig: merged as object },
  });
  return NextResponse.json({ ok: true, ...merged });
}
