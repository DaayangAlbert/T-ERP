import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const integration = await prisma.globalIntegration.findUnique({
    where: { id: params.id },
  });
  if (!integration)
    return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });

  // Stub health check — en prod : appel HTTP réel, calcul latency
  const latencyMs = 80 + Math.round(Math.random() * 250);
  const isHealthy = Math.random() > 0.05;
  const newStatus = isHealthy ? "ACTIVE" : "DEGRADED";

  await prisma.globalIntegration.update({
    where: { id: params.id },
    data: {
      status: newStatus,
      lastHealthCheckAt: new Date(),
      metricsLast24h: { latencyMs, healthy: isHealthy },
    },
  });

  await logAdminAction({
    session,
    action: "INTEGRATION_CONFIGURED",
    targetType: "GlobalIntegration",
    targetId: integration.id,
    targetDescription: `Health check ${integration.code} → ${newStatus} (${latencyMs}ms)`,
  });

  return NextResponse.json({ ok: true, status: newStatus, latencyMs });
}
