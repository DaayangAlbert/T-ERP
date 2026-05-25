import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { GlobalAuditAction, PlatformAdminRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(2000),
  link: z.string().max(300).optional(),
});

/**
 * Le super admin envoie un message in-app à un utilisateur (employé ou
 * chercheur d'emploi). Le message arrive dans le centre de notifications
 * de l'utilisateur. Tracé dans le journal d'audit global.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, firstName: true, lastName: true, tenantId: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  try {
    const data = messageSchema.parse(await req.json());

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "platform_message",
        title: data.title.trim(),
        body: data.body.trim(),
        link: data.link?.trim() || null,
      },
    });

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    await prisma.globalAuditLog.create({
      data: {
        platformAdminId: session.sub,
        actorEmail: session.email,
        actorRole: session.role as PlatformAdminRole,
        action: GlobalAuditAction.CROSS_TENANT_ACCESS,
        targetType: "User",
        targetId: user.id,
        targetDescription: `Message à ${user.firstName} ${user.lastName}`,
        tenantId: user.tenantId,
        ipAddress,
        userAgent: req.headers.get("user-agent") ?? undefined,
        justification: data.title.trim(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/admin/platform-users/:id/message]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
