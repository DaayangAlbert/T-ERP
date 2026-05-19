import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { ApprovalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createApprovalSchema = z.object({
  approvalName: z.string().min(2).max(160),
  deliveringAuthority: z.string().min(2).max(120),
  approvalNumber: z.string().min(1).max(80),
  issuedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  renewable: z.boolean().optional(),
  documentUrl: z.string().url().optional().or(z.literal("")),
});

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

export async function POST(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  try {
    const body = createApprovalSchema.parse(await req.json());
    const expiresAt = new Date(body.expiresAt);
    const issuedAt = new Date(body.issuedAt);
    const daysToExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
    const status: ApprovalStatus =
      daysToExpiry < 0 ? ApprovalStatus.EXPIRED : daysToExpiry <= 90 ? ApprovalStatus.EXPIRING_SOON : ApprovalStatus.VALID;

    const created = await prisma.professionalApproval.create({
      data: {
        tenantId,
        approvalName: body.approvalName,
        deliveringAuthority: body.deliveringAuthority,
        approvalNumber: body.approvalNumber,
        issuedAt,
        expiresAt,
        renewable: body.renewable ?? true,
        documentUrl: body.documentUrl && body.documentUrl.length > 0 ? body.documentUrl : null,
        status,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/sg/approvals]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
