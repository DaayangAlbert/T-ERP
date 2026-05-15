import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role } from "@prisma/client";
import { normalizeCmPhone } from "@/lib/ouv/phone";

export const dynamic = "force-dynamic";

// GET /api/ouv/hse/emergency-contacts
// Renvoie : urgences nationales CM (117 pompiers, 113 police, 119 SAMU) +
// le Chef Chantier du chantier d'affectation + DTrav du tenant. L'UI
// affiche ces contacts dans le bandeau rouge "URGENCE VITALE".
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { tenantId: true, assignedSiteIds: true },
  });

  const primarySiteId = me?.assignedSiteIds[0];
  const chief = primarySiteId
    ? await prisma.user.findFirst({
        where: { role: Role.SITE_MANAGER, assignedSiteIds: { has: primarySiteId } },
        select: { id: true, firstName: true, lastName: true, phone: true },
      })
    : null;
  const dtrav = me?.tenantId
    ? await prisma.user.findFirst({
        where: { tenantId: me.tenantId, role: Role.WORKS_DIRECTOR },
        select: { id: true, firstName: true, lastName: true, phone: true },
      })
    : null;

  const fmt = (u: { firstName: string; lastName: string; phone: string | null } | null) => {
    if (!u) return null;
    const e164 = u.phone ? normalizeCmPhone(u.phone) : null;
    return {
      fullName: `${u.firstName} ${u.lastName}`,
      phone: u.phone,
      phoneE164: e164,
      whatsappUrl: e164 ? `https://wa.me/${e164.replace("+", "")}` : null,
      telUrl: e164 ? `tel:${e164}` : null,
    };
  };

  return NextResponse.json({
    nationalEmergencies: [
      { label: "Pompiers", number: "117", telUrl: "tel:117" },
      { label: "Police", number: "113", telUrl: "tel:113" },
      { label: "SAMU", number: "119", telUrl: "tel:119" },
    ],
    siteManager: fmt(chief),
    worksDirector: fmt(dtrav),
  });
}
