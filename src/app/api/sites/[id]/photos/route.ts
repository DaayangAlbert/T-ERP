import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const site = await prisma.site.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
    select: { id: true },
  });
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const photos = await prisma.sitePhoto.findMany({
    where: { siteId: site.id },
    orderBy: { takenAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    items: photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      takenAt: p.takenAt.toISOString(),
      uploadedBy: p.uploadedBy,
    })),
  });
}
