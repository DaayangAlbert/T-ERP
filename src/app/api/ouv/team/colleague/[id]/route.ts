import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role } from "@prisma/client";
import { normalizeCmPhone } from "@/lib/ouv/phone";

export const dynamic = "force-dynamic";

// GET /api/ouv/team/colleague/:id — Fiche collègue (consultation strictement
// professionnelle). Pas de salaire, pas de CNI, pas de date de naissance.
// Téléphone visible uniquement si même chantier (contact pro chantier).
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { tenantId: true, assignedSiteIds: true },
  });
  if (!me?.tenantId) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const colleague = await prisma.user.findFirst({
    where: {
      id: ctx.params.id,
      tenantId: me.tenantId,
      role: { in: [Role.WORKER, Role.SITE_MANAGER, Role.WORKS_MANAGER, Role.WORKS_DIRECTOR] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      position: true,
      workerQualification: true,
      professionalCategory: true,
      teamLeader: true,
      role: true,
      phone: true,
      phoneMobile: true,
      assignedSiteIds: true,
      hireDate: true,
    },
  });
  if (!colleague) {
    return NextResponse.json({ error: "Collègue introuvable" }, { status: 404 });
  }

  // Téléphone visible uniquement si même chantier
  const shareSite = colleague.assignedSiteIds.some((s) => me.assignedSiteIds.includes(s));
  const phoneE164 = shareSite
    ? normalizeCmPhone(colleague.phoneMobile ?? colleague.phone ?? "")
    : null;

  // Chantier d'affectation (premier en commun ou le premier du collègue)
  const primarySite = colleague.assignedSiteIds[0]
    ? await prisma.site.findUnique({
        where: { id: colleague.assignedSiteIds[0] },
        select: { code: true, name: true },
      })
    : null;

  return NextResponse.json({
    id: colleague.id,
    fullName: `${colleague.firstName} ${colleague.lastName}`,
    initials: `${colleague.firstName.charAt(0)}${colleague.lastName.charAt(0)}`.toUpperCase(),
    avatarUrl: colleague.avatarUrl,
    qualification: colleague.workerQualification ?? colleague.position ?? "Ouvrier",
    professionalCategory: colleague.professionalCategory,
    teamLeader: colleague.teamLeader,
    role: colleague.role,
    site: primarySite,
    yearsOnSite: colleague.hireDate
      ? Math.floor((Date.now() - colleague.hireDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      : null,
    phoneE164,
    whatsappUrl: phoneE164 ? `https://wa.me/${phoneE164.replace("+", "")}` : null,
    telUrl: phoneE164 ? `tel:${phoneE164}` : null,
  });
}
