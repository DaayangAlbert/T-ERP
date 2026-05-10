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

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const sp = await prisma.userSignaturePower.findUnique({ where: { userId: session.sub } });
  return NextResponse.json({
    items: ((sp?.proxyHolders as unknown as ProxyHolder[]) ?? []).filter((p) => p.active),
    history: ((sp?.proxyHolders as unknown as ProxyHolder[]) ?? []).filter((p) => !p.active),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    toUserId?: string;
    scope?: string;
    maxAmount?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!body.toUserId) return NextResponse.json({ error: "Délégataire requis" }, { status: 400 });
  if (!body.startDate) return NextResponse.json({ error: "Date début requise" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: body.toUserId },
    select: { firstName: true, lastName: true, position: true },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const sp = await prisma.userSignaturePower.findUnique({ where: { userId: session.sub } });
  const existing = (sp?.proxyHolders as unknown as ProxyHolder[]) ?? [];

  const newProxy: ProxyHolder = {
    id: `prx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    toUserId: body.toUserId,
    name: `${target.firstName} ${target.lastName}`,
    position: target.position ?? null,
    scope: body.scope ?? "Signature bancaire chèques courants",
    maxAmount: body.maxAmount ?? null,
    startDate: body.startDate,
    endDate: body.endDate ?? null,
    active: true,
  };

  if (sp) {
    await prisma.userSignaturePower.update({
      where: { userId: session.sub },
      data: { proxyHolders: [...existing, newProxy] as object },
    });
  } else {
    await prisma.userSignaturePower.create({
      data: {
        userId: session.sub,
        banksRegistered: ["UBA", "BICEC", "AFRILAND", "ECOBANK", "SGBC"],
        proxyHolders: [newProxy] as object,
      },
    });
  }

  return NextResponse.json({ id: newProxy.id, ok: true });
}

export async function DELETE(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const sp = await prisma.userSignaturePower.findUnique({ where: { userId: session.sub } });
  if (!sp) return NextResponse.json({ ok: true });

  const updated = ((sp.proxyHolders as unknown as ProxyHolder[]) ?? []).map((p) =>
    p.id === id ? { ...p, active: false, endDate: new Date().toISOString() } : p
  );
  await prisma.userSignaturePower.update({
    where: { userId: session.sub },
    data: { proxyHolders: updated as object },
  });

  return NextResponse.json({ ok: true });
}
