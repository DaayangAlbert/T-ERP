import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10) || 12));

  const where = { userId: session.sub };

  const [total, items] = await Promise.all([
    prisma.payslip.count({ where }),
    prisma.payslip.findMany({
      where,
      orderBy: { period: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        period: true,
        paymentDate: true,
        paymentMode: true,
        grossAmount: true,
        netAmount: true,
        socialCharges: true,
        fiscalCharges: true,
        status: true,
        pdfUrl: true,
      },
    }),
  ]);

  const aggregate = await prisma.payslip.aggregate({
    where: { ...where, status: "PAID" },
    _sum: { grossAmount: true, netAmount: true },
    _avg: { netAmount: true },
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      period: p.period.toISOString(),
      paymentDate: p.paymentDate.toISOString(),
      paymentMode: p.paymentMode,
      grossAmount: p.grossAmount.toString(),
      netAmount: p.netAmount.toString(),
      socialCharges: p.socialCharges.toString(),
      fiscalCharges: p.fiscalCharges.toString(),
      status: p.status,
      pdfUrl: p.pdfUrl,
    })),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      ytdGross: aggregate._sum.grossAmount?.toString() ?? "0",
      ytdNet: aggregate._sum.netAmount?.toString() ?? "0",
      avgNet: aggregate._avg.netAmount?.toString() ?? "0",
    },
  });
}
