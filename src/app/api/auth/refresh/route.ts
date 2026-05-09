import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import { getRefreshCookie, setAuthCookies } from "@/lib/cookies";

export async function POST() {
  const refresh = getRefreshCookie();
  if (!refresh) {
    return NextResponse.json({ error: "Refresh token absent" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJwt(refresh);
  } catch {
    return NextResponse.json({ error: "Refresh token invalide" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Compte inactif" }, { status: 401 });
  }

  setAuthCookies({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
