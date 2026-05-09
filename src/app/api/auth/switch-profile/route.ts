import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { setAuthCookies } from "@/lib/cookies";

const bodySchema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Indisponible en production" }, { status: 403 });
  }

  const session = getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!target || target.status !== "ACTIVE") {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Demo guardrail: only allow swapping inside the same tenant (or both tenant-less)
  if (target.tenantId !== session.tenantId) {
    return NextResponse.json(
      { error: "Le switch de profil démo reste limité au même tenant" },
      { status: 403 }
    );
  }

  setAuthCookies({
    sub: target.id,
    tenantId: target.tenantId,
    role: target.role,
    email: target.email,
  });

  return NextResponse.json({
    user: {
      id: target.id,
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      role: target.role,
      tenantId: target.tenantId,
      avatarUrl: target.avatarUrl,
    },
  });
}
