import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role } from "@prisma/client";
import { normalizeCmPhone } from "@/lib/ouv/phone";

export const dynamic = "force-dynamic";

// GET /api/ouv/team/hierarchy
// Renvoie la chaîne hiérarchique au-dessus de l'ouvrier :
//   DTrav (N+3) → CondTrav (N+2) → CC (N+1 direct) → Moi
// On résout par rôle dans le tenant + chantier d'affectation.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tenantId: true,
      position: true,
      workerQualification: true,
      assignedSiteIds: true,
    },
  });
  if (!me?.tenantId) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const primarySiteId = me.assignedSiteIds[0] ?? null;

  // Chef de chantier (N+1 direct)
  const cc = primarySiteId
    ? await findUser(Role.SITE_MANAGER, { assignedSiteIds: { has: primarySiteId } })
    : null;
  // Conducteur de travaux (N+2) — souvent rattaché à plusieurs chantiers
  const condTrav = await findUser(Role.WORKS_MANAGER, {
    tenantId: me.tenantId,
    ...(primarySiteId ? { assignedSiteIds: { has: primarySiteId } } : {}),
  });
  const condTravFallback =
    !condTrav && primarySiteId
      ? await findUser(Role.WORKS_MANAGER, { tenantId: me.tenantId })
      : null;
  // Directeur travaux (N+3)
  const dtrav = await findUser(Role.WORKS_DIRECTOR, { tenantId: me.tenantId });

  return NextResponse.json({
    hierarchy: [
      dtrav ? formatLevel(dtrav, "DTrav · Directeur Travaux", "N+3") : null,
      (condTrav ?? condTravFallback)
        ? formatLevel((condTrav ?? condTravFallback)!, "Conducteur Travaux", "N+2")
        : null,
      cc ? formatLevel(cc, "Chef Chantier", "N+1", true) : null,
      {
        id: me.id,
        fullName: `${me.firstName} ${me.lastName}`,
        initials: initialsOf(me.firstName, me.lastName),
        roleLabel: me.workerQualification ?? me.position ?? "Ouvrier",
        levelLabel: "Moi",
        isDirectChief: false,
        isMe: true,
        phoneE164: null,
        whatsappUrl: null,
        telUrl: null,
      },
    ].filter(Boolean),
  });
}

async function findUser(
  role: Role,
  extra: Record<string, unknown>
): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneMobile: string | null;
  position: string | null;
} | null> {
  return prisma.user.findFirst({
    where: { role, ...extra },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      phoneMobile: true,
      position: true,
    },
  });
}

function formatLevel(
  u: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneMobile: string | null;
  },
  roleLabel: string,
  levelLabel: string,
  isDirectChief = false
) {
  const phoneE164 = normalizeCmPhone(u.phoneMobile ?? u.phone ?? "");
  return {
    id: u.id,
    fullName: `${u.firstName} ${u.lastName}`,
    initials: initialsOf(u.firstName, u.lastName),
    roleLabel,
    levelLabel,
    isDirectChief,
    isMe: false,
    phoneE164,
    whatsappUrl: phoneE164 ? `https://wa.me/${phoneE164.replace("+", "")}` : null,
    telUrl: phoneE164 ? `tel:${phoneE164}` : null,
  };
}

function initialsOf(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
