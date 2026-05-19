import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt } from "@/lib/rbac/it-guard";
import { hashPassword } from "@/lib/auth";
import { assertUserQuota, TenantQuotaError } from "@/lib/tenant-quota";
import { Role, UserStatus, ContractType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Rôles critiques nécessitant workflow DG
const CRITICAL_ROLES: Role[] = [Role.DG, Role.SUPER_ADMIN, Role.TENANT_ADMIN];

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
