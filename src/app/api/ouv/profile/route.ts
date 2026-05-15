import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { profileUpdateSchema } from "@/schemas/ouv-profile";

export const dynamic = "force-dynamic";

// GET /api/ouv/profile — identité + infos pro + coordonnées + langue.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      matricule: true,
      cniNumber: true,
      position: true,
      workerQualification: true,
      professionalCategory: true,
      category: true,
      contractType: true,
      hireDate: true,
      cnpsNumber: true,
      niu: true,
      bankName: true,
      bankAgency: true,
      rib: true,
      phone: true,
      phoneMobile: true,
      address: true,
      familyStatus: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      preferredLanguage: true,
      notificationChannel: true,
      teamLeader: true,
      isGuard: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const seniorityMonths = u.hireDate
    ? Math.floor((Date.now() - u.hireDate.getTime()) / (30.44 * 24 * 3600 * 1000))
    : 0;
  const initials = `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();

  return NextResponse.json({
    profile: {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`,
      initials,
      avatarUrl: u.avatarUrl,
      matricule: u.matricule,
      matriculeShort: u.matricule?.split("-").pop() ?? u.matricule,
      cniNumber: u.cniNumber,
      qualification: u.workerQualification ?? u.position ?? "Ouvrier",
      position: u.position,
      professionalCategory: u.professionalCategory,
      category: u.category,
      contractType: u.contractType,
      hireDate: u.hireDate?.toISOString() ?? null,
      seniorityMonths,
      seniorityLabel: humanSeniority(seniorityMonths),
      cnpsNumber: u.cnpsNumber,
      niu: u.niu,
      bankName: u.bankName,
      bankAgency: u.bankAgency,
      rib: u.rib,
      phone: u.phoneMobile ?? u.phone,
      address: u.address,
      familyStatus: u.familyStatus,
      emergencyContactName: u.emergencyContactName,
      emergencyContactPhone: u.emergencyContactPhone,
      preferredLanguage: u.preferredLanguage,
      notificationChannel: u.notificationChannel,
      teamLeader: u.teamLeader,
      isGuard: u.isGuard,
    },
  });
}

// PATCH /api/ouv/profile — Update strictement limité aux champs autorisés
// (téléphone, adresse, personne à prévenir, langue préférée).
export async function PATCH(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = profileUpdateSchema.parse(body);

    const data: Record<string, string | undefined> = {};
    if (input.phoneMobile !== undefined) data.phoneMobile = input.phoneMobile;
    if (input.address !== undefined) data.address = input.address;
    if (input.emergencyContactName !== undefined)
      data.emergencyContactName = input.emergencyContactName;
    if (input.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = input.emergencyContactPhone;
    if (input.preferredLanguage !== undefined)
      data.preferredLanguage = input.preferredLanguage;

    await prisma.user.update({
      where: { id: session.sub },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/ouv/profile]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function humanSeniority(months: number): string {
  if (months < 1) return "Moins d'un mois";
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} an${years > 1 ? "s" : ""}`;
  return `${years} an${years > 1 ? "s" : ""} ${rem} mois`;
}
