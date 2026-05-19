import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { RegisterStatus, RegisterType } from "@prisma/client";

export const dynamic = "force-dynamic";

const createRegisterSchema = z.object({
  registerType: z.enum([
    "AG_DECISIONS",
    "SHAREHOLDERS",
    "BOARD_DECISIONS",
    "PERSONNEL",
    "HSE_SITES",
    "REGULATED_AGREEMENTS",
    "BANK_GUARANTEES",
    "PUBLIC_MARKETS",
  ]),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  legalBasis: z.string().min(2).max(240),
  responsibleUserId: z.string().min(1),
  nextReviewDate: z.string().min(1),
});

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const registers = await prisma.regulatoryRegister.findMany({
    where: { tenantId },
    orderBy: { registerType: "asc" },
    include: {
      responsibleUser: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  const items = registers.map((r) => {
    const d = daysUntil(r.nextReviewDate);
    return {
      id: r.id,
      registerType: r.registerType,
      name: r.name,
      description: r.description,
      legalBasis: r.legalBasis,
      status: r.status,
      entriesCount: r.entriesCount,
      lastEntryDate: r.lastEntryDate?.toISOString() ?? null,
      nextReviewDate: r.nextReviewDate.toISOString(),
      daysToReview: d,
      responsible: {
        id: r.responsibleUser.id,
        fullName: `${r.responsibleUser.firstName} ${r.responsibleUser.lastName}`,
        role: r.responsibleUser.role,
      },
      severity:
        r.status === RegisterStatus.OVERDUE
          ? "rose"
          : r.status === RegisterStatus.TO_UPDATE || d <= 15
            ? "amber"
            : "emerald",
    };
  });

  return NextResponse.json({
    items,
    counts: {
      total: items.length,
      upToDate: items.filter((i) => i.status === RegisterStatus.UP_TO_DATE).length,
      toUpdate: items.filter((i) => i.status === RegisterStatus.TO_UPDATE).length,
      overdue: items.filter((i) => i.status === RegisterStatus.OVERDUE).length,
    },
  });
}

export async function POST(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = createRegisterSchema.parse(await req.json());

    const created = await prisma.regulatoryRegister.create({
      data: {
        tenantId: session.tenantId!,
        registerType: body.registerType as RegisterType,
        name: body.name,
        description: body.description || null,
        legalBasis: body.legalBasis,
        responsibleUserId: body.responsibleUserId,
        nextReviewDate: new Date(body.nextReviewDate),
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/sg/compliance/registers]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
