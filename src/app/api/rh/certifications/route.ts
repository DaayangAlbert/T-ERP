import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const TYPES = [
  "CACES R482 cat B1 — Pelles hydrauliques",
  "CACES R489 cat 3 — Chariots élévateurs",
  "CACES R486 — Nacelle PEMP",
  "Travail en hauteur — Port harnais",
  "SST — Sauveteur Secouriste",
  "Habilitation électrique B1V/B2V",
  "Manutention manuelle PRAP",
  "Conduite défensive véhicules",
];

async function ensureSeedCerts(tenantId: string) {
  const existing = await prisma.employeeCertification.count({ where: { tenantId } });
  if (existing >= 30) return;
  const pool = getSyntheticPersonnel(487).slice(0, 30);
  const today = Date.now();
  for (const [i, p] of pool.entries()) {
    const issuedAt = new Date(today - (200 + i * 60) * 86_400_000);
    // 8 certifs expirent dans 60j → indices 0..7 → expiresAt entre J+1 et J+58
    const expiresAt = i < 8 ? new Date(today + (3 + i * 7) * 86_400_000) : new Date(today + (180 + i * 30) * 86_400_000);
    await prisma.employeeCertification.create({
      data: {
        tenantId,
        employeeKey: p.id,
        employeeName: `${p.firstName} ${p.lastName}`,
        type: TYPES[i % TYPES.length],
        issuedAt,
        expiresAt,
        issuedBy: ["AFTRAL", "Bureau Veritas", "Apave", "Croix-Rouge", "AFCEP"][i % 5],
      },
    });
  }
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  await ensureSeedCerts(session.tenantId);

  const url = new URL(req.url);
  const expiringDays = url.searchParams.get("expiringDays");
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (expiringDays) {
    const limit = new Date(Date.now() + parseInt(expiringDays, 10) * 86_400_000);
    where.expiresAt = { lte: limit };
  }

  const items = await prisma.employeeCertification.findMany({
    where,
    orderBy: { expiresAt: "asc" },
  });

  const now = Date.now();
  const enriched = items.map((c) => {
    const daysLeft = Math.ceil((c.expiresAt.getTime() - now) / 86_400_000);
    return {
      id: c.id,
      employeeKey: c.employeeKey,
      employeeName: c.employeeName,
      type: c.type,
      issuedAt: c.issuedAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      issuedBy: c.issuedBy,
      daysLeft,
      status: daysLeft < 0 ? "EXPIRED" : daysLeft <= 60 ? "RECYCLE_SOON" : "VALID",
    };
  });

  return NextResponse.json({
    items: enriched,
    summary: {
      total: enriched.length,
      valid: enriched.filter((e) => e.status === "VALID").length,
      recycleSoon: enriched.filter((e) => e.status === "RECYCLE_SOON").length,
      expired: enriched.filter((e) => e.status === "EXPIRED").length,
    },
  });
}
