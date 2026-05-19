import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { IntegrationStatus, LogLevel } from "@prisma/client";

const actionSchema = z.object({
  action: z.enum(["test", "retry-sync", "regenerate-secret", "pause", "resume"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt("canManageIntegrations");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation" }, { status: 400 });

  const integration = await prisma.integration.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  });
  if (!integration) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let result: Record<string, unknown> = { ok: true };

  switch (parsed.data.action) {
    case "test": {
      // Stub : en production, vraie requête HEAD/PING vers endpoint
      const success = Math.random() > 0.3;
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncSuccess: success,
          lastError: success ? null : "Connection timeout (stub)",
          status: success ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR,
        },
      });
      result = { ok: true, success };
      break;
    }
    case "retry-sync":
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          retryCount: { increment: 1 },
          lastSyncAt: new Date(),
        },
      });
      break;
    case "regenerate-secret": {
      const newSecret = `whsec_${Math.random().toString(36).slice(2, 20)}`;
      await prisma.integration.update({
        where: { id: integration.id },
        data: { webhookSecret: newSecret },
      });
      result = { ok: true, secret: newSecret };
      break;
    }
    case "pause":
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: IntegrationStatus.PAUSED, active: false },
      });
      break;
    case "resume":
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: IntegrationStatus.ACTIVE, active: true, retryCount: 0 },
      });
      break;
  }

  await prisma.technicalLog.create({
    data: {
      tenantId: session.tenantId!,
      level: LogLevel.INFO,
      service: integration.code,
      message: `Action IT : ${parsed.data.action}`,
      details: { integrationId: integration.id, by: session.sub },
      userId: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `it.integration.${parsed.data.action}`,
      entityType: "Integration",
      entityId: integration.id,
      metadata: { code: integration.code, result } as object,
    },
  });

  return NextResponse.json(result);
}
