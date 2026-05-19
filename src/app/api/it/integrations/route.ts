import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { IntegrationCategory, IntegrationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  category: z.nativeEnum(IntegrationCategory),
  endpoint: z.string().optional(),
  frequency: z.string().optional(),
});

export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const items = await prisma.integration.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      category: i.category,
      endpoint: i.endpoint,
      status: i.status,
      lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
      lastSyncSuccess: i.lastSyncSuccess,
      lastError: i.lastError,
      retryCount: i.retryCount,
      maxRetries: i.maxRetries,
      frequency: i.frequency,
      active: i.active,
    })),
  });
}

export async function POST(req: Request) {
  const guard = await guardIt("canManageIntegrations");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.integration.create({
    data: {
      tenantId: session.tenantId!!,
      code: parsed.data.code,
      name: parsed.data.name,
      category: parsed.data.category,
      endpoint: parsed.data.endpoint,
      frequency: parsed.data.frequency,
      status: IntegrationStatus.ACTIVE,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "it.integration.create",
      entityType: "Integration",
      entityId: created.id,
      metadata: { code: parsed.data.code, category: parsed.data.category },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
