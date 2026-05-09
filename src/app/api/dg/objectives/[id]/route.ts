import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateObjectiveSchema } from "@/schemas/objective";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const FRENCH_MONTHS = ["Janv", "Févr", "Mars", "Avril", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

async function loadOwnedObjective(id: string, ownerId: string) {
  return prisma.objective.findFirst({ where: { id, ownerId } });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const obj = await loadOwnedObjective(params.id, session.sub);
  if (!obj) return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });

  // Trajectoire 12 mois — synthétisée linéairement entre startDate et endDate.
  // Forecast = cible / 12 chaque mois (cumul linéaire).
  // Actual = on suit la même courbe jusqu'au mois courant, calé sur actualValue.
  const months = monthLabelsFromTo(obj.startDate, obj.endDate);
  const totalMonths = months.length;
  const elapsedMonths = elapsedMonthsBetween(obj.startDate, new Date(), totalMonths);
  const forecastIncrement = obj.targetValue / totalMonths;
  const actualIncrement = obj.actualValue / Math.max(1, elapsedMonths);

  const trajectory = months.map((m, i) => ({
    month: m.label,
    monthIndex: i + 1,
    forecast: Math.round(forecastIncrement * (i + 1)),
    actual: i < elapsedMonths ? Math.round(actualIncrement * (i + 1)) : null,
    target: Math.round(obj.targetValue),
  }));

  return NextResponse.json({
    id: obj.id,
    category: obj.category,
    title: obj.title,
    description: obj.description,
    targetValue: obj.targetValue,
    actualValue: obj.actualValue,
    unit: obj.unit,
    period: obj.period,
    year: obj.year,
    quarter: obj.quarter,
    weight: obj.weight,
    status: obj.status,
    startDate: obj.startDate.toISOString(),
    endDate: obj.endDate.toISOString(),
    trajectory,
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const existing = await loadOwnedObjective(params.id, session.sub);
  if (!existing) return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });

  try {
    const data = updateObjectiveSchema.parse(await req.json());
    const updated = await prisma.objective.update({
      where: { id: existing.id },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
        ...(data.actualValue !== undefined && { actualValue: data.actualValue }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PUT /api/dg/objectives/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const existing = await loadOwnedObjective(params.id, session.sub);
  if (!existing) return NextResponse.json({ error: "Objectif introuvable" }, { status: 404 });

  await prisma.objective.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}

function monthLabelsFromTo(start: Date, end: Date) {
  const out: { label: string; year: number; month: number }[] = [];
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  const cur = new Date(s);
  while (cur <= e) {
    out.push({ label: FRENCH_MONTHS[cur.getMonth()], year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function elapsedMonthsBetween(start: Date, now: Date, totalMonths: number): number {
  if (now < start) return 0;
  const diff =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  return Math.max(0, Math.min(totalMonths, diff));
}
