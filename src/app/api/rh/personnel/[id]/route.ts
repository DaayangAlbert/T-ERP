import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const READ_ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.SECRETARY_GENERAL, Role.TENANT_ADMIN];
// L'écriture (classification & paie) est strictement RH / Admin tenant.
const WRITE_ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!READ_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const isSynthetic = params.id.startsWith("syn_");

  if (isSynthetic) {
    const all = getSyntheticPersonnel(487);
    const found = all.find((p) => p.id === params.id);
    if (!found) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json({
      id: found.id,
      matricule: found.matricule,
      firstName: found.firstName,
      lastName: found.lastName,
      email: found.email,
      phone: found.phone,
      position: found.position,
      category: found.category,
      contractType: found.contractType,
      site: found.site,
      region: found.region,
      hireDate: found.hireDate,
      cnpsNumber: found.cnpsNumber,
      isSynthetic: true,
      avatarUrl: null,
      professionalCategory: null,
      echelon: null,
      classCategory: null,
      indiceSalarial: null,
      coefficientSalarial: null,
      baseSalary: null,
      salaryGrade: null,
      department: null,
      familyStatus: null,
      cnpsCardNumber: null,
      niu: null,
      bankName: null,
      bankAgency: null,
      rib: null,
      profile: {
        identityCard: `100${found.id.slice(-7).toUpperCase()}`,
        familyStatus: ["MARRIED", "SINGLE", "FREE_UNION"][found.id.length % 3],
        childrenCount: found.id.length % 5,
        address: { city: found.region, neighborhood: "—", line1: "—" },
        emergencyContact: { name: "—", phone: found.phone, relation: "Conjoint(e)" },
        bankAccount: { bank: "UBA", iban: "—", swift: "UNAFCMCX" },
      },
      documents: [],
    });
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { employeeProfile: true, employeeDocuments: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    matricule: user.employeeId ?? user.matricule ?? "—",
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    position: user.position,
    category: user.category,
    contractType: user.contractType,
    site: "Siège Yaoundé",
    region: "Centre",
    hireDate: user.hireDate?.toISOString().slice(0, 10) ?? null,
    cnpsNumber: user.cnpsNumber,
    isSynthetic: false,
    avatarUrl: user.avatarUrl,
    professionalCategory: user.professionalCategory,
    echelon: user.echelon,
    classCategory: user.classCategory,
    indiceSalarial: user.indiceSalarial,
    coefficientSalarial: user.coefficientSalarial,
    baseSalary: user.baseSalary ? Number(user.baseSalary) : null,
    salaryGrade: user.salaryGrade,
    department: user.department,
    familyStatus: user.familyStatus,
    cnpsCardNumber: user.cnpsCardNumber,
    niu: user.niu,
    bankName: user.bankName,
    bankAgency: user.bankAgency,
    rib: user.rib,
    profile: user.employeeProfile,
    documents: user.employeeDocuments.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  });
}

// ════════════════════════════════════════════════════════════════════════
// PATCH — Classification & paie (champs affichés sur le bulletin officiel)
// ════════════════════════════════════════════════════════════════════════

const patchSchema = z.object({
  avatarUrl: z.string().trim().max(500).nullable().optional(),
  professionalCategory: z.string().trim().max(120).nullable().optional(),
  echelon: z.string().trim().max(32).nullable().optional(),
  classCategory: z.string().trim().max(32).nullable().optional(),
  indiceSalarial: z.number().int().min(0).max(9999).nullable().optional(),
  coefficientSalarial: z.number().min(0).max(99).nullable().optional(),
  // Salaire contractuel mensuel (FCFA entiers). Toute modification crée une
  // SalaryHistory pour traçabilité (audit-friendly).
  baseSalary: z.number().int().min(0).max(50_000_000).nullable().optional(),
  salaryGrade: z.string().trim().max(120).nullable().optional(),
  salaryChangeReason: z.enum([
    "HIRING", "ANNUAL_REVIEW", "PROMOTION", "NEGOTIATION",
    "CCM_ADJUSTMENT", "CORRECTION", "OTHER",
  ]).optional(),
  salaryChangeNotes: z.string().trim().max(500).optional(),
  department: z.string().trim().max(120).nullable().optional(),
  familyStatus: z.string().trim().max(120).nullable().optional(),
  cnpsNumber: z.string().trim().max(40).nullable().optional(),
  cnpsCardNumber: z.string().trim().max(40).nullable().optional(),
  niu: z.string().trim().max(40).nullable().optional(),
  bankName: z.string().trim().max(120).nullable().optional(),
  bankAgency: z.string().trim().max(120).nullable().optional(),
  rib: z.string().trim().max(64).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!WRITE_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }
  if (params.id.startsWith("syn_")) {
    return NextResponse.json({ error: "Employé démo non modifiable" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, baseSalary: true },
  });
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Extraire les champs spéciaux non-User
  const { salaryChangeReason, salaryChangeNotes, baseSalary, ...userFields } = parsed.data;

  // Normalise les chaînes vides en null pour éviter "" inutiles
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(userFields)) {
    data[k] = v === "" ? null : v;
  }
  // baseSalary : conversion number → BigInt si présent
  if (baseSalary !== undefined) {
    data.baseSalary = baseSalary === null ? null : BigInt(baseSalary);
  }

  // Détection révision salariale → log dans SalaryHistory
  const previousBase = user.baseSalary;
  const newBase = baseSalary !== undefined ? (baseSalary === null ? null : BigInt(baseSalary)) : undefined;
  const isSalaryChange =
    newBase !== undefined &&
    newBase !== null &&
    (previousBase === null || previousBase !== newBase);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data });

    if (isSalaryChange) {
      await tx.salaryHistory.create({
        data: {
          tenantId: session.tenantId!,
          userId: user.id,
          effectiveAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          baseSalary: newBase!,
          previousBase,
          reason: salaryChangeReason ?? "OTHER",
          notes: salaryChangeNotes ?? null,
          decidedById: session.sub,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: isSalaryChange
          ? "rh.personnel.salary.update"
          : "rh.personnel.classification.update",
        entityType: "User",
        entityId: user.id,
        metadata: {
          fields: Object.keys(data),
          ...(isSalaryChange && {
            salaryChange: {
              from: previousBase?.toString() ?? null,
              to: newBase!.toString(),
              reason: salaryChangeReason ?? "OTHER",
            },
          }),
        },
      },
    });
  });

  return NextResponse.json({ ok: true, salaryChanged: isSalaryChange });
}
