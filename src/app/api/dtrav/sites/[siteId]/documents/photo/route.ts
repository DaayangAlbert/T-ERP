import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { DocumentCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Upload photo terrain depuis le téléphone.
 *
 * Body : FormData { file, lat?, lng?, takenAt?, caption? }
 *
 * En production : pousser sur S3/Cloudflare R2 + générer thumbnail + EXIF.
 * Ici stub : on enregistre les métadonnées avec une URL placeholder.
 */
export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData attendu" }, { status: 400 });
  }
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  const lat = Number(form.get("lat") ?? "0") || null;
  const lng = Number(form.get("lng") ?? "0") || null;
  const caption = (form.get("caption") as string | null) ?? null;
  const takenAtStr = (form.get("takenAt") as string | null) ?? null;
  const takenAt = takenAtStr ? new Date(takenAtStr) : new Date();

  // Stub : enregistrer placeholder. En prod, file.arrayBuffer() puis upload S3.
  const placeholderUrl = `/uploads/sites/${params.siteId}/photos/${Date.now()}-${file.name}`;

  const doc = await prisma.siteDocument.create({
    data: {
      siteId: params.siteId,
      category: DocumentCategory.FIELD_PHOTOS,
      title: caption ?? `Photo terrain ${takenAt.toLocaleDateString("fr-FR")}`,
      description: null,
      fileUrl: placeholderUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      thumbnailUrl: placeholderUrl,
      uploadedById: session.sub,
      tags: ["mobile", "terrain"],
      metadata: { lat, lng, takenAt: takenAt.toISOString(), origin: "mobile-capture" },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.photo.capture",
      entityType: "SiteDocument",
      entityId: doc.id,
      metadata: { siteId: params.siteId, lat, lng, takenAt: takenAt.toISOString() },
    },
  });

  return NextResponse.json({ id: doc.id, fileUrl: placeholderUrl }, { status: 201 });
}
