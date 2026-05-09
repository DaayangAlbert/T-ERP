import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createInterestDeclarationSchema } from "@/schemas/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.interestDeclaration.findMany({
    where: { userId: session.sub },
    orderBy: { year: "desc" },
  });

  const today = new Date();
  const latest = items[0];
  const renewalDue = latest && latest.validUntil < new Date(today.getTime() + 30 * 86_400_000);

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      year: d.year,
      mandates: d.mandates,
      shareholdings: d.shareholdings,
      conflictsOfInterest: d.conflictsOfInterest,
      declaredAt: d.declaredAt.toISOString(),
      validUntil: d.validUntil.toISOString(),
    })),
    renewalDue,
    renewalDeadline: latest?.validUntil.toISOString() ?? null,
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createInterestDeclarationSchema.parse(await req.json());
    const validUntil = new Date(data.year, 11, 31);
    const created = await prisma.interestDeclaration.upsert({
      where: { userId_year: { userId: session.sub, year: data.year } },
      update: {
        mandates: data.mandates as object,
        shareholdings: data.shareholdings as object,
        conflictsOfInterest: data.conflictsOfInterest as object,
        declaredAt: new Date(),
        validUntil,
      },
      create: {
        userId: session.sub,
        year: data.year,
        mandates: data.mandates as object,
        shareholdings: data.shareholdings as object,
        conflictsOfInterest: data.conflictsOfInterest as object,
        declaredAt: new Date(),
        validUntil,
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
