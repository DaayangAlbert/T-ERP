import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updatePreferencesSchema } from "@/schemas/profile";

export const dynamic = "force-dynamic";

const DEFAULT_DASHBOARD_WIDGETS = ["revenue", "margin", "treasury", "validations", "alerts", "objectives"];

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let prefs = await prisma.userPreferences.findUnique({ where: { userId: session.sub } });
  if (!prefs) {
    prefs = await prisma.userPreferences.create({
      data: {
        userId: session.sub,
        dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS as object,
        alertThresholds: { treasuryMin: "100000000", marginMin: 12 } as object,
        notificationChannels: {} as object,
      },
    });
  }
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updatePreferencesSchema.parse(await req.json());
    await prisma.userPreferences.upsert({
      where: { userId: session.sub },
      update: {
        ...(data.dashboardWidgets !== undefined && { dashboardWidgets: data.dashboardWidgets as object }),
        ...(data.alertThresholds !== undefined && { alertThresholds: data.alertThresholds as object }),
        ...(data.notificationChannels !== undefined && { notificationChannels: data.notificationChannels as object }),
        ...(data.dailyReportEnabled !== undefined && { dailyReportEnabled: data.dailyReportEnabled }),
        ...(data.dailyReportTime !== undefined && { dailyReportTime: data.dailyReportTime }),
        ...(data.numberFormat !== undefined && { numberFormat: data.numberFormat }),
      },
      create: {
        userId: session.sub,
        dashboardWidgets: (data.dashboardWidgets ?? DEFAULT_DASHBOARD_WIDGETS) as object,
        alertThresholds: (data.alertThresholds ?? {}) as object,
        notificationChannels: (data.notificationChannels ?? {}) as object,
        dailyReportEnabled: data.dailyReportEnabled ?? false,
        dailyReportTime: data.dailyReportTime,
        numberFormat: data.numberFormat ?? "M_FCFA",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
