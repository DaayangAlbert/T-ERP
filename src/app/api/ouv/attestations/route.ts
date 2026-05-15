import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import {
  attestationRequestSchema,
  attestationTypeLabel,
  type OuvAttestationType,
} from "@/schemas/ouv-attestation";
import { AttestationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Délai cible de remise : 48 h ouvrées (jours non implémentés en détail ici,
// on prend simplement 48 h calendaires sauf si tombent un week-end → +2 j).
function nextExpectedReady(now: Date): Date {
  const out = new Date(now.getTime() + 48 * 3600 * 1000);
  const day = out.getUTCDay();
  if (day === 6) out.setUTCDate(out.getUTCDate() + 2);
  if (day === 0) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

// GET /api/ouv/attestations — Mes demandes (toutes).
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const rows = await prisma.attestationRequest.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      purpose: true,
      status: true,
      preparedBy: { select: { firstName: true, lastName: true } },
      preparedAt: true,
      documentUrl: true,
      expectedReadyAt: true,
      rejectionReason: true,
      deliveredAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    attestations: rows.map((a) => ({
      id: a.id,
      type: a.type,
      typeLabel: attestationTypeLabel(a.type as OuvAttestationType),
      purpose: a.purpose,
      status: a.status,
      preparedByName: a.preparedBy
        ? `${a.preparedBy.firstName} ${a.preparedBy.lastName}`
        : null,
      preparedAt: a.preparedAt?.toISOString() ?? null,
      documentUrl: a.documentUrl,
      expectedReadyAt: a.expectedReadyAt?.toISOString() ?? null,
      rejectionReason: a.rejectionReason,
      deliveredAt: a.deliveredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

// POST /api/ouv/attestations — Création d'une demande d'attestation.
// Refus si une demande du même type est déjà PENDING ou IN_PREPARATION
// (pas la peine d'empiler — RH traitera celle existante).
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = attestationRequestSchema.parse(body);

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { tenantId: true },
    });
    if (!me?.tenantId) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
    }

    const existing = await prisma.attestationRequest.findFirst({
      where: {
        userId: session.sub,
        type: input.type,
        status: { in: [AttestationStatus.PENDING, AttestationStatus.IN_PREPARATION] },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "Une attestation de ce type est déjà en cours — attends sa préparation",
          code: "ALREADY_OPEN",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const created = await prisma.attestationRequest.create({
      data: {
        tenantId: me.tenantId,
        userId: session.sub,
        type: input.type,
        purpose: input.purpose ?? null,
        status: AttestationStatus.PENDING,
        expectedReadyAt: nextExpectedReady(now),
      },
      select: { id: true, type: true, status: true, expectedReadyAt: true },
    });

    // TODO fn 1.6 / RH Bloc : notification WhatsApp à Sandrine ONANA

    return NextResponse.json(
      {
        attestation: {
          id: created.id,
          type: created.type,
          typeLabel: attestationTypeLabel(created.type as OuvAttestationType),
          status: created.status,
          expectedReadyAt: created.expectedReadyAt?.toISOString() ?? null,
        },
        message: "Demande envoyée — RH prépare le document sous 48 h ouvrées",
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
    console.error("[POST /api/ouv/attestations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
