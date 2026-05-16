import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { Role, ValidationPriority, ValidationType, ValidationStatus } from "@prisma/client";

const schema = z.object({
  teamName: z.string(),
  count: z.coerce.number().int().positive(),
  reason: z.string().min(5),
  neededFromDate: z.string(),
});

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Crée une validation à destination DT (TECH_DIRECTOR)
  const ref = `RENF-${Date.now().toString().slice(-6)}`;
  const validation = await prisma.validation.create({
    data: {
      tenantId: session.tenantId!,
      type: ValidationType.HIRING,
      reference: ref,
      title: `Renfort équipe ${parsed.data.teamName} — ${parsed.data.count} ouvrier(s)`,
      description: parsed.data.reason,
      initiatorId: session.sub,
      currentStep: "DT",
      workflow: {
        steps: [
          { key: "DTRAV", label: "Initiation DTrav", role: Role.WORKS_DIRECTOR, status: "DONE", decidedBy: session.sub, decidedAt: new Date().toISOString() },
          { key: "DT", label: "Validation DT", role: Role.TECH_DIRECTOR, status: "PENDING" },
          { key: "HR", label: "Mise en œuvre RH", role: Role.HR, status: "PENDING" },
        ],
      },
      status: ValidationStatus.PENDING,
      priority: ValidationPriority.HIGH,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.reinforcement.request",
      entityType: "Validation",
      entityId: validation.id,
      metadata: {
        siteId: params.siteId,
        teamName: parsed.data.teamName,
        count: parsed.data.count,
        neededFromDate: parsed.data.neededFromDate,
      },
    },
  });

  return NextResponse.json({ id: validation.id, reference: ref }, { status: 201 });
}
