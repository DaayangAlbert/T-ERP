import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PlatformIncidentSeverity,
  PlatformIncidentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");

  const where: Prisma.PlatformIncidentWhereInput = {};
  if (status && status !== "all") where.status = status as PlatformIncidentStatus;
  if (severity && severity !== "all")
    where.severity = severity as PlatformIncidentSeverity;

  const incidents = await prisma.platformIncident.findMany({
    where,
    orderBy: [{ status: "asc" }, { severity: "asc" }, { detectedAt: "desc" }],
    take: 100,
  });

  const counts = await prisma.platformIncident.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c._count.id;

  return NextResponse.json({
    stats: {
      open: byStatus.OPEN ?? 0,
      investigating: byStatus.INVESTIGATING ?? 0,
      monitoring: byStatus.MONITORING ?? 0,
      resolved: byStatus.RESOLVED ?? 0,
      closed: byStatus.CLOSED ?? 0,
    },
    incidents: incidents.map((i) => ({
      ...i,
      detectedAt: i.detectedAt.toISOString(),
      acknowledgedAt: i.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  severity: z.nativeEnum(PlatformIncidentSeverity),
  affectedTenants: z.array(z.string()).default([]),
  module: z.string().optional(),
  usersImpacted: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  const d = parsed.data;

  const year = new Date().getFullYear();
  const count = await prisma.platformIncident.count();
  const reference = `INC-${year}-${String(count + 1).padStart(4, "0")}`;

  const incident = await prisma.platformIncident.create({
    data: {
      reference,
      title: d.title,
      description: d.description,
      severity: d.severity,
      status: PlatformIncidentStatus.OPEN,
      affectedTenants: d.affectedTenants,
      module: d.module,
      usersImpacted: d.usersImpacted,
      assignedTo: session.sub,
    },
  });

  await logAdminAction({
    session,
    action: "CONFIG_MODIFIED",
    targetType: "PlatformIncident",
    targetId: incident.id,
    targetDescription: `Création ${reference} · ${d.severity}`,
    afterState: { title: d.title, severity: d.severity },
  });

  return NextResponse.json({ ok: true, incident }, { status: 201 });
}
