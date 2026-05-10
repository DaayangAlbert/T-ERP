import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";
import { prisma } from "@/lib/prisma";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const realUsers = await prisma.user.findMany({
    where: { tenantId: { in: scopeIds } },
    select: {
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      category: true,
      contractType: true,
      hireDate: true,
      cnpsNumber: true,
    },
  });
  const synthetic = getSyntheticPersonnel(487).slice(realUsers.length);
  const headers = [
    "Matricule",
    "Prénom",
    "Nom",
    "Email",
    "Téléphone",
    "Poste",
    "Catégorie",
    "Contrat",
    "Affectation",
    "Embauche",
    "N° CNPS",
  ];
  const lines = [headers.map(csvEscape).join(";")];

  for (const [i, u] of realUsers.entries()) {
    lines.push(
      [
        u.employeeId ?? `EMP-2018-${String(i + 1).padStart(5, "0")}`,
        u.firstName,
        u.lastName,
        u.email,
        u.phone ?? "",
        u.position ?? "",
        u.category ?? "",
        u.contractType ?? "CDI",
        "Siège Yaoundé",
        u.hireDate?.toISOString().slice(0, 10) ?? "",
        u.cnpsNumber ?? "",
      ].map(csvEscape).join(";")
    );
  }
  for (const s of synthetic) {
    lines.push(
      [
        s.matricule,
        s.firstName,
        s.lastName,
        s.email,
        s.phone,
        s.position,
        s.category,
        s.contractType,
        s.site,
        s.hireDate,
        s.cnpsNumber,
      ].map(csvEscape).join(";")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="personnel_${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
