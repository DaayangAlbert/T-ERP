import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { setAuthCookies } from "@/lib/cookies";
import { loginSchema } from "@/schemas/auth";
import { lookupUserByIdentifier } from "@/lib/login-lookup";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = loginSchema.parse(body);

    const lookup = await lookupUserByIdentifier(identifier, "candidate");
    if (!lookup.ok) {
      const msg =
        lookup.reason === "ambiguous"
          ? "Ce numéro est partagé entre plusieurs comptes — connectez-vous avec votre email."
          : "Identifiants invalides";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: lookup.userId } });
    if (!user || user.status !== "ACTIVE" || user.role !== "CANDIDATE") {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 },
      );
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 },
      );
    }

    setAuthCookies({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      type: "candidate",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cand/auth/login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
