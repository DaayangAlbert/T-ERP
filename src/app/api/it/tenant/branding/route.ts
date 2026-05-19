/**
 * Édition des coordonnées entreprise et assets officiels du tenant.
 *
 * Ces champs sont affichés sur les documents officiels — bulletins de paie,
 * factures, attestations — d'où la séparation par rapport aux paramètres
 * /api/it/tenant/settings (qui gèrent les préférences applicatives).
 *
 * Autorisation : TENANT_ADMIN avec flag canManageTenantSettings, et SUPER_ADMIN.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";

export const dynamic = "force-dynamic";

const brandingSchema = z.object({
  contactAddress: z.string().trim().max(255).nullable().optional(),
  contactPhone: z.string().trim().max(64).nullable().optional(),
  contactEmail: z.string().trim().email().max(120).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().trim().max(120).nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  signatureImageUrl: z.string().trim().max(500).nullable().optional(),
  stampImageUrl: z.string().trim().max(500).nullable().optional(),
  drhSignatoryName: z.string().trim().max(120).nullable().optional(),
});

export async function GET() {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId! },
    select: {
      name: true,
      contactAddress: true,
      contactPhone: true,
      contactEmail: true,
      websiteUrl: true,
      logoUrl: true,
      signatureImageUrl: true,
      stampImageUrl: true,
      drhSignatoryName: true,
    },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: Request) {
  const guard = await guardIt("canManageTenantSettings");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = brandingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Empty string sur email → null (sinon Zod email validation casse)
  const data = { ...parsed.data };
  if (data.contactEmail === "") data.contactEmail = null;

  await prisma.tenant.update({
    where: { id: session.tenantId! },
    data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "it.tenant.branding.update",
      entityType: "Tenant",
      entityId: session.tenantId!,
      metadata: { fields: Object.keys(data) },
    },
  });

  return NextResponse.json({ ok: true });
}
