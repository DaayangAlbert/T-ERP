import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 86_400_000);

  const [approvals, certifications, registers] = await Promise.all([
    prisma.professionalApproval.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
    }),
    prisma.certification.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { validUntil: "asc" },
    }),
    prisma.regulatoryRegister.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ status: "asc" }, { nextReviewDate: "asc" }],
      include: { responsibleUser: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const approvalsExpiring = approvals.filter(
    (a) => a.expiresAt <= in60Days && a.status !== "EXPIRED" && a.status !== "RENEWED",
  ).length;
  const certsExpiring = certifications.filter((c) => c.validUntil <= in60Days).length;
  const registersOverdue = registers.filter((r) => r.status === "OVERDUE").length;

  return NextResponse.json({
    summary: {
      totalApprovals: approvals.length,
      approvalsExpiring,
      certifications: certifications.length,
      certsExpiring,
      registers: registers.length,
      registersOverdue,
      registersToUpdate: registers.filter((r) => r.status === "TO_UPDATE").length,
    },
    approvals: approvals.map((a) => ({
      id: a.id,
      approvalName: a.approvalName,
      deliveringAuthority: a.deliveringAuthority,
      approvalNumber: a.approvalNumber,
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
      daysUntilExpiry: Math.ceil((a.expiresAt.getTime() - now.getTime()) / 86_400_000),
      renewable: a.renewable,
      status: a.status,
    })),
    certifications: certifications.map((c) => ({
      id: c.id,
      standard: c.standard,
      scope: c.scope,
      issuedBy: c.issuedBy,
      issuedAt: c.issuedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
      daysUntilExpiry: Math.ceil((c.validUntil.getTime() - now.getTime()) / 86_400_000),
      surveillanceAuditDate: c.surveillanceAuditDate?.toISOString() ?? null,
      openNcCount: c.openNcCount,
    })),
    registers: registers.map((r) => ({
      id: r.id,
      registerType: r.registerType,
      name: r.name,
      legalBasis: r.legalBasis,
      responsible: `${r.responsibleUser.firstName} ${r.responsibleUser.lastName}`,
      entriesCount: r.entriesCount,
      lastEntryDate: r.lastEntryDate?.toISOString() ?? null,
      nextReviewDate: r.nextReviewDate.toISOString(),
      status: r.status,
    })),
  });
}
