import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { AmendmentStatus } from "@prisma/client";

const createSchema = z.object({
  amount: z.coerce.number().positive(),
  extraDays: z.coerce.number().int().nonnegative().default(0),
  reason: z.string().min(5),
  justification: z.string().min(10),
  attachments: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.contractAmendment.count({ where: { siteId: params.siteId } });
  const reference = `AVE-${String(count + 1).padStart(3, "0")}`;

  const created = await prisma.contractAmendment.create({
    data: {
      siteId: params.siteId,
      reference,
      amount: BigInt(Math.round(parsed.data.amount)),
      extraDays: parsed.data.extraDays,
      reason: parsed.data.reason,
      justification: parsed.data.justification,
      attachments: parsed.data.attachments,
      status: AmendmentStatus.DRAFT,
      initiatedById: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.amendment.create",
      entityType: "ContractAmendment",
      entityId: created.id,
      metadata: { siteId: params.siteId, reference, amount: parsed.data.amount },
    },
  });

  return NextResponse.json({ id: created.id, reference }, { status: 201 });
}
