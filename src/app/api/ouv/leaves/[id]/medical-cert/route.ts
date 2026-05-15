import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { medicalCertUploadSchema } from "@/schemas/ouv-leave";
import { LeaveType } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/leaves/:id/medical-cert — Upload tardif du certificat médical.
// Utile quand l'ouvrier signale d'abord (sans certif si < 3 jours) puis doit
// fournir le certif après prolongation par le médecin.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = medicalCertUploadSchema.parse(body);

    const lr = await prisma.leaveRequest.findFirst({
      where: { id: ctx.params.id, userId: session.sub },
      select: { id: true, type: true, status: true },
    });
    if (!lr) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    if (lr.type !== LeaveType.SICK) {
      return NextResponse.json(
        { error: "Cette demande n'est pas un arrêt maladie" },
        { status: 400 }
      );
    }

    await prisma.leaveRequest.update({
      where: { id: lr.id },
      data: { justificationDoc: input.medicalCert },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/leaves/:id/medical-cert]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
