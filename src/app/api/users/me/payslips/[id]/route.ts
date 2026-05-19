import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { loadEnrichedPayslip } from "@/lib/payroll/load-enriched-payslip";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const detail = await loadEnrichedPayslip({
    payslipId: params.id,
    ownerUserId: session.sub,
    clientIp,
  });

  if (!detail) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  return NextResponse.json(detail);
}
