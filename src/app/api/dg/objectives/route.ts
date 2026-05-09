import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createObjectiveSchema } from "@/schemas/objective";
import { ObjectivePeriod, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const period = url.searchParams.get("period") as ObjectivePeriod | null;
  const quarter = url.searchParams.get("quarter");

  const where = {
    tenantId: session.tenantId,
    ownerId: session.sub,
    ...(year ? { year: parseInt(year, 10) } : {}),
    ...(period ? { period } : {}),
    ...(quarter ? { quarter: parseInt(quarter, 10) } : {}),
  };

  const items = await prisma.objective.findMany({
    where,
    orderBy: [{ year: "desc" }, { period: "asc" }, { weight: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    items: items.map((o) => ({
      id: o.id,
      category: o.category,
      title: o.title,
      description: o.description,
      targetValue: o.targetValue,
      actualValue: o.actualValue,
      unit: o.unit,
      period: o.period,
      year: o.year,
      quarter: o.quarter,
      weight: o.weight,
      status: o.status,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString(),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    total: items.length,
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  try {
    const data = createObjectiveSchema.parse(await req.json());
    const created = await prisma.objective.create({
      data: {
        tenantId: session.tenantId,
        ownerId: session.sub,
        category: data.category,
        title: data.title,
        description: data.description || null,
        targetValue: data.targetValue,
        actualValue: data.actualValue,
        unit: data.unit,
        period: data.period,
        year: data.year,
        quarter: data.quarter ?? null,
        weight: data.weight,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/dg/objectives]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
