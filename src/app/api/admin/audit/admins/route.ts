import { NextResponse } from "next/server";
import { z } from "zod";
import { PlatformAdminRole, PlatformAdminStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { hashAdminPassword } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const admins = await prisma.platformAdmin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      mfaEnabled: true,
      whitelistedIps: true,
      canCreateTenants: true,
      canSuspendTenants: true,
      canDeleteTenants: true,
      canManageBilling: true,
      canManagePlatformConfig: true,
      canViewAllTenantsData: true,
      canManageGlobalIntegrations: true,
      canViewGlobalAudit: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    admins: admins.map((a) => ({
      ...a,
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.nativeEnum(PlatformAdminRole),
  password: z.string().min(12).max(120),
  whitelistedIps: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  if (session.role !== "CTO") {
    return NextResponse.json(
      { error: "Réservé CTO" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.platformAdmin.findUnique({
    where: { email: d.email },
  });
  if (existing)
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const passwordHash = await hashAdminPassword(d.password);
  const isBilling = d.role === PlatformAdminRole.BILLING_ADMIN;
  const isCompliance = d.role === PlatformAdminRole.COMPLIANCE_OFFICER;
  const admin = await prisma.platformAdmin.create({
    data: {
      email: d.email,
      passwordHash,
      firstName: d.firstName,
      lastName: d.lastName,
      role: d.role,
      whitelistedIps: d.whitelistedIps,
      status: PlatformAdminStatus.ACTIVE,
      canManageBilling: isBilling || d.role === "CTO",
      canViewAllTenantsData: d.role === "CTO" || d.role === "SUPPORT_L3",
      canViewGlobalAudit: isCompliance || d.role === "CTO",
      canCreateTenants: d.role === "CTO",
      canSuspendTenants: d.role === "CTO",
      canDeleteTenants: d.role === "CTO",
      canManagePlatformConfig: d.role === "CTO",
      canManageGlobalIntegrations: d.role === "CTO",
      createdBy: session.sub,
    },
    select: { id: true, email: true },
  });

  await logAdminAction({
    session,
    action: "ADMIN_CREATED",
    targetType: "PlatformAdmin",
    targetId: admin.id,
    targetDescription: `${admin.email} · ${d.role}`,
  });

  return NextResponse.json({ ok: true, adminId: admin.id }, { status: 201 });
}
