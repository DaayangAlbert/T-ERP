import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";

const schema = z.object({
  dailyReportId: z.string(),
  taskId: z.string().nullable().optional(),
  designation: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
  teamId: z.string().nullable().optional(),
  clientUuid: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { siteId } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.siteDailyReport.findFirst({
    where: { id: parsed.data.dailyReportId, siteId },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  const totalValue = Math.round(parsed.data.quantity * parsed.data.unitPrice);

  const created = await prisma.siteTaskRealization.create({
    data: {
      dailyReportId: report.id,
      taskId: parsed.data.taskId ?? null,
      designation: parsed.data.designation,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unitPrice: BigInt(Math.round(parsed.data.unitPrice)),
      totalValue: BigInt(totalValue),
      teamId: parsed.data.teamId ?? null,
      clientUuid: parsed.data.clientUuid ?? null,
    },
  });

  // Mise à jour de la production cumulée du rapport
  const sum = await prisma.siteTaskRealization.aggregate({
    where: { dailyReportId: report.id },
    _sum: { totalValue: true },
  });
  await prisma.siteDailyReport.update({
    where: { id: report.id },
    data: { productionValue: sum._sum.totalValue ?? BigInt(0) },
  });

  return NextResponse.json({ id: created.id, totalValue }, { status: 201 });
}
