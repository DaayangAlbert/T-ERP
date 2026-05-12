import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

interface EmpDocument {
  id: string;
  category: "CONTRACT" | "CERTIFICATE" | "ATTESTATION" | "TRAINING";
  title: string;
  issuedAt: string;
  expiresAt: string | null;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  downloadUrl: string;
}

function statusFor(expiresAt: Date | null): EmpDocument["status"] {
  if (!expiresAt) return "VALID";
  const now = Date.now();
  if (expiresAt.getTime() < now) return "EXPIRED";
  if (expiresAt.getTime() - now < 30 * 86400_000) return "EXPIRING_SOON";
  return "VALID";
}

export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { hireDate: true, contractType: true },
  });

  const hireDate = user?.hireDate ?? new Date(2018, 2, 15);
  const items: EmpDocument[] = [
    {
      id: "contract",
      category: "CONTRACT",
      title: `Contrat de travail ${user?.contractType ?? "CDI"} signé`,
      issuedAt: hireDate.toISOString(),
      expiresAt: null,
      status: "VALID",
      downloadUrl: "/api/emp/documents/contract/download",
    },
    {
      id: "work-attestation",
      category: "ATTESTATION",
      title: "Attestation de travail",
      issuedAt: new Date(Date.now() - 80 * 86400_000).toISOString(),
      expiresAt: new Date(Date.now() + 10 * 86400_000).toISOString(),
      status: statusFor(new Date(Date.now() + 10 * 86400_000)),
      downloadUrl: "/api/emp/documents/work-certificate",
    },
    {
      id: "safety-certificate",
      category: "CERTIFICATE",
      title: "Certificat sécurité chantier",
      issuedAt: new Date(2025, 0, 12).toISOString(),
      expiresAt: new Date(2027, 0, 12).toISOString(),
      status: statusFor(new Date(2027, 0, 12)),
      downloadUrl: "/api/emp/documents/safety-certificate/download",
    },
    {
      id: "machine-training",
      category: "TRAINING",
      title: "Formation conduite engins (CACES 2022)",
      issuedAt: new Date(2022, 5, 20).toISOString(),
      expiresAt: new Date(2027, 5, 20).toISOString(),
      status: statusFor(new Date(2027, 5, 20)),
      downloadUrl: "/api/emp/documents/machine-training/download",
    },
  ];

  return NextResponse.json({ items });
}
