import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { comparePassword, hashPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/schemas/user";

export async function PUT(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PUT /api/users/me/password]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
