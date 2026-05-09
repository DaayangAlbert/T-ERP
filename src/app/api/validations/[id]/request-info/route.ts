import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requestInfoSchema } from "@/schemas/validation";
import { appendComment } from "@/lib/validation-workflow";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { message } = requestInfoSchema.parse(await req.json());

    const validation = await prisma.validation.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      select: { id: true, comments: true, initiatorId: true, reference: true, title: true },
    });
    if (!validation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const newComments = appendComment(validation.comments, {
      type: "INFO_REQUEST",
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      message,
    });

    await prisma.validation.update({
      where: { id: validation.id },
      data: { comments: newComments as unknown as object },
    });

    // Notification à l'initiateur
    await prisma.notification.create({
      data: {
        userId: validation.initiatorId,
        type: "validation_info_request",
        title: `Complément demandé sur ${validation.reference}`,
        body: message,
        link: `/validations/${validation.id}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: user.id,
        action: "validation.request_info",
        entityType: "Validation",
        entityId: validation.id,
        metadata: { message },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/validations/:id/request-info]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
