import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getEffectiveStage, getSyntheticApplications } from "@/lib/rh-recruitment";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const app = getSyntheticApplications().find((a) => a.id === params.id);
  if (!app) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: app.id,
    candidateName: app.candidateName,
    email: app.email,
    phone: app.phone,
    position: app.position,
    region: app.region,
    stage: getEffectiveStage(app),
    appliedAt: app.appliedAt,
    scoring: app.scoring,
    interviews: [],
    cvUrl: null,
    coverLetter: "Candidature démo générée pour la maquette RH (pas de pièce jointe).",
  });
}
