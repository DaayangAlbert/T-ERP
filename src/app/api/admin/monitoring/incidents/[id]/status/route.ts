import { NextResponse } from "next/server";
import { z } from "zod";
import { PlatformIncidentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.nativeEnum(PlatformIncidentStatus),
  resolution: z.string().max(2000).optional(),
  postmortemUrl: z.string().url().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const inc = await prisma.platformIncident.findUnique({
    where: { id: params.id },
  });
  if (!inc)
    return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  const d = parsed.data;

  const updates: Record<string, unknown> = { status: d.status };
  if (d.status === "INVESTIGATING" && !inc.acknowledgedAt)
    updates.acknowledgedAt = new Date();
  if (d.status === "RESOLVED" || d.status === "CLOSED") {
    updates.resolvedAt = inc.resolvedAt ?? new Date();
    if (d.resolution) updates.resolution = d.resolution;
    if (d.postmortemUrl) updates.postmortemUrl = d.postmortemUrl;
  }

  const updated = await prisma.platformIncident.update({
    where: { id: params.id },
    data: updates,
  });

  await logAdminAction({
    session,
    action: "CONFIG_MODIFIED",
    targetType: "PlatformIncident",
    targetId: inc.id,
    targetDescription: `${inc.reference} · ${inc.status} → ${d.status}`,
    beforeState: { status: inc.status },
    afterState: { status: d.status },
  });

  return NextResponse.json({ ok: true, incident: updated });
}
