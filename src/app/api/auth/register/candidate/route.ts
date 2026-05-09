import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { registerCandidateSchema } from "@/schemas/auth";
import { Role, UserStatus } from "@prisma/client";
import { ZodError } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerCandidateSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName,
        lastName,
        phone: data.phone || null,
        position: data.desiredJob || null,
        passwordHash,
        role: Role.CANDIDATE,
        status: UserStatus.ACTIVE,
        tenantId: null,
        emailVerified: false,
      },
    });

    setAuthCookies({
      sub: user.id,
      tenantId: null,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/auth/register/candidate]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
