import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";
import { getSyntheticApplications, setOverrideStage } from "@/lib/rh-recruitment";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];
const STAGES = Object.values(AppStage);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée RH" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { stage?: AppStage };
  if (!body.stage || !STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Stage invalide" }, { status: 400 });
  }

  const exists = getSyntheticApplications().some((a) => a.id === params.id);
  if (!exists) return NextResponse.json({ error: "Candidat introuvable" }, { status: 404 });

  setOverrideStage(params.id, body.stage);
  return NextResponse.json({ ok: true, stage: body.stage });
}
