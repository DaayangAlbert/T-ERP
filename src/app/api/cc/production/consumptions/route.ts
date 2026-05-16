import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";

const schema = z.object({
  dailyReportId: z.string(),
  articleCode: z.string().min(1),
  articleLabel: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  source: z.string().optional(),
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

  const created = await prisma.siteMaterialConsumption.create({
    data: {
      dailyReportId: report.id,
      articleCode: parsed.data.articleCode,
      articleLabel: parsed.data.articleLabel,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      source: parsed.data.source ?? null,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
