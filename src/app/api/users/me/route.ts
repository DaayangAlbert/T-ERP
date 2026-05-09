import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateProfileSchema } from "@/schemas/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      employeeId: true,
      hireDate: true,
      position: true,
      category: true,
      cnpsNumber: true,
      contractType: true,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: true,
      tenant: { select: { id: true, slug: true, name: true, primaryColor: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updateProfileSchema.parse(await req.json());
    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: {
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PUT /api/users/me]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
