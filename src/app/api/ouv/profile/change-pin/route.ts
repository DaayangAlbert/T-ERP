import { NextResponse } from "next/server";
import { ZodError } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { changePinSchema } from "@/schemas/ouv-profile";

export const dynamic = "force-dynamic";

// POST /api/ouv/profile/change-pin { currentPin, newPin }
// Vérifie le PIN actuel via bcrypt + remplace par le nouveau hashé.
// Reset aussi le compteur brute-force (pinFailedAttempts) et débloque
// si jamais l'ouvrier avait été lock.
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = changePinSchema.parse(body);

    if (input.currentPin === input.newPin) {
      return NextResponse.json(
        { error: "Le nouveau PIN doit être différent de l'ancien", code: "SAME_PIN" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { pinHash: true },
    });
    if (!user?.pinHash) {
      return NextResponse.json(
        { error: "Aucun PIN configuré — contacte RH", code: "NO_PIN_SET" },
        { status: 409 }
      );
    }

    const ok = await bcrypt.compare(input.currentPin, user.pinHash);
    if (!ok) {
      return NextResponse.json(
        { error: "PIN actuel incorrect", code: "INVALID_CURRENT_PIN" },
        { status: 401 }
      );
    }

    const newHash = await bcrypt.hash(input.newPin, 12);
    await prisma.user.update({
      where: { id: session.sub },
      data: {
        pinHash: newHash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });

    return NextResponse.json({ ok: true, message: "PIN modifié — utilise le nouveau dès maintenant" });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/profile/change-pin]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
