import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { ApprovalStatus, RegisterStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86_400_000);

  const [registers, approvals, nextAg, nextBoard, expiringGuarantees] = await Promise.all([
    prisma.regulatoryRegister.findMany({
      where: { tenantId },
      select: { id: true, status: true, nextReviewDate: true },
    }),
    prisma.professionalApproval.findMany({
      where: { tenantId },
      select: { id: true, status: true, expiresAt: true, approvalName: true, deliveringAuthority: true },
    }),
    prisma.governanceMeeting.findFirst({
      where: {
        tenantId,
        type: { in: ["ORDINARY_AG", "EXTRAORDINARY_AG"] },
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, scheduledAt: true, type: true, location: true },
    }),
    prisma.governanceMeeting.findFirst({
      where: {
        tenantId,
        type: "BOARD_MEETING",
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, scheduledAt: true, location: true },
    }),
    prisma.bankGuarantee.findMany({
      where: {
        contract: { tenantId },
        status: "ACTIVE",
        expiryDate: { gte: now, lte: horizon },
      },
      orderBy: { expiryDate: "asc" },
      select: {
        id: true,
        type: true,
        amount: true,
        expiryDate: true,
        issuingBank: true,
        contract: { select: { reference: true } },
      },
    }),
  ]);

  // Compute compliance score : 100% si tous UP_TO_DATE + agréments VALID + AG prévue
  const total = registers.length + approvals.length;
  const ok =
    registers.filter((r) => r.status === RegisterStatus.UP_TO_DATE).length +
    approvals.filter((a) => a.status === ApprovalStatus.VALID).length;
  const complianceScore = total === 0 ? 100 : Math.round((ok / total) * 100);

  // Build unified deadlines (≤ 90j)
  const deadlines: Array<{
    id: string;
    category: "REGISTER_REVIEW" | "APPROVAL_RENEWAL" | "GOVERNANCE_AG" | "GOVERNANCE_BOARD" | "BANK_GUARANTEE";
    label: string;
    detail: string;
    dueDate: string;
    daysAway: number;
    severity: "rose" | "amber" | "violet";
  }> = [];

  function tone(d: number): "rose" | "amber" | "violet" {
    if (d <= 15) return "rose";
    if (d <= 60) return "amber";
    return "violet";
  }

  for (const r of registers) {
    const d = daysUntil(r.nextReviewDate);
    if (d <= 90) {
      deadlines.push({
        id: `reg-${r.id}`,
        category: "REGISTER_REVIEW",
        label: "Audit interne registre",
        detail: r.status === RegisterStatus.OVERDUE ? "Retard accumulé" : "Revue trimestrielle",
        dueDate: r.nextReviewDate.toISOString(),
        daysAway: d,
        severity: tone(d),
      });
    }
  }
  for (const a of approvals) {
    const d = daysUntil(a.expiresAt);
    if (d <= 90) {
      deadlines.push({
        id: `app-${a.id}`,
        category: "APPROVAL_RENEWAL",
        label: `Renouvellement ${a.approvalName}`,
        detail: a.deliveringAuthority,
        dueDate: a.expiresAt.toISOString(),
        daysAway: d,
        severity: tone(d),
      });
    }
  }
  if (nextAg) {
    const d = daysUntil(nextAg.scheduledAt);
    if (d <= 90) {
      deadlines.push({
        id: `ag-${nextAg.id}`,
        category: "GOVERNANCE_AG",
        label: nextAg.type === "ORDINARY_AG" ? "Assemblée Générale Ordinaire" : "Assemblée Générale Extraordinaire",
        detail: nextAg.location,
        dueDate: nextAg.scheduledAt.toISOString(),
        daysAway: d,
        severity: tone(d),
      });
    }
  }
  if (nextBoard) {
    const d = daysUntil(nextBoard.scheduledAt);
    if (d <= 90) {
      deadlines.push({
        id: `ca-${nextBoard.id}`,
        category: "GOVERNANCE_BOARD",
        label: "Conseil d'Administration",
        detail: nextBoard.location,
        dueDate: nextBoard.scheduledAt.toISOString(),
        daysAway: d,
        severity: tone(d),
      });
    }
  }
  for (const g of expiringGuarantees) {
    const d = daysUntil(g.expiryDate);
    deadlines.push({
      id: `gtee-${g.id}`,
      category: "BANK_GUARANTEE",
      label: `Caution ${g.type}`,
      detail: `${g.contract?.reference ?? "—"} · ${g.issuingBank}`,
      dueDate: g.expiryDate.toISOString(),
      daysAway: d,
      severity: tone(d),
    });
  }
  deadlines.sort((a, b) => a.daysAway - b.daysAway);

  return NextResponse.json({
    complianceScore,
    counts: {
      registers: registers.length,
      registersUpToDate: registers.filter((r) => r.status === RegisterStatus.UP_TO_DATE).length,
      registersToUpdate: registers.filter((r) => r.status === RegisterStatus.TO_UPDATE).length,
      registersOverdue: registers.filter((r) => r.status === RegisterStatus.OVERDUE).length,
      approvalsValid: approvals.filter((a) => a.status === ApprovalStatus.VALID).length,
      approvalsExpiring: approvals.filter((a) => a.status === ApprovalStatus.EXPIRING_SOON).length,
      approvalsExpired: approvals.filter((a) => a.status === ApprovalStatus.EXPIRED).length,
      approvalsTotal: approvals.length,
      deadlines90d: deadlines.length,
      deadlinesUrgent: deadlines.filter((d) => d.severity === "rose").length,
    },
    deadlines,
  });
}
