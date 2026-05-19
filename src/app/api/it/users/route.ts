import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { hashPassword } from "@/lib/auth";
import { assertUserQuota, TenantQuotaError } from "@/lib/tenant-quota";
import { Role, UserStatus, ContractType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Rôles critiques que l'IT ne peut PAS créer directement.
// - SUPER_ADMIN : interdit (compte plateforme, hors tenant)
// - TENANT_ADMIN : interdit (1 seul par tenant, créé par SUPER_ADMIN au provisioning)
// DG retiré : le TENANT_ADMIN peut créer/remplacer le DG via /informatique/users/new.
// Quand role=DG est créé via cette route, on lui donne tous les pouvoirs métier.
const CRITICAL_ROLES: Role[] = [Role.SUPER_ADMIN, Role.TENANT_ADMIN];

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role),
  position: z.string().optional(),
  category: z.string().optional(),
  contractType: z.nativeEnum(ContractType).optional(),
  hireDate: z.string().optional(),
  assignedSiteIds: z.array(z.string()).optional(),
  requireMfa: z.boolean().optional(),
  // Identité personnelle (cf page profil employé)
  matricule: z.string().max(40).optional(),
  dateOfBirth: z.string().optional(),
  cniNumber: z.string().max(40).optional(),
  phoneMobile: z.string().max(40).optional().nullable(),
  personalEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().max(240).optional(),
  familyStatus: z.string().max(80).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(40).optional(),
  // Informations professionnelles complémentaires
  cnpsNumber: z.string().max(40).optional(),
  niu: z.string().max(40).optional(),
  professionalCategory: z.string().max(80).optional(),
  bankName: z.string().max(80).optional(),
  bankAgency: z.string().max(80).optional(),
  rib: z.string().max(60).optional(),
});

export async function GET(req: Request) {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const search = url.searchParams.get("search")?.trim();
  const role = url.searchParams.get("role") as Role | null;
  const status = url.searchParams.get("status") as UserStatus | null;
  const mfa = url.searchParams.get("mfa");
  const siteId = url.searchParams.get("siteId");

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (role) where.role = role;
  if (status) where.status = status;
  if (mfa === "1") where.twoFactorEnabled = true;
  if (mfa === "0") where.twoFactorEnabled = false;
  if (siteId) where.assignedSiteIds = { has: siteId };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, totals, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ["status"],
      where: { tenantId: session.tenantId },
      _count: true,
    }),
    prisma.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        position: true,
        twoFactorEnabled: true,
        assignedSiteIds: true,
        lastLoginAt: true,
      },
    }),
  ]);

  const mfaCount = await prisma.user.count({
    where: { tenantId: session.tenantId, twoFactorEnabled: true },
  });

  return NextResponse.json({
    items: items.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    kpis: {
      total,
      active: totals.find((t) => t.status === "ACTIVE")?._count ?? 0,
      inactive: totals.find((t) => t.status === "INACTIVE")?._count ?? 0,
      suspended: totals.find((t) => t.status === "SUSPENDED")?._count ?? 0,
      mfaEnabled: mfaCount,
    },
  });
}

export async function POST(req: Request) {
  const guard = await guardIt("canManageUsers");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Garde-fou : IT_ADMIN ne peut pas créer un rôle critique
  if (CRITICAL_ROLES.includes(parsed.data.role)) {
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "it.user.create.blocked",
        entityType: "User",
        entityId: parsed.data.email,
        metadata: { reason: "critical_role", role: parsed.data.role },
      },
    });
    return NextResponse.json(
      { error: `Création d'un compte ${parsed.data.role} interdite — workflow DG requis` },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  try {
    await assertUserQuota(session.tenantId!);
  } catch (e) {
    if (e instanceof TenantQuotaError) {
      return NextResponse.json({ error: e.message }, { status: 402 });
    }
    throw e;
  }

  const initialPassword = Math.random().toString(36).slice(2, 12) + "A1!";
  const passwordHash = await hashPassword(initialPassword);

  // Si on crée un DG, on lui donne tous les pouvoirs métier + IT pour
  // qu'il puisse piloter son tenant sans dépendre du workflow super-admin.
  const isDg = parsed.data.role === Role.DG;

  const created = await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      role: parsed.data.role,
      position: parsed.data.position,
      category: parsed.data.category,
      contractType: parsed.data.contractType,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
      assignedSiteIds: parsed.data.assignedSiteIds ?? [],
      // Pouvoirs DG : pilotage métier + gestion users + paramètres tenant
      ...(isDg
        ? {
            canManageUsers: true,
            canManageRoles: true,
            canManageTenantSettings: true,
            canManageIntegrations: true,
            canViewTechnicalLogs: true,
            canManageBilling: true,
            canManageCorporateGovernance: true,
            canManageMarketContracts: true,
            canManageLegalCases: true,
            canManageOfficialCorrespondence: true,
          }
        : {}),
      // Identité personnelle
      matricule: parsed.data.matricule || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      cniNumber: parsed.data.cniNumber || null,
      phoneMobile: parsed.data.phoneMobile || null,
      personalEmail: parsed.data.personalEmail || null,
      address: parsed.data.address || null,
      familyStatus: parsed.data.familyStatus || null,
      emergencyContactName: parsed.data.emergencyContactName || null,
      emergencyContactPhone: parsed.data.emergencyContactPhone || null,
      // Informations professionnelles complémentaires
      cnpsNumber: parsed.data.cnpsNumber || null,
      niu: parsed.data.niu || null,
      professionalCategory: parsed.data.professionalCategory || null,
      bankName: parsed.data.bankName || null,
      bankAgency: parsed.data.bankAgency || null,
      rib: parsed.data.rib || null,
      passwordHash,
      twoFactorEnabled: false, // setup au premier login si MFA requis
      emailVerified: false,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, email: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "it.user.create",
      entityType: "User",
      entityId: created.id,
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role,
        requireMfa: parsed.data.requireMfa ?? false,
      },
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      initialPassword,
      note: "Stub : email d'activation à envoyer via Resend en production",
    },
    { status: 201 }
  );
}
