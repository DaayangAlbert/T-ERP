import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";

export const dynamic = "force-dynamic";

const createCertificationSchema = z.object({
  standard: z.string().min(2).max(80),
  scope: z.string().max(240).optional().nullable(),
  issuedBy: z.string().min(2).max(160),
  issuedAt: z.string().min(1),
  validUntil: z.string().min(1),
  surveillanceAuditDate: z.string().optional().nullable(),
});

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const certs = await prisma.certification.findMany({
    where: { tenantId: session.tenantId! },
    orderBy: { validUntil: "asc" },
  });

  return NextResponse.json({
    items: certs.map((c) => ({
      id: c.id,
      standard: c.standard,
      scope: c.scope,
      issuedBy: c.issuedBy,
      issuedAt: c.issuedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
      surveillanceAuditDate: c.surveillanceAuditDate?.toISOString() ?? null,
      openNcCount: c.openNcCount,
    })),
  });
}

export async function POST(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = createCertificationSchema.parse(await req.json());

    const created = await prisma.certification.create({
      data: {
        tenantId: session.tenantId!,
        standard: body.standard,
        scope: body.scope || null,
        issuedBy: body.issuedBy,
        issuedAt: new Date(body.issuedAt),
        validUntil: new Date(body.validUntil),
        surveillanceAuditDate: body.surveillanceAuditDate ? new Date(body.surveillanceAuditDate) : null,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/sg/certifications]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
