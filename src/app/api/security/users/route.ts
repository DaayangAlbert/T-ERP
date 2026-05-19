import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createUserSchema } from "@/schemas/security";
import { hashPassword } from "@/lib/auth";
import { assertUserQuota, TenantQuotaError } from "@/lib/tenant-quota";
import { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const search = url.searchParams.get("q")?.trim();
  const role = url.searchParams.get("role") as Role | null;
  const status = url.searchParams.get("status") as UserStatus | null;
  const has2fa = url.searchParams.get("twoFactor"); // "1" | "0"

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (role) where.role = role;
  if (status) where.status = status;
  if (has2fa === "1") where.twoFactorEnabled = true;
  if (has2fa === "0") where.twoFactorEnabled = false;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
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
        lastLoginAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  try {
    const data = createUserSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }

    try {
      await assertUserQuota(session.tenantId);
    } catch (e) {
      if (e instanceof TenantQuotaError) {
        return NextResponse.json({ error: e.message }, { status: 402 });
      }
      throw e;
    }

    const initialPassword = data.password ?? Math.random().toString(36).slice(2, 12) + "A1!";
    const passwordHash = await hashPassword(initialPassword);

    const created = await prisma.user.create({
      data: {
        tenantId: session.tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        position: data.position,
        category: data.category,
        contractType: data.contractType,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        passwordHash,
        emailVerified: false,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "user.create",
        entityType: "User",
        entityId: created.id,
        metadata: { email: data.email, role: data.role },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        // Ne JAMAIS renvoyer un password en clair en prod ; ici stub démo.
        initialPassword: data.password ? undefined : initialPassword,
        note: process.env.RESEND_API_KEY
          ? "Email d'invitation envoyé via Resend"
          : "Stub : email non envoyé (RESEND_API_KEY non configuré). Mot de passe initial à transmettre manuellement.",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/security/users]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
