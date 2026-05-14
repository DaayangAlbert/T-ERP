import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { advanceRequestSchema } from "@/schemas/ouv-advance";
import {
  maxAllowedFromBaseSalary,
  pickValidatorRole,
  AUTO_APPROVE_THRESHOLD_XAF,
} from "@/lib/ouv/advance";
import { SalaryAdvanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/advances — Mes demandes d'avances + plafond courant.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const advances = await prisma.salaryAdvanceRequest.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true,
      amountXAF: true,
      maxAllowedXAF: true,
      reason: true,
      status: true,
      validatedAt: true,
      validator: { select: { firstName: true, lastName: true, role: true } },
      payoutAt: true,
      payoutMethod: true,
      rejectionReason: true,
      recoveryMonth: true,
      recoveredAt: true,
      createdAt: true,
    },
  });

  // Plafond courant : 30 % × baseSalary du dernier bulletin
  const latest = await prisma.payslip.findFirst({
    where: { userId: session.sub },
    orderBy: { period: "desc" },
    select: { baseSalary: true, periodLabel: true },
  });
  const baseSalary = latest?.baseSalary ? Number(latest.baseSalary) : 0;
  const maxAllowed = maxAllowedFromBaseSalary(baseSalary);

  // Avance en cours de cycle ? (PENDING ou APPROVED non encore récupérée)
  const hasPending = advances.some(
    (a) => a.status === SalaryAdvanceStatus.PENDING || a.status === SalaryAdvanceStatus.APPROVED || a.status === SalaryAdvanceStatus.PAID
  );

  return NextResponse.json({
    advances: advances.map((a) => ({
      id: a.id,
      amountXAF: Number(a.amountXAF),
      maxAllowedXAF: Number(a.maxAllowedXAF),
      reason: a.reason,
      status: a.status,
      validatedAt: a.validatedAt?.toISOString() ?? null,
      validatorName: a.validator
        ? `${a.validator.firstName} ${a.validator.lastName}`
        : null,
      validatorRole: a.validator?.role ?? null,
      payoutAt: a.payoutAt?.toISOString() ?? null,
      payoutMethod: a.payoutMethod,
      rejectionReason: a.rejectionReason,
      recoveryMonth: a.recoveryMonth,
      recoveredAt: a.recoveredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    quota: {
      baseSalaryXAF: baseSalary,
      maxAllowedXAF: maxAllowed,
      lastPayslipPeriodLabel: latest?.periodLabel ?? null,
      hasOpenAdvance: hasPending,
    },
  });
}

// POST /api/ouv/advances — Création d'une demande d'avance.
// Vérifie plafond 30 %, refuse si avance déjà en cours, auto-approuve < 50K.
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = advanceRequestSchema.parse(body);

    // Plafond = 30 % du base salary du dernier bulletin émis
    const latest = await prisma.payslip.findFirst({
      where: { userId: session.sub },
      orderBy: { period: "desc" },
      select: { baseSalary: true, tenantId: true },
    });
    if (!latest || !latest.baseSalary) {
      return NextResponse.json(
        {
          error: "Aucun bulletin émis — impossible de calculer le plafond d'avance",
          code: "NO_BASE_SALARY",
        },
        { status: 409 }
      );
    }
    const baseSalary = Number(latest.baseSalary);
    const maxAllowed = maxAllowedFromBaseSalary(baseSalary);

    if (input.amountXAF > maxAllowed) {
      return NextResponse.json(
        {
          error: `Plafond dépassé : maximum ${maxAllowed.toLocaleString("fr-FR")} FCFA (30 % de votre salaire base)`,
          code: "AMOUNT_OVER_QUOTA",
          maxAllowedXAF: maxAllowed,
        },
        { status: 400 }
      );
    }

    // Une seule avance ouverte à la fois
    const existing = await prisma.salaryAdvanceRequest.findFirst({
      where: {
        userId: session.sub,
        status: {
          in: [
            SalaryAdvanceStatus.PENDING,
            SalaryAdvanceStatus.APPROVED,
            SalaryAdvanceStatus.PAID,
          ],
        },
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `Une avance ${humanStatus(existing.status)} est déjà en cours — attends sa récupération sur paie`,
          code: "ALREADY_OPEN_ADVANCE",
        },
        { status: 409 }
      );
    }

    const validatorRole = pickValidatorRole(input.amountXAF);
    const autoApprove = validatorRole === "AUTO";

    const created = await prisma.salaryAdvanceRequest.create({
      data: {
        tenantId: latest.tenantId,
        userId: session.sub,
        amountXAF: BigInt(input.amountXAF),
        maxAllowedXAF: BigInt(maxAllowed),
        reason: input.reason,
        payoutMethod: input.payoutMethod ?? "BANK_TRANSFER",
        status: autoApprove ? SalaryAdvanceStatus.APPROVED : SalaryAdvanceStatus.PENDING,
        validatedAt: autoApprove ? new Date() : null,
      },
      select: { id: true, amountXAF: true, status: true, createdAt: true },
    });

    // TODO fn 1.6 / RH-DAF Blocs : notification WhatsApp au validateur RH/DAF/DG
    // selon `validatorRole`. Trace audit aussi (cf src/lib/audit).

    return NextResponse.json(
      {
        id: created.id,
        amountXAF: Number(created.amountXAF),
        status: created.status,
        validatorRole,
        autoApproved: autoApprove,
        message: autoApprove
          ? "Avance auto-validée — virement sous 48 h"
          : "Demande envoyée — décision sous 24 h ouvrées",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/advances]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function humanStatus(status: SalaryAdvanceStatus): string {
  switch (status) {
    case "PENDING":
      return "en attente de validation";
    case "APPROVED":
      return "approuvée";
    case "PAID":
      return "payée";
    default:
      return "en cours";
  }
}

// Note : seuils de validation exposés pour la doc / debug.
export const _thresholds = { AUTO_APPROVE_THRESHOLD_XAF };
