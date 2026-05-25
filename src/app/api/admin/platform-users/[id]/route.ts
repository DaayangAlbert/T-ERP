import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdminApi } from "@/lib/admin-session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Détail d'un utilisateur de la plateforme (tous tenants + candidats).
 * Réservé à la console plateforme. N'expose pas les données salariales
 * (privées au tenant).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = guardAdminApi();
  if (!guard.ok) return guard.response;

  const u = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      personalEmail: true,
      phone: true,
      phoneMobile: true,
      avatarUrl: true,
      role: true,
      status: true,
      position: true,
      department: true,
      address: true,
      dateOfBirth: true,
      tenantId: true,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      // Emploi
      matricule: true,
      employeeId: true,
      hireDate: true,
      contractType: true,
      assignedSiteIds: true,
      // Candidat
      desiredJob: true,
      desiredContractType: true,
      desiredLocation: true,
      availability: true,
      cvUrl: true,
      candidateSkills: true,
      gdprConsent: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const isCandidate = u.role === Role.CANDIDATE;

  const [tenant, sites, applications] = await Promise.all([
    u.tenantId
      ? prisma.tenant.findUnique({ where: { id: u.tenantId }, select: { id: true, name: true, slug: true, status: true } })
      : Promise.resolve(null),
    u.assignedSiteIds.length
      ? prisma.site.findMany({ where: { id: { in: u.assignedSiteIds } }, select: { id: true, code: true, name: true } })
      : Promise.resolve([]),
    isCandidate
      ? prisma.application.findMany({
          where: { userId: u.id },
          orderBy: { appliedAt: "desc" },
          take: 20,
          select: { id: true, stage: true, appliedAt: true, jobOffer: { select: { title: true, tenant: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    personalEmail: u.personalEmail,
    phone: u.phone,
    phoneMobile: u.phoneMobile,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    position: u.position,
    department: u.department,
    address: u.address,
    dateOfBirth: u.dateOfBirth?.toISOString() ?? null,
    twoFactorEnabled: u.twoFactorEnabled,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    isCandidate,
    tenant,
    employment: isCandidate
      ? null
      : {
          matricule: u.matricule,
          employeeId: u.employeeId,
          hireDate: u.hireDate?.toISOString() ?? null,
          contractType: u.contractType,
          sites: sites.map((s) => ({ code: s.code, name: s.name })),
        },
    candidate: isCandidate
      ? {
          desiredJob: u.desiredJob,
          desiredContractType: u.desiredContractType,
          desiredLocation: u.desiredLocation,
          availability: u.availability,
          cvUrl: u.cvUrl,
          skills: u.candidateSkills,
          gdprConsent: u.gdprConsent,
          applications: applications.map((a) => ({
            id: a.id,
            stage: a.stage,
            appliedAt: a.appliedAt.toISOString(),
            jobTitle: a.jobOffer?.title ?? "—",
            company: a.jobOffer?.tenant?.name ?? "—",
          })),
        }
      : null,
  });
}
