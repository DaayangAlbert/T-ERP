import { NextResponse } from "next/server";
import { ZodError } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { setAuthCookies } from "@/lib/cookies";
import { ouvLoginSchema } from "@/schemas/auth";
import { normalizeCmPhone } from "@/lib/ouv/phone";

// Anti brute-force : 5 tentatives consécutives mauvaises → blocage 1h.
// Le compteur (pinFailedAttempts) et la deadline (pinLockedUntil) sont
// stockés sur User. Réinitialisés à la première bonne saisie.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 60;

const GENERIC_ERROR = "Téléphone ou PIN incorrect";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, pin } = ouvLoginSchema.parse(body);

    const normalized = normalizeCmPhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Lookup user par téléphone (ouvriers WORKER avec PIN configuré uniquement)
    const user = await prisma.user.findFirst({
      where: {
        phone: normalized,
        role: "WORKER",
        status: "ACTIVE",
        pinHash: { not: null },
      },
      include: { tenant: { select: { slug: true } } },
    });

    // Réponse générique pour ne pas révéler l'existence du compte
    if (!user || !user.pinHash) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Vérif lockout actif
    const now = new Date();
    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      const minutesLeft = Math.ceil(
        (user.pinLockedUntil.getTime() - now.getTime()) / 60_000
      );
      return NextResponse.json(
        {
          error: `Compte bloqué — réessayez dans ${minutesLeft} min`,
          lockedUntil: user.pinLockedUntil.toISOString(),
        },
        { status: 429 }
      );
    }

    // Vérif PIN
    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) {
      const newAttempts = user.pinFailedAttempts + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pinFailedAttempts: shouldLock ? 0 : newAttempts,
          pinLockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
        },
      });
      if (shouldLock) {
        // TODO: déclencher alerte WhatsApp au Chef Chantier (fn 1.2 livrera l'intégration)
        return NextResponse.json(
          {
            error: `Compte bloqué ${LOCKOUT_MINUTES} min — 5 essais ratés`,
            lockedMinutes: LOCKOUT_MINUTES,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: GENERIC_ERROR,
          attemptsLeft: MAX_ATTEMPTS - newAttempts,
        },
        { status: 401 }
      );
    }

    // Succès : reset compteur + session JWT
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        lastLoginAt: now,
      },
    });

    setAuthCookies({
      sub: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug ?? null,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug ?? null,
        avatarUrl: user.avatarUrl,
        matricule: user.matricule,
        workerQualification: user.workerQualification,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/auth/ouv-login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
