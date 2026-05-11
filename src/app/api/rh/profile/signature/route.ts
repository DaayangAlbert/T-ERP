import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.TENANT_ADMIN];

interface SignatureConfig {
  authorizedDocs: string[];
  delegates: Array<{ id: string; userId: string; name: string; scope: string; until: string }>;
}

const DEFAULT_CONFIG: SignatureConfig = {
  authorizedDocs: [
    "HIRING_CONTRACT_CDI",
    "HIRING_CONTRACT_CDD",
    "DPAE",
    "WARNING_LETTER",
    "REPRIMAND_LETTER",
    "SUSPENSION_NOTICE",
    "RETURN_TO_WORK_LETTER",
  ],
  delegates: [],
};

export const ALL_DOC_TYPES = [
  { key: "HIRING_CONTRACT_CDI", label: "Contrat CDI" },
  { key: "HIRING_CONTRACT_CDD", label: "Contrat CDD" },
  { key: "DPAE", label: "DPAE (déclaration préalable embauche)" },
  { key: "WARNING_LETTER", label: "Lettre d'avertissement" },
  { key: "REPRIMAND_LETTER", label: "Lettre de blâme" },
  { key: "SUSPENSION_NOTICE", label: "Mise à pied conservatoire" },
  { key: "PRELIMINARY_INTERVIEW_LETTER", label: "Convocation entretien préalable" },
  { key: "DISMISSAL_LETTER", label: "Lettre de licenciement" },
  { key: "RETURN_TO_WORK_LETTER", label: "Lettre de reprise" },
  { key: "INTERNSHIP_AGREEMENT", label: "Convention de stage" },
] as const;

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  const settings = await prisma.rhSettings.findUnique({ where: { userId: session.sub } });
  const config = (settings?.signatureConfig as SignatureConfig | null) ?? DEFAULT_CONFIG;
  return NextResponse.json({ ...DEFAULT_CONFIG, ...config, availableDocTypes: ALL_DOC_TYPES });
}

export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SignatureConfig>;
  const settings = await prisma.rhSettings.findUnique({ where: { userId: session.sub } });
  const merged: SignatureConfig = { ...DEFAULT_CONFIG, ...((settings?.signatureConfig as SignatureConfig | null) ?? {}), ...body };

  await prisma.rhSettings.upsert({
    where: { userId: session.sub },
    update: { signatureConfig: merged as object },
    create: { userId: session.sub, signatureConfig: merged as object },
  });

  return NextResponse.json({ ok: true, ...merged });
}
