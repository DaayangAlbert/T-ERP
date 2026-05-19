import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt, isProtectedTarget } from "@/lib/rbac/it-guard";
import { UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  assignedSiteIds: z.array(z.string()).optional(),
  // Champs étendus pour cohérence avec le formulaire de création
  category: z.string().nullable().optional(),
  contractType: z.string().nullable().optional(),
  hireDate: z.string().nullable().optional(), // ISO string ou null
  matricule: z.string().nullable().optional(),
  professionalCategory: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  cniNumber: z.string().nullable().optional(),
  phoneMobile: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  familyStatus: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  cnpsNumber: z.string().nullable().optional(),
  niu: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  rib: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
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
      category: true,
      contractType: true,
      hireDate: true,
      twoFactorEnabled: true,
      assignedSiteIds: true,
      lastLoginAt: true,
      createdAt: true,
      canManageUsers: true,
      canManageRoles: true,
      canManageTenantSettings: true,
      canManageIntegrations: true,
      canViewTechnicalLogs: true,
      // Identité personnelle
      matricule: true,
      professionalCategory: true,
      dateOfBirth: true,
      cniNumber: true,
      phoneMobile: true,
      personalEmail: true,
      address: true,
      familyStatus: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      // Légal & bancaire
      cnpsNumber: true,
      niu: true,
      bankName: true,
      bankAgency: true,
      rib: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const [sessions, audit] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() }, revokedAt: null },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      hireDate: user.hireDate?.toISOString() ?? null,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      location: s.location,
      lastActivityAt: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      suspicious: s.suspicious,
    })),
    auditLog: audit.map((a) => ({
      id: a.id,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
      entityType: a.entityType,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt("canManageUsers");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Garde-fou : ne pas modifier un compte protégé (DG, SUPER_ADMIN, autre TENANT_ADMIN)
  const protectedCheck = await isProtectedTarget(params.id);
  if (protectedCheck.blocked) {
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "it.user.modify.blocked",
        entityType: "User",
        entityId: params.id,
        metadata: { reason: protectedCheck.reason },
      },
    });
    return NextResponse.json({ error: protectedCheck.reason }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const before = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { firstName: true, lastName: true, phone: true, position: true, status: true, assignedSiteIds: true },
  });
  if (!before) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Convertir les dates ISO en Date pour Prisma
  const { hireDate, dateOfBirth, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (hireDate !== undefined) {
    updateData.hireDate = hireDate ? new Date(hireDate) : null;
  }
  if (dateOfBirth !== undefined) {
    updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "it.user.update",
      entityType: "User",
      entityId: params.id,
      metadata: { before, after: parsed.data },
    },
  });

  return NextResponse.json(updated);
}
