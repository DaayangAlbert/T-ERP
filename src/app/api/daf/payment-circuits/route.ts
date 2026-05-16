import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { createCircuitTemplateSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT, Role.TENANT_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("includeArchived") === "1";
  const clientName = url.searchParams.get("clientName")?.trim();

  const items = await prisma.paymentCircuitTemplate.findMany({
    where: {
      tenantId: session.tenantId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(clientName ? { clientName: { contains: clientName, mode: "insensitive" } } : {}),
    },
    include: {
      steps: { orderBy: { order: "asc" } },
      _count: { select: { tracks: true } },
    },
    orderBy: [{ archivedAt: "asc" }, { clientName: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: items.map((t) => ({
      id: t.id,
      name: t.name,
      clientName: t.clientName,
      description: t.description,
      archivedAt: t.archivedAt?.toISOString() ?? null,
      stepCount: t.steps.length,
      trackCount: t._count.tracks,
      steps: t.steps.map((s) => ({
        id: s.id,
        order: s.order,
        label: s.label,
        description: s.description,
        contactName: s.contactName,
        contactRole: s.contactRole,
        contactPhone: s.contactPhone,
        contactEmail: s.contactEmail,
        estimatedDays: s.estimatedDays,
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  try {
    const data = createCircuitTemplateSchema.parse(await req.json());

    const existing = await prisma.paymentCircuitTemplate.findUnique({
      where: { tenantId_name: { tenantId: session.tenantId, name: data.name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Un circuit nommé « ${data.name} » existe déjà pour ce tenant` },
        { status: 409 },
      );
    }

    const created = await prisma.paymentCircuitTemplate.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        clientName: data.clientName,
        description: data.description ?? null,
        createdById: session.sub,
        steps: {
          create: data.steps.map((s) => ({
            order: s.order,
            label: s.label,
            description: s.description ?? null,
            contactName: s.contactName ?? null,
            contactRole: s.contactRole ?? null,
            contactPhone: s.contactPhone ?? null,
            contactEmail: s.contactEmail || null,
            estimatedDays: s.estimatedDays ?? null,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
