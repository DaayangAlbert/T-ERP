/**
 * Contrats de travail — création et liste.
 *
 * POST  : crée un contrat en DRAFT pour un collaborateur.
 *         Pré-rempli avec les données du User (jobTitle, baseSalary, etc.)
 *         et complété par les champs propres au type (motif CDD, école STAGE...).
 *
 * GET   : liste paginée. Filtres optionnels :
 *           - status (DRAFT | PENDING_SIGNATURE | SIGNED | ACTIVE | TERMINATED | CANCELLED)
 *           - userId : contrats d'un employé
 *           - type : CDI | CDD | STAGE | JOURNALIER | PRESTATAIRE
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { ContractType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const READ_ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];
const WRITE_ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const createSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["CDI", "CDD", "STAGE", "JOURNALIER", "PRESTATAIRE"]),
  jobTitle: z.string().min(2),
  professionalCategory: z.string().optional().nullable(),
  baseSalary: z.number().int().nonnegative(),
  trialPeriodDays: z.number().int().min(0).max(180).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  workLocation: z.string().optional().nullable(),
  workingHours: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  customClauses: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
  // Spécifiques
  internshipSchool: z.string().optional().nullable(),
  internshipTutor: z.string().optional().nullable(),
  providerCompanyName: z.string().optional().nullable(),
  providerRccm: z.string().optional().nullable(),
  providerNiu: z.string().optional().nullable(),
  dailyRate: z.number().int().nonnegative().optional().nullable(),
  cdiMotive: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function buildReference(tenantId: string, type: ContractType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${type}-${year}-`;
  const last = await prisma.employmentContract.findFirst({
    where: { tenantId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNum = last ? Number(last.reference.split("-").pop()) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!READ_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const search = url.searchParams.get("search")?.trim() ?? "";

  const items = await prisma.employmentContract.findMany({
    where: {
      tenantId: session.tenantId,
      status: status ? (status as never) : undefined,
      type: type ? (type as ContractType) : undefined,
      userId: userId ?? undefined,
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { jobTitle: { contains: search, mode: "insensitive" } },
              { user: { firstName: { contains: search, mode: "insensitive" } } },
              { user: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, matricule: true, avatarUrl: true } },
      draftedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      reference: c.reference,
      type: c.type,
      status: c.status,
      jobTitle: c.jobTitle,
      baseSalary: Number(c.baseSalary),
      startDate: c.startDate.toISOString().slice(0, 10),
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
      pdfUrl: c.pdfUrl,
      employerSignedAt: c.employerSignedAt?.toISOString() ?? null,
      employeeSignedAt: c.employeeSignedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      employee: {
        id: c.user.id,
        fullName: `${c.user.firstName} ${c.user.lastName}`.trim(),
        matricule: c.user.matricule,
        avatarUrl: c.user.avatarUrl,
      },
      draftedBy: c.draftedBy ? `${c.draftedBy.firstName} ${c.draftedBy.lastName}`.trim() : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!WRITE_ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Données invalides", details: (err as Error).message }, { status: 400 });
  }

  // Vérifie que l'employé existe et appartient au tenant
  const employee = await prisma.user.findFirst({
    where: { id: body.userId, tenantId: session.tenantId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!employee) return NextResponse.json({ error: "Collaborateur introuvable" }, { status: 404 });

  // Validations métier par type
  if (body.type === "CDD" && !body.endDate) {
    return NextResponse.json({ error: "Date de fin obligatoire pour un CDD" }, { status: 400 });
  }
  if (body.type === "CDD" && !body.cdiMotive) {
    return NextResponse.json({ error: "Motif légal du recours au CDD obligatoire" }, { status: 400 });
  }
  if (body.type === "STAGE" && (!body.endDate || !body.internshipSchool)) {
    return NextResponse.json({ error: "Date de fin et école d'origine obligatoires pour un stage" }, { status: 400 });
  }
  if (body.type === "JOURNALIER" && !body.dailyRate) {
    return NextResponse.json({ error: "Taux journalier obligatoire pour un journalier" }, { status: 400 });
  }
  if (body.type === "PRESTATAIRE" && !body.providerCompanyName) {
    return NextResponse.json({ error: "Raison sociale du prestataire obligatoire" }, { status: 400 });
  }

  const reference = await buildReference(session.tenantId, body.type as ContractType);

  const contract = await prisma.employmentContract.create({
    data: {
      tenantId: session.tenantId,
      userId: body.userId,
      draftedById: session.sub,
      reference,
      type: body.type as ContractType,
      status: "DRAFT",
      jobTitle: body.jobTitle,
      professionalCategory: body.professionalCategory ?? null,
      baseSalary: BigInt(body.baseSalary),
      trialPeriodDays: body.trialPeriodDays ?? 0,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      workLocation: body.workLocation ?? null,
      workingHours: body.workingHours ?? "173 h/mois",
      benefits: body.benefits,
      customClauses: body.customClauses,
      internshipSchool: body.internshipSchool ?? null,
      internshipTutor: body.internshipTutor ?? null,
      providerCompanyName: body.providerCompanyName ?? null,
      providerRccm: body.providerRccm ?? null,
      providerNiu: body.providerNiu ?? null,
      dailyRate: body.dailyRate ? BigInt(body.dailyRate) : null,
      cdiMotive: body.cdiMotive ?? null,
      notes: body.notes ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "rh.contract.create",
      entityType: "EmploymentContract",
      entityId: contract.id,
      metadata: { reference: contract.reference, type: contract.type, employeeId: contract.userId },
    },
  });

  return NextResponse.json({ id: contract.id, reference: contract.reference }, { status: 201 });
}
