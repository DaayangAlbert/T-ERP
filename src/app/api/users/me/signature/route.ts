import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateSignatureSchema } from "@/schemas/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sig = await prisma.userSignature.findUnique({ where: { userId: session.sub } });
  return NextResponse.json(
    sig ?? { signatureUrl: null, initialsUrl: null, uploadedAt: null }
  );
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updateSignatureSchema.parse(await req.json());
    await prisma.userSignature.upsert({
      where: { userId: session.sub },
      update: {
        signatureUrl: data.signatureUrl,
        initialsUrl: data.initialsUrl,
        uploadedAt: new Date(),
      },
      create: {
        userId: session.sub,
        signatureUrl: data.signatureUrl,
        initialsUrl: data.initialsUrl,
        uploadedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId ?? "",
        userId: session.sub,
        action: "user.signature.update",
        entityType: "UserSignature",
        entityId: session.sub,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
