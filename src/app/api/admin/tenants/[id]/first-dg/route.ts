import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { hashPassword } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
  position: z.string().max(120).optional(),
  initialPassword: z.string().min(12).max(120).optional(),
});

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "A1!";
}

/**
 * Crée le 1er DG (Directeur Général) d'un tenant.
 *
 * Seul le SUPER_ADMIN peut appeler cette route (provisioning manuel).
 * Le DG a tous les pouvoirs métier (canManageBilling, canManageCorporate
 * Governance, etc.) ET les pouvoirs IT (canManageUsers/Roles/Settings)
 * pour pouvoir agir librement dans son tenant sans bloquage.
 *
 * Workflow type :
 *   1. SUPER_ADMIN crée le tenant via /admin/tenants
 *   2. SUPER_ADMIN crée le 1er admin (TENANT_ADMIN — l'informaticien)
 *   3. SUPER_ADMIN crée le DG via cette route — 1 fois par tenant
 *
 * Refuse si un DG existe déjà pour ce tenant.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existingDg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: Role.DG },
    select: { id: true, email: true },
  });
  if (existingDg) {
    return NextResponse.json(
      {
        error: "Un DG existe déjà pour ce tenant",
        existingEmail: existingDg.email,
      },
      { status: 409 },
    );
  }

  const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
  if (emailTaken) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
  }

  const initialPassword = data.initialPassword ?? generatePassword();
  const passwordHash = await hashPassword(initialPassword);

  const created = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      position: data.position ?? "Directeur Général",
      role: Role.DG,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: false,
      // Le DG a TOUS les pouvoirs métier + IT pour piloter son tenant
      // sans dépendre de workflow externe.
      // NB: canManageBilling n'existe pas sur User (uniquement PlatformAdmin) —
      // la facturation SaaS est gérée côté super-admin.
      canManageUsers: true,
      canManageRoles: true,
      canManageTenantSettings: true,
      canManageIntegrations: true,
      canViewTechnicalLogs: true,
      canReadAllDocuments: true,
      canReadAllDashboards: true,
      canManageCorporateGovernance: true,
      canManageMarketContracts: true,
      canManageLegalCases: true,
      canManageOfficialCorrespondence: true,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  await logAdminAction({
    session,
    action: "CONFIG_MODIFIED",
    targetType: "User",
    targetId: created.id,
    targetDescription: `1er DG ${tenant.slug} : ${created.email}`,
    tenantId: tenant.id,
    afterState: { role: Role.DG, email: created.email },
  });

  return NextResponse.json(
    {
      ok: true,
      user: created,
      initialPassword,
      message:
        "Compte DG créé. Communiquez ce mot de passe au client par canal sécurisé — il devra le changer à la première connexion.",
    },
    { status: 201 },
  );
}
