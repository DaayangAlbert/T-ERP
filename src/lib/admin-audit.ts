import { headers } from "next/headers";
import {
  type GlobalAuditAction,
  type PlatformAdminRole,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminJwtPayload } from "@/lib/admin-auth";

/**
 * Enregistre une action super-admin dans GlobalAuditLog (append-only).
 * Best-effort : ne bloque pas l'action métier si l'insertion échoue.
 */
export async function logAdminAction(args: {
  session: AdminJwtPayload;
  action: GlobalAuditAction;
  targetType: string;
  targetId?: string;
  targetDescription?: string;
  tenantId?: string;
  justification?: string;
  ticketReference?: string;
  beforeState?: unknown;
  afterState?: unknown;
}) {
  const h = headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const userAgent = h.get("user-agent") ?? null;
  try {
    await prisma.globalAuditLog.create({
      data: {
        platformAdminId: args.session.sub,
        actorEmail: args.session.email,
        actorRole: args.session.role as PlatformAdminRole,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId ?? null,
        targetDescription: args.targetDescription ?? null,
        tenantId: args.tenantId ?? null,
        ipAddress,
        userAgent,
        justification: args.justification ?? null,
        ticketReference: args.ticketReference ?? null,
        beforeState: args.beforeState
          ? (args.beforeState as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        afterState: args.afterState
          ? (args.afterState as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    console.error("[admin-audit] insert failed", e);
  }
}
