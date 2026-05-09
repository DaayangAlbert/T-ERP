"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Download, Mail } from "lucide-react";
import { useMyPayslip, type PayslipDetail, type PayslipLine } from "@/hooks/usePayslips";
import { formatDate } from "@/lib/format";
import "./print.css";

interface Props {
  params: { id: string };
}

const PAYMENT_MODE_LABEL: Record<string, string> = {
  VIREMENT: "VIREMENT",
  ESPECES: "EN ESPÈCES",
  CHEQUE: "PAR CHÈQUE",
  MOMO: "MOBILE MONEY",
};

function fmtFr(amount: string | null | undefined): string {
  if (!amount) return "";
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || rate === 0) return "";
  return rate.toFixed(2).replace(".", ",");
}

function fmtQty(q: number | null | undefined): string {
  if (q === null || q === undefined || q === 0) return "";
  return q.toString();
}

function seniorityMonths(hireDate: string | null): number | null {
  if (!hireDate) return null;
  const ms = Date.now() - new Date(hireDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)));
}

export default function BulletinOfficielPage({ params }: Props) {
  const { data, isLoading, isError } = useMyPayslip(params.id);

  return (
    <>
      {/* Action bar (hidden on print) */}
      <div className="bulletin-actions mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/paie"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à Ma paie
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimer
          </button>
          <button
            disabled
            title="Envoi par email (J5+)"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-3 opacity-60"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button
            disabled
            title="Téléchargement PDF (J5+)"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white opacity-60"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Bulletin introuvable ou réservé.
        </div>
      )}

      {(isLoading || !data) && !isError && (
        <div className="rounded-xl border border-line bg-white p-6 shadow-card">
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-alt" />
          <div className="mt-4 h-96 w-full animate-pulse rounded bg-surface-alt" />
        </div>
      )}

      {data && (
        <div className="bulletin-frame">
          <Bulletin payslip={data} />
        </div>
      )}
    </>
  );
}

function Bulletin({ payslip }: { payslip: PayslipDetail }) {
  const periodFrom = new Date(payslip.period);
  const periodTo = new Date(periodFrom.getFullYear(), periodFrom.getMonth() + 1, 0);
  const seniority = seniorityMonths(payslip.user.hireDate);

  const fullName = `${payslip.user.lastName.toUpperCase()} ${payslip.user.firstName}`;
  const tenantName = (payslip.tenant?.name ?? "").toUpperCase();

  return (
    <div className="bulletin">
      <table className="bul-main">
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <tbody>
          {/* === Top row : period + payment === */}
          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={2} className="bul-period">
              <em>
                Paie du {formatDate(periodFrom, "dd/MM/yyyy")} au {formatDate(periodTo, "dd/MM/yyyy")}
              </em>
            </td>
            <td colSpan={2} className="bul-cell-center">
              Paiement le
            </td>
            <td colSpan={2} className="bul-cell-center bul-cell-bold">
              {formatDate(payslip.paymentDate, "dd/MM/yyyy")}
            </td>
            <td className="bul-cell-center bul-cell-bold">
              {PAYMENT_MODE_LABEL[payslip.paymentMode] ?? payslip.paymentMode}
            </td>
          </tr>

          {/* === BULLETIN DE PAIE banner + Matricule headers === */}
          <tr>
            <td colSpan={2} className="bul-title-band">
              BULLETIN DE PAIE
            </td>
            <td className="bul-head-mint">Matricule</td>
            <td className="bul-head-mint">Catégorie</td>
            <td className="bul-head-mint">Échelon</td>
            <td className="bul-head-mint">Ancienneté</td>
            <td colSpan={3} className="bul-head-mint">
              N° CNPS
            </td>
          </tr>

          {/* === Employer block + Matricule values === */}
          <tr>
            <td colSpan={2} rowSpan={3} className="bul-employer">
              <div className="bul-employer-name">{tenantName}</div>
              <div className="bul-employer-meta">
                {payslip.tenant?.taxId && <>N° Contribuable : {payslip.tenant.taxId}<br /></>}
                {payslip.tenant?.cnpsId && <>N° CNPS employeur : {payslip.tenant.cnpsId}<br /></>}
                Cameroun
              </div>
            </td>
            <td className="bul-cell-center bul-cell-bold">
              {payslip.user.employeeId ?? "—"}
            </td>
            <td className="bul-cell-center">{payslip.user.category ?? ""}</td>
            <td className="bul-cell-center"></td>
            <td className="bul-cell-center bul-cell-mint-soft">
              {seniority !== null ? `${seniority} mois` : "—"}
            </td>
            <td colSpan={3} className="bul-cell-center">
              {payslip.user.cnpsNumber ?? ""}
            </td>
          </tr>

          <tr>
            <td colSpan={2} className="bul-head-mint">
              Conv. coll.
            </td>
            <td colSpan={3} className="bul-head-mint">
              Emploi occupé
            </td>
            <td colSpan={2} className="bul-head-mint">
              Département
            </td>
          </tr>

          <tr>
            <td colSpan={2} className="bul-cell-center">
              CCT BTP Cameroun
            </td>
            <td colSpan={3} className="bul-cell-center">
              {payslip.user.position ?? ""}
            </td>
            <td colSpan={2} className="bul-cell-center"></td>
          </tr>

          {/* === Hire date + Family situation === */}
          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={2} className="bul-head-mint">
              Date d'embauche
            </td>
            <td className="bul-head-mint">Horaire</td>
            <td colSpan={3} className="bul-head-mint">
              SITUATION DE FAMILLE
            </td>
          </tr>

          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={2} className="bul-cell-center bul-cell-yellow bul-cell-bold">
              {payslip.user.hireDate ? formatDate(payslip.user.hireDate, "dd/MM/yy") : "—"}
            </td>
            <td className="bul-cell-center">169h33</td>
            <td colSpan={3} className="bul-cell-center"></td>
          </tr>

          {/* === Employee identity === */}
          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={6} className="bul-cell-center bul-cell-bold-lg">
              {fullName}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={6} className="bul-cell-left">
              <span style={{ marginRight: 30 }}>N° de Compte :</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="bul-empty" />
            <td colSpan={6} className="bul-cell-left">
              Domiciliation :
            </td>
          </tr>

          {/* === Codes header === */}
          <tr className="bul-codes-header">
            <th>Code</th>
            <th>LIBELLÉS</th>
            <th>NOMBRE</th>
            <th>BASE</th>
            <th>TAUX</th>
            <th>MONTANT+</th>
            <th colSpan={2}>MONTANT-</th>
            <th>RET PATRON</th>
          </tr>

          {/* === Lines === */}
          {payslip.lines.map((l, i) => (
            <BulletinLine key={l.id} line={l} index={i} />
          ))}

          {/* === Totals row === */}
          <tr className="bul-totals">
            <td colSpan={5} className="bul-cell-right bul-cell-bold">
              TOTAUX
            </td>
            <td className="bul-cell-right bul-cell-bold">{fmtFr(payslip.grossAmount)}</td>
            <td colSpan={2} className="bul-cell-right bul-cell-bold">
              {fmtFr(
                (BigInt(payslip.socialCharges) + BigInt(payslip.fiscalCharges)).toString()
              )}
            </td>
            <td className="bul-cell-right bul-cell-bold">{fmtFr(payslip.employerCharges)}</td>
          </tr>

          {/* === Net to pay === */}
          <tr className="bul-net">
            <td colSpan={5} className="bul-cell-right bul-cell-net-label">
              NET À PAYER
            </td>
            <td colSpan={3} className="bul-cell-center bul-cell-net-value">
              {fmtFr(payslip.netAmount)} FCFA
            </td>
            <td className="bul-cell-center bul-cell-bold">{PAYMENT_MODE_LABEL[payslip.paymentMode] ?? payslip.paymentMode}</td>
          </tr>
        </tbody>
      </table>

      {/* Cumul band */}
      <div className="bul-cumul">
        <div>
          <strong>Cumuls de l'année :</strong> Brut {fmtFr(payslip.grossAmount)} FCFA · Imposable{" "}
          {fmtFr(payslip.taxableGross)} FCFA · Charges salariales{" "}
          {fmtFr((BigInt(payslip.socialCharges) + BigInt(payslip.fiscalCharges)).toString())} FCFA
        </div>
        <div className="bul-cumul-meta">
          Bulletin généré le {formatDate(new Date(), "dd/MM/yyyy 'à' HH:mm")} · à conserver sans
          limite — code du travail Cameroun
        </div>
      </div>
    </div>
  );
}

function BulletinLine({ line, index }: { line: PayslipLine; index: number }) {
  const italic = line.code === "A001";
  return (
    <tr className={italic ? "bul-line-italic" : "bul-line"} data-index={index}>
      <td className="bul-cell-center bul-mono">{line.code}</td>
      <td className="bul-cell-left">{line.label}</td>
      <td className="bul-cell-right bul-mono">{fmtQty(line.quantity)}</td>
      <td className="bul-cell-right bul-mono">{fmtFr(line.base)}</td>
      <td className="bul-cell-right bul-mono">{fmtRate(line.rate)}</td>
      <td className="bul-cell-right bul-mono">{fmtFr(line.amountPlus)}</td>
      <td colSpan={2} className="bul-cell-right bul-mono">
        {fmtFr(line.amountMinus)}
      </td>
      <td className="bul-cell-right bul-mono">{fmtFr(line.employerAmount)}</td>
    </tr>
  );
}
