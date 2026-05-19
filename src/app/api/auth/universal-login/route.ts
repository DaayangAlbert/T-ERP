import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { compareAdminPassword } from "@/lib/admin-auth";
import { setAuthCookies } from "@/lib/cookies";
import { setAdminCookie } from "@/lib/admin-cookies";
import { logAdminAction } from "@/lib/admin-audit";
import { loginSchema } from "@/schemas/auth";
import { lookupUserByIdentifier } from "@/lib/login-lookup";
import { isEmailLike } from "@/lib/phone-normalize";

export const dynamic = "force-dynamic";

const universalSchema = loginSchema.extend({
  otp: z.string().optional(),
});

/**
 * Endpoint d'auth unifié — résout automatiquement le type de compte
 * (PlatformAdmin, User employé, ou User candidat) à partir de l'identifiant
 * et du mot de passe, puis renvoie l'URL de redirection vers l'espace
 * correspondant.
 *
 * Ordre d'essai :
 *   1. PlatformAdmin (uniquement si identifier est un email — pas de phone
 *      pour les super-admins). Supporte MFA.
 *   2. User (table unique pour employés tenant + candidats externes).
 *      Le role détermine la redirection.
 *
 * Réponses :
 *   200 + { type, redirectUrl, user } sur succès
 *   401 + { error, needsOtp? } sur échec
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password, otp } = universalSchema.parse(body);

    // 1. PlatformAdmin (uniquement par email)
    if (isEmailLike(identifier)) {
      const admin = await prisma.platformAdmin.findUnique({
        where: { email: identifier.toLowerCase() },
      });
      if (admin && admin.status === "ACTIVE") {
        const passwordOk = await compareAdminPassword(password, admin.passwordHash);
        if (passwordOk) {
          if (admin.mfaEnabled) {
            if (!otp) {
              return NextResponse.json(
                { error: "Code MFA requis", needsOtp: true },
                { status: 401 },
              );
            }
            // Stub DEMO refusé en production (sécurité).
            const isProd = process.env.NODE_ENV === "production";
            if (admin.mfaSecret === "DEMO") {
              if (isProd) {
                console.error(`[universal-login] ${admin.email} mfaSecret=DEMO en prod — refus.`);
                return NextResponse.json(
                  { error: "MFA non configuré — contactez le support" },
                  { status: 401 },
                );
              }
              if (otp !== "123456") {
                return NextResponse.json(
                  { error: "Code MFA invalide", needsOtp: true },
                  { status: 401 },
                );
              }
            } else {
              // TODO V2 : speakeasy.totp.verify({ secret: admin.mfaSecret, token: otp })
              return NextResponse.json(
                { error: "MFA non implémenté — contactez le support" },
                { status: 401 },
              );
            }
          }

          setAdminCookie({
            sub: admin.id,
            email: admin.email,
            role: admin.role,
          });
          await prisma.platformAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
          });
          await logAdminAction({
            session: {
              sub: admin.id,
              email: admin.email,
              role: admin.role,
              aud: "platform-admin",
            },
            action: "AUTH_MFA_SUCCESS",
            targetType: "PlatformAdmin",
            targetId: admin.id,
            targetDescription: admin.email,
          });

          return NextResponse.json({
            type: "platformAdmin",
            redirectUrl: "/admin",
            user: {
              id: admin.id,
              email: admin.email,
              firstName: admin.firstName,
              lastName: admin.lastName,
              role: admin.role,
            },
          });
        }
      }
    }

    // 2. User (employé ou candidat) — pas de scope pour accepter les deux
    const lookup = await lookupUserByIdentifier(identifier);
    if (!lookup.ok) {
      const msg =
        lookup.reason === "ambiguous"
          ? "Ce numéro est partagé entre plusieurs comptes — connectez-vous avec votre email."
          : "Identifiants invalides";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: lookup.userId },
      include: { tenant: { select: { slug: true } } },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const passwordOk = await comparePassword(password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const isCandidate = user.role === "CANDIDATE";

    setAuthCookies({
      sub: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug ?? null,
      role: user.role,
      email: user.email,
      type: isCandidate ? "candidate" : undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      type: isCandidate ? "candidate" : "user",
      redirectUrl: isCandidate
        ? "/cand/dashboard"
        : user.tenant?.slug
          ? `/${user.tenant.slug}/dashboard`
          : "/",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug ?? null,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/universal-login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
