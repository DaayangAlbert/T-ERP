import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { verifyPayslipHash } from "@/lib/payroll/payroll-verification";
import { formatFCFA } from "@/lib/format";

export const dynamic = "force-dynamic";

function statusLabel(input: { cancelledAt: Date | null; replacedById: string | null; status: string }) {
  if (input.cancelledAt) return { label: "Annule", tone: "bg-rose-100 text-rose-700", valid: false };
  if (input.replacedById) return { label: "Remplace", tone: "bg-amber-100 text-amber-700", valid: false };
  return { label: "Valide", tone: "bg-green-100 text-green-700", valid: true };
}

export default async function PayslipVerifyPage({ params }: { params: { uuid: string } }) {
  const payslip = await prisma.payslip.findUnique({
    where: { verificationUuid: params.uuid },
    include: {
      snapshot: true,
      user: { select: { firstName: true, lastName: true, employeeId: true, matricule: true } },
      tenant: { select: { name: true, logoUrl: true } },
    },
  });

  if (!payslip) notFound();

  const validHash = verifyPayslipHash({
    tenantId: payslip.tenantId,
    userId: payslip.userId,
    periodIso: payslip.period.toISOString(),
    verificationUuid: payslip.verificationUuid,
    verificationCode: payslip.verificationCode,
    verificationHash: payslip.verificationHash,
  });

  if (!validHash) notFound();

  const status = statusLabel(payslip);
  const fullName = payslip.snapshot?.fullName ?? `${payslip.user.firstName} ${payslip.user.lastName}`;
  const matricule = payslip.snapshot?.matricule ?? payslip.user.matricule ?? payslip.user.employeeId ?? "-";
  const pdfHref = `/api/payslips/verify/${params.uuid}/pdf`;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-100 text-primary-700">
                {status.valid ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink">Verification bulletin de paie</h1>
                <p className="text-[12.5px] text-ink-3">
                  {payslip.tenant.name} · {fullName} · {matricule}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
                {status.label}
              </span>
              <Link
                href={pdfHref}
                target="_blank"
                className="inline-flex h-9 items-center rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
              >
                Telecharger PDF
              </Link>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-[12.5px] text-ink-2 sm:grid-cols-4">
            <div>Periode : {payslip.periodLabel ?? payslip.period.toISOString().slice(0, 7)}</div>
            <div>Code : {payslip.verificationCode}</div>
            <div>Net : {formatFCFA(payslip.netAmount)}</div>
            <div>Emission : {payslip.issuedAt ? payslip.issuedAt.toLocaleDateString("fr-FR") : "-"}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
          <iframe title="Bulletin de paie verifie" src={pdfHref} className="h-[78vh] w-full" />
        </div>
      </section>
    </main>
  );
}
