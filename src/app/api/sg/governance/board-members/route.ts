import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const members = await prisma.boardMember.findMany({
    where: { tenantId, status: "ACTIVE" },
    orderBy: [{ function: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      function: true,
      representingEntity: true,
      isIndependent: true,
      mandateStartDate: true,
      mandateEndDate: true,
      mandateRenewable: true,
      biography: true,
    },
  });

  const now = new Date();
  return NextResponse.json({
    items: members.map((m) => {
      const daysToEndOfMandate = Math.ceil((m.mandateEndDate.getTime() - now.getTime()) / 86_400_000);
      return {
        id: m.id,
        fullName: m.fullName,
        function: m.function,
        representingEntity: m.representingEntity,
        isIndependent: m.isIndependent,
        mandateStartDate: m.mandateStartDate.toISOString(),
        mandateEndDate: m.mandateEndDate.toISOString(),
        mandateRenewable: m.mandateRenewable,
        biography: m.biography,
        daysToEndOfMandate,
        mandateStatus:
          daysToEndOfMandate < 0
            ? "EXPIRED"
            : daysToEndOfMandate <= 90
              ? "EXPIRING_SOON"
              : "ACTIVE",
      };
    }),
  });
}
