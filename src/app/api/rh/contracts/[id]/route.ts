/**
 * Contrat de travail — détail + modification + signature.
 *
 * GET   : renvoie le contrat avec tous les détails et l'employé.
 * PATCH : actions :
 *   - update DRAFT (modification des champs) tant que statut == DRAFT
 *   - generate-pdf : DRAFT → PENDING_SIGNATURE + URL du PDF (à fournir
 *     par le client après upload, ou calculée si on génère côté serveur)
 *   - sign-employer : marque la signature côté employeur
 *   - sign-employee : marque la signature côté salarié
 *     → quand les deux sont signées, statut passe à SIGNED puis on archive
 *       dans EmployeeDocument type CONTRACT
 *   - cancel : annule un brouillon (DRAFT → CANCELLED)
 *   - terminate : marque comme TERMINATED un contrat ACTIVE/SIGNED
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const WRITE_ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    jobTitle: z.string().min(2).optional(),
    professionalCategory: z.string().nullable().optional(),
    baseSalary: z.number().int().nonnegative().optional(),
    trialPeriodDays: z.number().int().min(0).max(180).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    workLocation: z.string().nullable().optional(),
    workingHours: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    customClauses: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
    internshipSchool: z.string().nullable().optional(),
    internshipTutor: z.string().nullable().optional(),
    providerCompanyName: z.string().nullable().optional(),
    providerRccm: z.string().nullable().optional(),
    providerNiu: z.string().nullable().optional(),
    dailyRate: z.number().int().nonnegative().nullable().optional(),
    cdiMotive: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("generate-pdf"),
    pdfUrl: z.string().min(1),
  }),
  z.object({
    action: z.literal("sign-employer"),
    signatureText: z.string().min(2),
  }),
  z.object({
    action: z.literal("sign-employee"),
    signatureText: z.string().min(2),
  }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("terminate"), reason: z.string().optional() }),
]);

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
          avatarUrl: true,
          email: true,
          phone: true,
          cnpsNumber: true,
          niu: true,
          hireDate: true,
          employeeProfile: { select: { identityCard: true, address: true, familyStatus: true } },
        },
      },
      draftedBy: { select: { id: true, firstName: true, lastName: true } },
      employerSigner: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!contract) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Le salarié lui-même peut lire son contrat
  const READ_ROLES: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN, Role.SUPER_ADMIN];
  const canRead = contract.userId === session.sub || READ_ROLES.includes(session.role as Role);
  if (!canRead) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  return NextResponse.json({
    id: contract.id,
    reference: contract.reference,
    type: contract.type,
    status: contract.status,
    jobTitle: contract.jobTitle,
    professionalCategory: contract.professionalCategory,
    baseSalary: Number(contract.baseSalary),
    trialPeriodDays: contract.trialPeriodDays,
    startDate: contract.startDate.toISOString().slice(0, 10),
    endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
    workLocation: contract.workLocation,
    workingHours: contract.workingHours,
    benefits: contract.benefits,
    customClauses: contract.customClauses,
    internshipSchool: contract.internshipSchool,
    internshipTutor: contract.internshipTutor,
    providerCompanyName: contract.providerCompanyName,
    providerRccm: contract.providerRccm,
    providerNiu: contract.providerNiu,
    dailyRate: contract.dailyRate ? Number(contract.dailyRate) : null,
    cdiMotive: contract.cdiMotive,
    notes: contract.notes,
    pdfUrl: contract.pdfUrl,
    employerSignedAt: contract.employerSignedAt?.toISOString() ?? null,
    employerSignatureText: contract.employerSignatureText,
    employeeSignedAt: contract.employeeSignedAt?.toISOString() ?? null,
    employeeSignatureText: contract.employeeSignatureText,
    archivedDocumentId: contract.archivedDocumentId,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    employee: {
      id: contract.user.id,
      fullName: `${contract.user.firstName} ${contract.user.lastName}`.trim(),
      firstName: contract.user.firstName,
      lastName: contract.user.lastName,
      matricule: contract.user.matricule,
      avatarUrl: contract.user.avatarUrl,
      email: contract.user.email,
      phone: contract.user.phone,
      cnpsNumber: contract.user.cnpsNumber,
      niu: contract.user.niu,
      hireDate: contract.user.hireDate?.toISOString().slice(0, 10) ?? null,
      identityCard: contract.user.employeeProfile?.identityCard ?? null,
      address: contract.user.employeeProfile?.address ?? null,
      familyStatus: contract.user.employeeProfile?.familyStatus ?? null,
    },
    draftedBy: contract.draftedBy ? `${contract.draftedBy.firstName} ${contract.draftedBy.lastName}`.trim() : null,
    employerSigner: contract.employerSigner ? `${contract.employerSigner.firstName} ${contract.employerSigner.lastName}`.trim() : null,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Données invalides", details: (err as Error).message }, { status: 400 });
  }

  const contract = await prisma.employmentContract.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!contract) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // sign-employee : seul le salarié concerné peut signer son contrat.
  // Toutes les autres actions sont réservées RH / DG / DAF.
  if (body.action === "sign-employee") {
    if (contract.userId !== session.sub) {
      return NextResponse.json({ error: "Vous ne pouvez signer que votre propre contrat" }, { status: 403 });
    }
  } else if (!WRITE_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  if (body.action === "update") {
    if (contract.status !== "DRAFT") {
      return NextResponse.json({ error: "Modification interdite hors brouillon" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: {
        ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
        ...(body.professionalCategory !== undefined ? { professionalCategory: body.professionalCategory } : {}),
        ...(body.baseSalary !== undefined ? { baseSalary: BigInt(body.baseSalary) } : {}),
        ...(body.trialPeriodDays !== undefined ? { trialPeriodDays: body.trialPeriodDays } : {}),
        ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.workLocation !== undefined ? { workLocation: body.workLocation } : {}),
        ...(body.workingHours !== undefined ? { workingHours: body.workingHours } : {}),
        ...(body.benefits !== undefined ? { benefits: body.benefits } : {}),
        ...(body.customClauses !== undefined ? { customClauses: body.customClauses } : {}),
        ...(body.internshipSchool !== undefined ? { internshipSchool: body.internshipSchool } : {}),
        ...(body.internshipTutor !== undefined ? { internshipTutor: body.internshipTutor } : {}),
        ...(body.providerCompanyName !== undefined ? { providerCompanyName: body.providerCompanyName } : {}),
        ...(body.providerRccm !== undefined ? { providerRccm: body.providerRccm } : {}),
        ...(body.providerNiu !== undefined ? { providerNiu: body.providerNiu } : {}),
        ...(body.dailyRate !== undefined ? { dailyRate: body.dailyRate ? BigInt(body.dailyRate) : null } : {}),
        ...(body.cdiMotive !== undefined ? { cdiMotive: body.cdiMotive } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
  } else if (body.action === "generate-pdf") {
    if (contract.status !== "DRAFT" && contract.status !== "PENDING_SIGNATURE") {
      return NextResponse.json({ error: "Génération PDF interdite après signature" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: { pdfUrl: body.pdfUrl, status: "PENDING_SIGNATURE" },
    });
  } else if (body.action === "sign-employer") {
    if (contract.status !== "PENDING_SIGNATURE" && contract.status !== "DRAFT") {
      return NextResponse.json({ error: "Signature impossible dans cet état" }, { status: 409 });
    }
    if (!contract.pdfUrl) {
      return NextResponse.json({ error: "Générez d'abord le PDF avant de signer" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: {
        employerSignedAt: new Date(),
        employerSignatureText: body.signatureText,
        employerSignerId: session.sub,
        // Si l'employé a déjà signé, le contrat passe à SIGNED puis archivage
        status: contract.employeeSignedAt ? "SIGNED" : "PENDING_SIGNATURE",
      },
    });
    if (contract.employeeSignedAt) await archiveContract(contract.id);
  } else if (body.action === "sign-employee") {
    if (contract.status !== "PENDING_SIGNATURE") {
      return NextResponse.json({ error: "Le contrat doit être généré et en attente" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: {
        employeeSignedAt: new Date(),
        employeeSignatureText: body.signatureText,
        status: contract.employerSignedAt ? "SIGNED" : "PENDING_SIGNATURE",
      },
    });
    if (contract.employerSignedAt) await archiveContract(contract.id);
  } else if (body.action === "cancel") {
    if (contract.status !== "DRAFT" && contract.status !== "PENDING_SIGNATURE") {
      return NextResponse.json({ error: "Annulation impossible après signature" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: { status: "CANCELLED" },
    });
  } else if (body.action === "terminate") {
    if (contract.status !== "SIGNED" && contract.status !== "ACTIVE") {
      return NextResponse.json({ error: "Résiliation impossible dans cet état" }, { status: 409 });
    }
    await prisma.employmentContract.update({
      where: { id: contract.id },
      data: { status: "TERMINATED", notes: body.reason ?? contract.notes },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `rh.contract.${body.action}`,
      entityType: "EmploymentContract",
      entityId: contract.id,
      metadata: { reference: contract.reference },
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Archive le contrat dans EmployeeDocument avec type CONTRACT,
 * et stocke l'id du document sur le contrat pour traçabilité.
 */
async function archiveContract(contractId: string) {
  const c = await prisma.employmentContract.findUnique({ where: { id: contractId } });
  if (!c || !c.pdfUrl) return;
  const doc = await prisma.employeeDocument.create({
    data: {
      userId: c.userId,
      type: "CONTRACT",
      title: `Contrat ${c.type} ${c.reference}`,
      fileUrl: c.pdfUrl,
      uploadedBy: c.draftedById,
    },
  });
  await prisma.employmentContract.update({
    where: { id: c.id },
    data: { archivedDocumentId: doc.id, status: "SIGNED" },
  });
}
