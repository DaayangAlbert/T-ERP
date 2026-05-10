import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
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
    matricule: user.employeeId ?? "—",
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
