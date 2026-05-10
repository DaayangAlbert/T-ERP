import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

interface ProxyHolder {
  id: string;
  toUserId: string;
  name: string;
  position?: string | null;
  scope?: string | null;
  maxAmount?: string | null;
  startDate: string;
  endDate?: string | null;
  active: boolean;
}

async function ensure(userId: string) {
  const existing = await prisma.userSignaturePower.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSignaturePower.create({
    data: { userId, banksRegistered: ["UBA", "BICEC", "AFRILAND", "ECOBANK", "SGBC"] },
  });
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const sp = await ensure(session.sub);

  // Résoudre les noms des cosignataires
  const cosigners = sp.coSigners.length
    ? await prisma.user.findMany({
        where: { id: { in: sp.coSigners } },
        select: { id: true, firstName: true, lastName: true, role: true, position: true },
      })
    : [];

  return NextResponse.json({
    soloLimit: sp.soloLimit.toString(),
    coSignLimit: sp.coSignLimit.toString(),
    coSigners: cosigners.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      role: c.role,
      position: c.position,
    })),
    banksRegistered: sp.banksRegistered,
    proxyHolders: (sp.proxyHolders as unknown as ProxyHolder[]) ?? [],
  });
}

export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    soloLimit: string;
    coSignLimit: string;
    coSigners: string[];
    banksRegistered: string[];
  }>;

  await ensure(session.sub);
  await prisma.userSignaturePower.update({
    where: { userId: session.sub },
    data: {
      ...(body.soloLimit !== undefined && { soloLimit: BigInt(body.soloLimit) }),
      ...(body.coSignLimit !== undefined && { coSignLimit: BigInt(body.coSignLimit) }),
      ...(body.coSigners !== undefined && { coSigners: body.coSigners }),
      ...(body.banksRegistered !== undefined && { banksRegistered: body.banksRegistered }),
    },
  });

  return NextResponse.json({ ok: true });
}
