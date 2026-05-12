import { NextResponse } from "next/server";
import { z } from "zod";
import { ContractType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";
import {
  computeCandidateCompletion,
  computeCandidateCompletionDetail,
} from "@/lib/cand-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const [user, experiences, formations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        position: true,
        cvUrl: true,
        desiredJob: true,
        desiredContractType: true,
        desiredLocation: true,
        desiredSalaryMin: true,
        desiredSalaryMax: true,
        availability: true,
        mobilityDailyTravel: true,
        mobilityMissions: true,
        mobilityExpatriation: true,
        candidateSkills: true,
        candidateLanguages: true,
      },
    }),
    prisma.candidateExperience.findMany({
      where: { userId: session.sub },
      orderBy: { order: "asc" },
    }),
    prisma.candidateFormation.findMany({
      where: { userId: session.sub },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const completion = computeCandidateCompletionDetail({
    ...user,
    experiencesCount: experiences.length,
    formationsCount: formations.length,
  });

  return NextResponse.json({
    user: {
      ...user,
      desiredSalaryMin: user.desiredSalaryMin ? Number(user.desiredSalaryMin) : null,
      desiredSalaryMax: user.desiredSalaryMax ? Number(user.desiredSalaryMax) : null,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    },
    experiences: experiences.map((e) => ({
      ...e,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate?.toISOString() ?? null,
    })),
    formations,
    completion,
  });
}

const patchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  address: z.string().max(240).nullable().optional(),
  position: z.string().max(120).nullable().optional(),
  desiredJob: z.string().max(120).nullable().optional(),
  desiredContractType: z.nativeEnum(ContractType).nullable().optional(),
  desiredLocation: z.string().max(120).nullable().optional(),
  desiredSalaryMin: z.number().int().nonnegative().nullable().optional(),
  desiredSalaryMax: z.number().int().nonnegative().nullable().optional(),
  availability: z.string().max(60).nullable().optional(),
  mobilityDailyTravel: z.boolean().optional(),
  mobilityMissions: z.boolean().optional(),
  mobilityExpatriation: z.boolean().optional(),
  candidateSkills: z.array(z.string().min(1).max(60)).max(40).optional(),
  candidateLanguages: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        level: z.enum(["natif", "courant", "intermediaire", "notions"]),
      }),
    )
    .max(15)
    .optional(),
});

export async function PATCH(req: Request) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const updateData: Prisma.UserUpdateInput = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.dateOfBirth !== undefined)
    updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.desiredJob !== undefined) updateData.desiredJob = data.desiredJob;
  if (data.desiredContractType !== undefined)
    updateData.desiredContractType = data.desiredContractType;
  if (data.desiredLocation !== undefined)
    updateData.desiredLocation = data.desiredLocation;
  if (data.desiredSalaryMin !== undefined)
    updateData.desiredSalaryMin = data.desiredSalaryMin
      ? BigInt(data.desiredSalaryMin)
      : null;
  if (data.desiredSalaryMax !== undefined)
    updateData.desiredSalaryMax = data.desiredSalaryMax
      ? BigInt(data.desiredSalaryMax)
      : null;
  if (data.availability !== undefined) updateData.availability = data.availability;
  if (data.mobilityDailyTravel !== undefined)
    updateData.mobilityDailyTravel = data.mobilityDailyTravel;
  if (data.mobilityMissions !== undefined)
    updateData.mobilityMissions = data.mobilityMissions;
  if (data.mobilityExpatriation !== undefined)
    updateData.mobilityExpatriation = data.mobilityExpatriation;
  if (data.candidateSkills !== undefined)
    updateData.candidateSkills = data.candidateSkills;
  if (data.candidateLanguages !== undefined)
    updateData.candidateLanguages = data.candidateLanguages as Prisma.InputJsonValue;

  const updated = await prisma.user.update({
    where: { id: session.sub },
    data: updateData,
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      address: true,
      position: true,
      cvUrl: true,
      desiredJob: true,
      desiredLocation: true,
      desiredSalaryMin: true,
      candidateSkills: true,
      candidateLanguages: true,
    },
  });

  const expCount = await prisma.candidateExperience.count({
    where: { userId: session.sub },
  });
  const formCount = await prisma.candidateFormation.count({
    where: { userId: session.sub },
  });
  const completionPct = computeCandidateCompletion({
    ...updated,
    experiencesCount: expCount,
    formationsCount: formCount,
  });

  return NextResponse.json({ ok: true, completionPct });
}
