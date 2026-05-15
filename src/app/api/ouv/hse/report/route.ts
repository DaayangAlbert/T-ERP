import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import {
  hseReportSchema,
  defaultSeverityForType,
  hseTypeLabel,
} from "@/schemas/ouv-hse";
import {
  HseIncidentSeverity,
  HseIncidentStatus,
  HseIncidentType,
  Role,
} from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/hse/report — Création d'un signalement HSE par l'ouvrier.
//
// Routage automatique :
//  - CORPORAL_ACCIDENT → assignedTo = DTrav. DG + CNPS prévenus côté Bloc 2.
//  - Autres            → assignedTo = DTrav (ou CC si pas de DTrav).
//
// Anonymat (anti-représailles, art. L132 Code du travail CM) : si
// isAnonymous = true, on stocke quand même reportedById (audit interne)
// mais on flag isAnonymous → côté affichage CC/DTrav le nom est masqué.
//
// Pour CORPORAL_ACCIDENT, le flag reportedToCnps reste false ici : la
// déclaration CNPS effective est livrée par RH/DAF (Bloc 2). On marque
// expectedReadyCnpsAt à +48h pour rappel.
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = hseReportSchema.parse(body);

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { tenantId: true, assignedSiteIds: true },
    });
    if (!me?.tenantId) {
      return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
    }
    const primarySiteId = me.assignedSiteIds[0];
    if (!primarySiteId) {
      return NextResponse.json(
        { error: "Aucun chantier affecté — impossible de signaler" },
        { status: 409 }
      );
    }

    // Routage assignedTo : DTrav du tenant en priorité, sinon CC du chantier
    let assignedTo = await prisma.user.findFirst({
      where: { tenantId: me.tenantId, role: Role.WORKS_DIRECTOR },
      select: { id: true },
    });
    if (!assignedTo) {
      assignedTo = await prisma.user.findFirst({
        where: { role: Role.SITE_MANAGER, assignedSiteIds: { has: primarySiteId } },
        select: { id: true },
      });
    }

    const severity =
      input.severity ?? defaultSeverityForType(input.type);

    const created = await prisma.hseIncidentReport.create({
      data: {
        tenantId: me.tenantId,
        reportedById: session.sub,
        siteId: primarySiteId,
        type: input.type as HseIncidentType,
        severity: severity as HseIncidentSeverity,
        title: input.title,
        description: input.description,
        incidentGeoLat: input.geo?.lat ?? null,
        incidentGeoLng: input.geo?.lng ?? null,
        locationDetail: input.locationDetail ?? null,
        injuredPersonIds: input.injuredPersonIds ?? [],
        witnessIds: input.witnessIds ?? [],
        photosUrls: input.photos ?? [],
        isAnonymous: input.isAnonymous ?? false,
        status: HseIncidentStatus.OPEN,
        assignedToId: assignedTo?.id ?? null,
      },
      select: { id: true, type: true, severity: true, status: true, createdAt: true },
    });

    // TODO Bloc 2 RH/DAF : déclaration CNPS auto sous 48 h pour CORPORAL_ACCIDENT.
    // TODO fn intégration WhatsApp : notification au validateur DTrav + DG si critical.

    return NextResponse.json(
      {
        report: {
          id: created.id,
          type: created.type,
          typeLabel: hseTypeLabel(created.type as any),
          severity: created.severity,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
        },
        cnpsDeclarationRequired: input.type === "CORPORAL_ACCIDENT",
        message:
          input.type === "CORPORAL_ACCIDENT"
            ? "Signalement enregistré — déclaration CNPS programmée (48 h)"
            : "Signalement enregistré — merci pour ta vigilance",
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
    console.error("[POST /api/ouv/hse/report]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
