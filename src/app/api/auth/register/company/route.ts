import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { registerCompanySchema } from "@/schemas/auth";
import { ensureUniqueSlug, isReservedSlug } from "@/lib/slug";
import { Plan, Role, TenantStatus, UserStatus } from "@prisma/client";
import { ZodError } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerCompanySchema.parse(body);

    if (isReservedSlug(data.slug)) {
      return NextResponse.json({ error: "Sous-domaine réservé" }, { status: 400 });
    }

    const slugTaken = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (slugTaken) {
      const suggested = await ensureUniqueSlug(data.slug);
      return NextResponse.json(
        { error: "Sous-domaine déjà pris", suggested },
        { status: 409 }
      );
    }

    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: data.slug,
          name: data.companyName,
          taxId: data.taxId,
          cnpsId: data.cnpsId || null,
          plan: data.plan as Plan,
          status: TenantStatus.TRIAL,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          firstName,
          lastName,
          position: data.position || "Administrateur informatique",
          passwordHash,
          role: Role.TENANT_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: false,
        },
      });

      return { tenant, user };
    });

    setAuthCookies({
      sub: result.user.id,
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      role: result.user.role,
      email: result.user.email,
    });

    return NextResponse.json(
      {
        tenant: {
          id: result.tenant.id,
          slug: result.tenant.slug,
          name: result.tenant.name,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/auth/register/company]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
