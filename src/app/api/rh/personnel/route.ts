import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { getSyntheticPersonnel, type SyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

interface PersonnelRow {
  id: string;
  matricule: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  category: string;
  contractType: string;
  site: string;
  region: string | null;
  hireDate: string;
  cnpsNumber: string | null;
  isSynthetic: boolean;
}

function syntheticToRow(s: SyntheticPersonnel): PersonnelRow {
  return {
    id: s.id,
    matricule: s.matricule,
    fullName: `${s.firstName} ${s.lastName}`,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    position: s.position,
    category: s.category,
    contractType: s.contractType,
    site: s.site,
    region: s.region,
    hireDate: s.hireDate,
    cnpsNumber: s.cnpsNumber,
    isSynthetic: true,
  };
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
  const status = url.searchParams.get("status") ?? "";
  const category = url.searchParams.get("category") ?? "";
  const site = url.searchParams.get("site") ?? "";
  const contract = url.searchParams.get("contract") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(8, parseInt(url.searchParams.get("limit") ?? "8", 10)));

  const scopeIds = await getTenantScopeIds(session.tenantId);

  // 1) Comptes réels du tenant
  const realUsers = await prisma.user.findMany({
    where: { tenantId: { in: scopeIds }, status: status === "INACTIVE" ? "INACTIVE" : status === "" ? undefined : "ACTIVE" },
    select: {
      id: true,
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
    orderBy: { lastName: "asc" },
    take: 200,
  });

  const realRows: PersonnelRow[] = realUsers.map((u, i) => ({
    id: u.id,
    matricule: u.employeeId ?? `EMP-2018-${String(i + 1).padStart(5, "0")}`,
    fullName: `${u.firstName} ${u.lastName}`,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    position: u.position ?? "—",
    category: u.category ?? "—",
    contractType: u.contractType ?? "CDI",
    site: "Siège Yaoundé",
    region: "Centre",
    hireDate: u.hireDate?.toISOString().slice(0, 10) ?? "2020-01-01",
    cnpsNumber: u.cnpsNumber,
    isSynthetic: false,
  }));

  // 2) Compléter jusqu'à 487 via la liste synthétique
  const synthetic = getSyntheticPersonnel(487).slice(realRows.length).map(syntheticToRow);
  let all: PersonnelRow[] = [...realRows, ...synthetic];

  // Filtres
  if (search) {
    all = all.filter((r) =>
      [r.fullName, r.matricule, r.cnpsNumber ?? "", r.phone ?? "", r.email]
        .some((field) => field.toLowerCase().includes(search))
    );
  }
  if (category) all = all.filter((r) => r.category === category);
  if (site) all = all.filter((r) => r.site === site);
  if (contract) all = all.filter((r) => r.contractType === contract);

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  // Filtres disponibles (déduits de l'ensemble non filtré)
  const allFull: PersonnelRow[] = [...realRows, ...getSyntheticPersonnel(487).slice(realRows.length).map(syntheticToRow)];
  const facets = {
    categories: Array.from(new Set(allFull.map((r) => r.category))).sort(),
    sites: Array.from(new Set(allFull.map((r) => r.site))).sort(),
    contracts: Array.from(new Set(allFull.map((r) => r.contractType))).sort(),
    statuses: ["ACTIVE", "INACTIVE"],
  };

  return NextResponse.json({
    items,
    page,
    limit,
    total,
    totalPages,
    facets,
  });
}
