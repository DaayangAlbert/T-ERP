/**
 * Génère et renvoie le PDF du contrat (5 templates : CDI/CDD/STAGE/JOURNALIER/PRESTATAIRE).
 *
 * Accessible par :
 *   - RH / DG / DAF / TENANT_ADMIN
 *   - Le salarié lui-même (pour télécharger son propre contrat)
 *
 * Le contenu reflète l'état courant (statut, signatures). Le PDF est rendu
 * à la volée — ce n'est pas l'URL stockée dans contract.pdfUrl (laquelle
 * pointe vers le snapshot signé archivé).
 */
import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { ContractPDF, type ContractPdfData } from "@/components/rh/contracts/ContractPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const contract = await prisma.employmentContract.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          email: true,
          phone: true,
          cnpsNumber: true,
          niu: true,
          employeeProfile: { select: { identityCard: true, address: true, familyStatus: true } },
        },
      },
    },
  });
  if (!contract) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const READ_ROLES: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];
  const canRead = contract.userId === session.sub || READ_ROLES.includes(session.role as Role);
  if (!canRead) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      name: true,
      legalForm: true,
      taxId: true,
      contactAddress: true,
      drhSignatoryName: true,
    },
  });

  const data: ContractPdfData = {
    reference: contract.reference,
    type: contract.type as ContractPdfData["type"],
    jobTitle: contract.jobTitle,
    professionalCategory: contract.professionalCategory,
    baseSalary: Number(contract.baseSalary),
    trialPeriodDays: contract.trialPeriodDays,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate?.toISOString() ?? null,
    workLocation: contract.workLocation,
    workingHours: contract.workingHours,
    benefits: (contract.benefits as string[]) ?? [],
    customClauses: (contract.customClauses as Array<{ title: string; body: string }>) ?? [],
    internshipSchool: contract.internshipSchool,
    internshipTutor: contract.internshipTutor,
    providerCompanyName: contract.providerCompanyName,
    providerRccm: contract.providerRccm,
    providerNiu: contract.providerNiu,
    dailyRate: contract.dailyRate ? Number(contract.dailyRate) : null,
    cdiMotive: contract.cdiMotive,
    employerSignedAt: contract.employerSignedAt?.toISOString() ?? null,
    employerSignatureText: contract.employerSignatureText,
    employeeSignedAt: contract.employeeSignedAt?.toISOString() ?? null,
    employeeSignatureText: contract.employeeSignatureText,
    employee: {
      fullName: `${contract.user.firstName} ${contract.user.lastName}`.trim(),
      matricule: contract.user.matricule,
      cnpsNumber: contract.user.cnpsNumber,
      niu: contract.user.niu,
      identityCard: contract.user.employeeProfile?.identityCard ?? null,
      address: (contract.user.employeeProfile?.address as ContractPdfData["employee"]["address"]) ?? null,
      familyStatus: contract.user.employeeProfile?.familyStatus ?? null,
      phone: contract.user.phone,
      email: contract.user.email,
    },
    company: {
      name: tenant?.name ?? "Entreprise",
      legalForm: tenant?.legalForm ?? undefined,
      niu: tenant?.taxId ?? undefined,
      address: tenant?.contactAddress ?? undefined,
      represented: tenant?.drhSignatoryName ?? undefined,
    },
  };

  try {
    const element = createElement(ContractPDF, { data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `contrat_${contract.reference}_${contract.user.lastName}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/rh/contracts/:id/pdf]", err);
    return NextResponse.json(
      { error: "Génération du contrat échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
