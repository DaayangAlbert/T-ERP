import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";
import { CptEntryStatus, DailyReportStatus, InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const site = await prisma.site.findFirst({
    where: { id: params.siteId },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      budget: true,
      progress: true,
      margin: true,
      status: true,
      plannedEndDate: true,
      lat: true,
      lng: true,
    },
  });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [todayReport, openAlerts, monthInvoices, pendingValidationsCount, recentEntries] = await Promise.all([
    prisma.siteDailyReport.findFirst({
      where: { siteId: site.id, reportDate: { gte: start } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.siteAlert.findMany({
      where: { siteId: site.id, resolved: false },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.supplierInvoice.findMany({
      where: { siteId: site.id, invoiceDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      select: { amountTtc: true, status: true },
    }),
    prisma.entry.count({
      where: { siteId: site.id, status: CptEntryStatus.DRAFT },
    }),
    prisma.entry.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, reference: true, description: true, entryDate: true, journalCode: true, createdAt: true },
    }),
  ]);

  // KPIs financiers — calculs simples (à étoffer en phase 2)
  const monthInvoiced = monthInvoices.reduce((s, i) => s + Number(i.amountTtc), 0);
  const monthPaid = monthInvoices
    .filter((i) => i.status === InvoiceStatus.PAID)
    .reduce((s, i) => s + Number(i.amountTtc), 0);
  const financialProgress = Number(site.budget) > 0
    ? Math.round((monthInvoiced / Number(site.budget)) * 100)
    : 0;

  // Timeline activité du jour (synthétique)
  const todayActivity: Array<{ kind: string; label: string; time: string }> = [];
  if (todayReport) {
    todayActivity.push({
      kind: "report",
      label: `Rapport journalier soumis (${todayReport.workforcePresent}/${todayReport.workforcePlanned} présents)`,
      time: todayReport.createdAt.toISOString(),
    });
  }
  for (const e of recentEntries.slice(0, 3)) {
    todayActivity.push({
      kind: "entry",
      label: `${e.journalCode} · ${e.reference} — ${e.description}`,
      time: e.createdAt?.toISOString() ?? e.entryDate.toISOString(),
    });
  }

  return NextResponse.json({
    site: {
      id: site.id,
      code: site.code,
      name: site.name,
      client: site.client,
      budget: Number(site.budget),
      physicalProgress: site.progress,
      financialProgress,
      margin: site.margin,
      plannedEndDate: site.plannedEndDate.toISOString(),
      lat: site.lat,
      lng: site.lng,
    },
    kpis: {
      workforcePresent: todayReport?.workforcePresent ?? 0,
      workforcePlanned: todayReport?.workforcePlanned ?? 0,
      productionValue: todayReport ? Number(todayReport.productionValue) : 0,
      pendingValidations: pendingValidationsCount,
      monthInvoiced,
      monthPaid,
      todayReportStatus: todayReport?.status ?? null,
    },
    alerts: openAlerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      priority: a.priority,
      type: a.type,
      message: a.message,
      actionUrl: a.actionUrl,
      actionLabel: a.actionLabel,
      createdAt: a.createdAt.toISOString(),
    })),
    todayActivity: todayActivity.sort((a, b) => (a.time > b.time ? -1 : 1)),
  });
}
