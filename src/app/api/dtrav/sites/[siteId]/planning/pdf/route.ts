import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { guardDtravSite } from "@/lib/rbac/dtrav-guard";
import { uploadUrlToDataUri } from "@/lib/upload-paths";
import { SitePlanningPDF, type SitePlanningPdfData } from "@/components/dtrav/planning/SitePlanningPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const [site, planning, tenant, author] = await Promise.all([
    prisma.site.findUnique({
      where: { id: params.siteId },
      select: {
        code: true,
        name: true,
        client: true,
        region: true,
        startDate: true,
        plannedEndDate: true,
        moaName: true,
      },
    }),
    prisma.sitePlanning.findUnique({
      where: { siteId: params.siteId },
      include: {
        phases: {
          orderBy: { orderIndex: "asc" },
          include: { tasks: { orderBy: { plannedStart: "asc" } } },
        },
        milestones: { orderBy: { contractDueDate: "asc" } },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: session.tenantId! },
      select: {
        name: true,
        contactAddress: true,
        contactPhone: true,
        contactEmail: true,
        taxId: true,
        logoUrl: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true },
    }),
  ]);

  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const logoDataUri = await uploadUrlToDataUri(tenant?.logoUrl);

  const data: SitePlanningPdfData = {
    site: {
      code: site.code,
      name: site.name,
      client: site.client,
      region: site.region,
      startDate: site.startDate.toISOString(),
      plannedEndDate: site.plannedEndDate.toISOString(),
      moaName: site.moaName,
    },
    totalDurationDays:
      planning?.totalDurationDays ??
      Math.max(1, Math.round((site.plannedEndDate.getTime() - site.startDate.getTime()) / 86_400_000)),
    phases: (planning?.phases ?? []).map((ph) => ({
      name: ph.name,
      plannedStart: ph.plannedStart.toISOString(),
      plannedEnd: ph.plannedEnd.toISOString(),
      progressPercent: ph.progressPercent,
      status: ph.status,
      tasks: ph.tasks.map((t) => ({
        name: t.name,
        plannedStart: t.plannedStart.toISOString(),
        plannedEnd: t.plannedEnd.toISOString(),
        progressPercent: t.progressPercent,
      })),
    })),
    milestones: (planning?.milestones ?? []).map((m) => ({
      code: m.code,
      description: m.description,
      contractDueDate: m.contractDueDate.toISOString(),
      status: m.status,
    })),
    generatedAt: new Date().toISOString(),
    authorName: author ? `${author.firstName} ${author.lastName}`.trim() : null,
    tenant: {
      name: tenant?.name ?? "—",
      contactAddress: tenant?.contactAddress ?? null,
      contactPhone: tenant?.contactPhone ?? null,
      contactEmail: tenant?.contactEmail ?? null,
      taxId: tenant?.taxId ?? null,
      logoUrl: logoDataUri,
    },
  };

  try {
    const element = createElement(SitePlanningPDF, { data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `planning_${site.code}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/dtrav/sites/:siteId/planning/pdf]", (err as Error).message);
    return NextResponse.json(
      { error: "Génération du PDF échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
