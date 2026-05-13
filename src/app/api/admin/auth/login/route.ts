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

  // MFA OTP (stub MVP) — si activé, on demande l'OTP. Vrai TOTP en V2.
  if (admin.mfaEnabled) {
    if (!otp) {
      return NextResponse.json(
        { error: "Code MFA requis", needsOtp: true },
        { status: 401 },
      );
    }
    // En MVP : on accepte un code constant "123456" si mfaSecret == "DEMO"
    // (à remplacer par speakeasy.totp.verify en V2)
    if (!(admin.mfaSecret === "DEMO" && otp === "123456")) {
      return NextResponse.json(
        { error: "Code MFA invalide", needsOtp: true },
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
