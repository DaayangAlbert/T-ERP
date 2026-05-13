import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { ApprovalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function severity(d: number, status: ApprovalStatus): "rose" | "amber" | "violet" | "emerald" {
  if (status === ApprovalStatus.EXPIRED) return "rose";
  if (d <= 30) return "rose";
  if (d <= 90) return "amber";
  if (status === ApprovalStatus.EXPIRING_SOON) return "amber";
  return "emerald";
}

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const items = await prisma.professionalApproval.findMany({
    where: { tenantId },
    orderBy: { expiresAt: "asc" },
  });

  const enriched = items.map((a) => {
    const d = daysUntil(a.expiresAt);
    return {
      id: a.id,
      approvalName: a.approvalName,
      deliveringAuthority: a.deliveringAuthority,
      approvalNumber: a.approvalNumber,
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
      daysToExpiry: d,
      renewable: a.renewable,
      status: a.status,
      documentUrl: a.documentUrl,
      renewalReminderSent: a.renewalReminderSent,
      severity: severity(d, a.status),
    };
  });

  return NextResponse.json({
    items: enriched,
    counts: {
      total: enriched.length,
      valid: enriched.filter((a) => a.status === ApprovalStatus.VALID).length,
      expiringSoon: enriched.filter((a) => a.status === ApprovalStatus.EXPIRING_SOON || (a.daysToExpiry <= 90 && a.daysToExpiry > 0 && a.status === ApprovalStatus.VALID)).length,
      expired: enriched.filter((a) => a.status === ApprovalStatus.EXPIRED).length,
    },
  });
}
