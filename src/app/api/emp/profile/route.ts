import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      matricule: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      position: true,
      professionalCategory: true,
      hireDate: true,
      teamLeader: true,
      preferredLanguage: true,
      notificationChannel: true,
      phoneMobile: true,
      phone: true,
      assignedSiteIds: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const primarySiteId = user.assignedSiteIds[0];
  const assignedSite = primarySiteId
    ? await prisma.site.findUnique({
        where: { id: primarySiteId },
        select: { id: true, code: true, name: true },
      })
    : null;

  const seniorityYears = user.hireDate
    ? Math.floor((Date.now() - user.hireDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return NextResponse.json({
    employee: {
      id: user.id,
      matricule: user.matricule ?? user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      position: user.position,
      professionalCategory: user.professionalCategory,
      hireDate: user.hireDate,
      seniorityYears,
      teamLeader: user.teamLeader,
      preferredLanguage: user.preferredLanguage,
      notificationChannel: user.notificationChannel,
      phoneMobile: user.phoneMobile ?? user.phone,
      assignedSite,
    },
  });
}
