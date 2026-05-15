import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";

export const dynamic = "force-dynamic";

// GET /api/ouv/documents
// Documents personnels : contrat, CNI scannée, certificats formation, RIB, CV.
// + Comptage des attestations délivrées (READY/DELIVERED) et bulletins archivés.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const employeeDocs = await prisma.employeeDocument.findMany({
    where: { userId: session.sub },
    orderBy: { uploadedAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      title: true,
      fileUrl: true,
      uploadedAt: true,
    },
  });

  const attestationsCount = await prisma.attestationRequest.count({
    where: {
      userId: session.sub,
      status: { in: ["READY", "DELIVERED"] },
    },
  });

  const payslipsCount = await prisma.payslip.count({
    where: { userId: session.sub },
  });

  return NextResponse.json({
    documents: employeeDocs.map((d) => ({
      id: d.id,
      type: d.type,
      typeLabel: typeLabel(d.type),
      title: d.title,
      fileUrl: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    counts: {
      personal: employeeDocs.length,
      attestations: attestationsCount,
      payslips: payslipsCount,
    },
  });
}

function typeLabel(type: string): string {
  switch (type) {
    case "CNI":
      return "Carte nationale d'identité";
    case "CONTRACT":
      return "Contrat de travail";
    case "MEDICAL_CERT":
      return "Certificat médical";
    case "TRAINING_CERT":
      return "Certificat de formation";
    case "BANK_RIB":
      return "RIB bancaire";
    case "CV":
      return "CV";
    default:
      return "Autre document";
  }
}
