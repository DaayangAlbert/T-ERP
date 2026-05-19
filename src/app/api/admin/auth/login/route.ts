import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compareAdminPassword } from "@/lib/admin-auth";
import { setAdminCookie } from "@/lib/admin-cookies";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }
  const { email, password, otp } = parsed.data;

  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }
  const ok = await compareAdminPassword(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  // MFA OTP — vrai TOTP en V2. Le stub "DEMO/123456" n'est plus accepté
  // en production : refuser le login si on rencontre un mfaSecret=DEMO en prod.
  if (admin.mfaEnabled) {
    if (!otp) {
      return NextResponse.json(
        { error: "Code MFA requis", needsOtp: true },
        { status: 401 },
      );
    }
    const isProd = process.env.NODE_ENV === "production";
    if (admin.mfaSecret === "DEMO") {
      if (isProd) {
        console.error(`[admin-login] Compte ${admin.email} a mfaSecret=DEMO en prod — refus.`);
        return NextResponse.json(
          { error: "MFA non configuré pour ce compte — contactez le support" },
          { status: 401 },
        );
      }
      // Dev/staging only : on accepte le code magique "123456"
      if (otp !== "123456") {
        return NextResponse.json(
          { error: "Code MFA invalide", needsOtp: true },
          { status: 401 },
        );
      }
    } else {
      // TODO V2 : speakeasy.totp.verify({ secret: admin.mfaSecret, token: otp })
      // Pour l'instant on refuse tout autre secret faute d'implémentation TOTP.
      return NextResponse.json(
        { error: "MFA non implémenté pour ce compte — contactez le support" },
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
    session: { sub: admin.id, email: admin.email, role: admin.role, aud: "platform-admin" },
    action: "AUTH_MFA_SUCCESS",
    targetType: "PlatformAdmin",
    targetId: admin.id,
    targetDescription: admin.email,
  });

  return NextResponse.json({
    admin: {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
    },
  });
}
