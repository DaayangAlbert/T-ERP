import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { RegisterStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EntrySchema = z.object({
  label: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
});

/**
 * Increment manuel du compteur d'entrées (utilisé pour les registres
 * non auto-alimentés par d'autres modules — ex : Conventions réglementées,
 * Personnel délégué à RH, HSE délégué à DTrav).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = EntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.regulatoryRegister.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, entriesCount: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Registre introuvable" }, { status: 404 });
  }

  await prisma.regulatoryRegister.update({
    where: { id: existing.id },
    data: {
      entriesCount: existing.entriesCount + 1,
      lastEntryDate: new Date(),
      status:
        existing.status === RegisterStatus.TO_UPDATE || existing.status === RegisterStatus.OVERDUE
          ? RegisterStatus.UP_TO_DATE
          : existing.status,
    },
  });

  return NextResponse.json({
    ok: true,
    newEntriesCount: existing.entriesCount + 1,
    label: parsed.data.label,
  });
}
