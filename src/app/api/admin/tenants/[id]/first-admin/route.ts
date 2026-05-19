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

  const existingAdmin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: Role.TENANT_ADMIN },
    select: { id: true, email: true },
  });
  if (existingAdmin) {
    return NextResponse.json(
      {
        error: "Un administrateur existe déjà pour ce tenant",
        existingEmail: existingAdmin.email,
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
      position: data.position ?? "Administrateur",
      role: Role.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: false,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  await logAdminAction({
    session,
    action: "CONFIG_MODIFIED",
    targetType: "User",
    targetId: created.id,
    targetDescription: `1er admin ${tenant.slug} : ${created.email}`,
    tenantId: tenant.id,
    afterState: { role: Role.TENANT_ADMIN, email: created.email },
  });

  return NextResponse.json(
    {
      ok: true,
      user: created,
      initialPassword,
      message:
        "Compte créé. Communiquez ce mot de passe au client par canal sécurisé — il devra le changer à la première connexion.",
    },
    { status: 201 },
  );
}
