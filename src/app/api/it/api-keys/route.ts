import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const items = await prisma.apiKey.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      revokedAt: k.revokedAt?.toISOString() ?? null,
    })),
  });
}
