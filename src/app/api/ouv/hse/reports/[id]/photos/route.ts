import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { hsePhotoUploadSchema } from "@/schemas/ouv-hse";
import { HseIncidentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_PHOTOS_PER_REPORT = 5;

// POST /api/ouv/hse/reports/:id/photos { photos: string[] }
// Ajoute des photos après coup. Cumulé à photosUrls existant, plafond 5.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = hsePhotoUploadSchema.parse(body);

    const r = await prisma.hseIncidentReport.findFirst({
      where: { id: ctx.params.id, reportedById: session.sub },
      select: { id: true, status: true, photosUrls: true },
    });
    if (!r) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
    if (r.status === HseIncidentStatus.CLOSED) {
      return NextResponse.json(
        { error: "Signalement clôturé", code: "CLOSED" },
        { status: 409 }
      );
    }

    const combined = [...r.photosUrls, ...input.photos].slice(0, MAX_PHOTOS_PER_REPORT);
    const overflow = r.photosUrls.length + input.photos.length - MAX_PHOTOS_PER_REPORT;

    await prisma.hseIncidentReport.update({
      where: { id: r.id },
      data: { photosUrls: combined },
    });

    return NextResponse.json({
      ok: true,
      totalPhotos: combined.length,
      droppedOverflow: Math.max(0, overflow),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/hse/reports/:id/photos]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
