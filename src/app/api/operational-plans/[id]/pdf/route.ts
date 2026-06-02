import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { guardOperationalPlanRead } from "@/lib/rbac/operational-plan-guard";
import { uploadUrlToDataUri } from "@/lib/upload-paths";
import { OperationalPlanPDF, type OperationalPlanPdfData } from "@/components/operational/OperationalPlanPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  WORKS_DIRECTOR: "Directeur des travaux",
  WORKS_MANAGER: "Conducteur de travaux",
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const plan = await prisma.operationalPlan.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: { plannedStart: "asc" } },
      author: { select: { firstName: true, lastName: true, role: true } },
      site: { select: { code: true, name: true, client: true, region: true, moaName: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanRead(plan.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId! },
    select: {
      name: true,
      contactAddress: true,
      contactPhone: true,
      contactEmail: true,
      taxId: true,
      logoUrl: true,
    },
  });

  const logoDataUri = await uploadUrlToDataUri(tenant?.logoUrl);

  const data: OperationalPlanPdfData = {
    id: plan.id,
    horizon: plan.horizon,
    periodStart: plan.periodStart.toISOString(),
    periodEnd: plan.periodEnd.toISOString(),
    title: plan.title,
    objective: plan.objective,
    author: `${plan.author.firstName} ${plan.author.lastName}`.trim(),
    authorRole: ROLE_LABEL[plan.author.role] ?? plan.author.role,
    generatedAt: new Date().toISOString(),
    site: plan.site,
    tasks: plan.tasks.map((t) => ({
      name: t.name,
      plannedStart: t.plannedStart.toISOString(),
      plannedEnd: t.plannedEnd.toISOString(),
      progressPercent: t.progressPercent,
      assignedTeamId: t.assignedTeamId,
      notes: t.notes,
    })),
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
    const element = createElement(OperationalPlanPDF, { data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const horizonLabel = plan.horizon === "MONTHLY" ? "mensuel" : "hebdo";
    const filename = `planning_${horizonLabel}_${plan.site.code}_${plan.periodStart.toISOString().slice(0, 10)}.pdf`;
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
    console.error("[GET /api/operational-plans/:id/pdf]", (err as Error).message);
    return NextResponse.json(
      { error: "Génération du PDF échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
