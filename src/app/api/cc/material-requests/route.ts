import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MaterialRequestStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createMaterialRequestSchema } from "@/schemas/material-request";

export const dynamic = "force-dynamic";

/**
 * Liste les demandes de matériel du Chef de Chantier connecté.
 * Tri : status PENDING en premier, puis date DESC.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const items = await prisma.materialRequest.findMany({
    where: { requesterId: session.sub },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      site: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      fulfilledBy: { select: { firstName: true, lastName: true } },
      lines: {
        include: {
          article: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      reference: r.reference,
      status: r.status,
      priority: r.priority,
      reason: r.reason,
      notes: r.notes,
      site: r.site,
      warehouse: r.warehouse,
      fulfilledBy: r.fulfilledBy
        ? `${r.fulfilledBy.firstName} ${r.fulfilledBy.lastName}`
        : null,
      fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      rejectedAt: r.rejectedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      lines: r.lines.map((l) => ({
        id: l.id,
        article: l.article,
        quantityRequested: l.quantityRequested,
        quantityFulfilled: l.quantityFulfilled,
        notes: l.notes,
      })),
    })),
  });
}

/**
 * Crée une demande de matériel. Génère une référence MR-{site.code}-{yyyymm}-{seq}.
 * Notifie le magasinier (Warehouse.keeperId).
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  try {
    const input = createMaterialRequestSchema.parse(await req.json());

    // Vérifie que le site et le warehouse sont accessibles au CC
    const [site, warehouse] = await Promise.all([
      prisma.site.findFirst({
        where: { id: input.siteId, tenantId: session.tenantId },
        select: { id: true, code: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: input.warehouseId, tenantId: session.tenantId },
        select: { id: true, keeperId: true, name: true },
      }),
    ]);
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
    if (!warehouse) return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 });

    // Vérifie que les articles existent dans le tenant
    const articleIds = input.lines.map((l) => l.articleId);
    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds }, tenantId: session.tenantId },
      select: { id: true },
    });
    if (articles.length !== articleIds.length) {
      return NextResponse.json(
        { error: "Certains articles sont invalides pour ce tenant" },
        { status: 400 },
      );
    }

    // Génère une référence unique : MR-{site.code}-{yyyymm}-{seq}
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countThisMonth = await prisma.materialRequest.count({
      where: {
        siteId: input.siteId,
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    });
    const reference = `MR-${site.code}-${yyyymm}-${String(countThisMonth + 1).padStart(3, "0")}`;

    const created = await prisma.materialRequest.create({
      data: {
        tenantId: session.tenantId,
        requesterId: session.sub,
        siteId: input.siteId,
        warehouseId: input.warehouseId,
        reference,
        priority: input.priority,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        status: MaterialRequestStatus.PENDING,
        lines: {
          create: input.lines.map((l) => ({
            articleId: l.articleId,
            quantityRequested: l.quantityRequested,
            notes: l.notes ?? null,
          })),
        },
      },
      select: { id: true, reference: true, priority: true },
    });

    // Notifie le magasinier du warehouse cible
    if (warehouse.keeperId) {
      const me = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { firstName: true, lastName: true },
      });
      const requester = me ? `${me.firstName} ${me.lastName}` : "Un chef de chantier";
      await prisma.notification.create({
        data: {
          userId: warehouse.keeperId,
          type: "material_request_pending",
          title: `Demande matériel — ${created.reference}`,
          body: `${requester} · ${input.lines.length} article(s) · priorité ${created.priority}`,
          link: "/magasin/demandes",
        },
      });
    }

    return NextResponse.json(
      { id: created.id, reference: created.reference },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/material-requests]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
