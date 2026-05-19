"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Printer, Download, Mail, MapPin, Phone, Mail as MailIcon, Globe, Lock, Wallet, Users, Coins } from "lucide-react";
import { useMyPayslip, type PayslipDetail, type PayslipLine } from "@/hooks/usePayslips";
import { formatDate } from "@/lib/format";
import "./print.css";

interface Props {
  params: { id: string };
}

const MONTHS_FR = [
  "JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE",
];

function fmtFCFA(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "—";
  // Intl.NumberFormat("fr-FR") utilise un narrow no-break space (U+202F) qui
  // s'affiche comme "/" dans certaines polices de fallback. On normalise vers
  // un espace classique pour un rendu propre sur écran et PDF.
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(n))
    .replace(/[   ]/g, " ");
}

function fmtRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || rate === 0) return "—";
  return `${rate.toFixed(2).replace(".", ",")} %`;
}

// Renumérotation des codes selon la maquette officielle :
// 01xx = gains, 31xx = sociales, 32xx = fiscales, 33xx = autres,
// 41xx = patronales sociales, 42xx = patronales autres.
const CATEGORY_PREFIX: Record<string, string> = {
  GAIN: "01",
  DEDUCTION_SOCIAL: "31",
  DEDUCTION_FISCAL: "32",
  DEDUCTION_OTHER: "33",
  EMPLOYER_SOCIAL: "41",
  EMPLOYER_OTHER: "42",
};
function displayCode(category: string, indexInCategory: number): string {
  return `${CATEGORY_PREFIX[category] ?? "00"}${String(indexInCategory).padStart(2, "0")}`;
}

function formatVerifCode(uuid: string): string {
  const c = uuid.replace(/-/g, "").toUpperCase().padEnd(16, "0").slice(0, 16);
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}`;
}

function paymentLabel(mode: string): string {
  const map: Record<string, string> = {
    VIREMENT: "VIREMENT BANCAIRE",
    ESPECES: "EN ESPÈCES",
    CHEQUE: "PAR CHÈQUE",
    MOMO: "MOBILE MONEY",
  };
  return map[mode] ?? mode;
}

export default function BulletinOfficielPage({ params }: Props) {
  const { data, isLoading, isError } = useMyPayslip(params.id);

  return (
    <>
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
          <a
            href={`/api/payslips/${params.id}/pdf`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger PDF
          </a>
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
  const period = new Date(payslip.period);
  const periodFrom = new Date(period.getFullYear(), period.getMonth(), 1);
  const periodTo = new Date(period.getFullYear(), period.getMonth() + 1, 0);
  const monthLabel = `MOIS DE ${MONTHS_FR[period.getMonth()]} ${period.getFullYear()}`;

  // Catégorisation des lignes
  const gains = payslip.lines.filter((l) => l.category === "GAIN");
  const dedSocial = payslip.lines.filter((l) => l.category === "DEDUCTION_SOCIAL");
  const dedFiscal = payslip.lines.filter((l) => l.category === "DEDUCTION_FISCAL");
  const dedOther = payslip.lines.filter((l) => l.category === "DEDUCTION_OTHER");
  const empSocial = payslip.lines.filter((l) => l.category === "EMPLOYER_SOCIAL");
  const empOther = payslip.lines.filter((l) => l.category === "EMPLOYER_OTHER");

  const totalGains = sumLines(gains, "amountPlus");
  const totalDedSocial = sumLines(dedSocial, "amountMinus");
  const totalDedFiscal = sumLines(dedFiscal, "amountMinus");
  const totalDedOther = sumLines(dedOther, "amountMinus");
  const totalDeductions = totalDedSocial + totalDedFiscal + totalDedOther;
  const totalEmpSocial = sumLines(empSocial, "employerAmount");
  const totalEmpOther = sumLines(empOther, "employerAmount");
  const totalEmployer = totalEmpSocial + totalEmpOther;

  const employeeName = (payslip.snapshot?.fullName ?? `${payslip.user.firstName} ${payslip.user.lastName}`).trim();
  const photoUrl = payslip.snapshot?.profilePhotoUrl ?? payslip.user.avatarUrl ?? null;
  const totalCoutEmployeur = BigInt(payslip.grossAmount) + BigInt(totalEmployer);
  const baseSalary = payslip.lines.find((l) => l.code.toUpperCase().startsWith("A001"))?.amountPlus ?? null;
  const overtimeHours = payslip.lines.find((l) => l.code.toUpperCase() === "A005")?.quantity ?? 0;
  const verifCode = formatVerifCode(payslip.verificationUuid);
  const verifUrlShort = payslip.verifiedPublicUrl.replace(/^https?:\/\//, "").replace(/\/payslip\/verify\/.*$/, "/verify");

  // Hash compact pour authentification (12 premiers chars de l'UUID sans tirets)
  const authHash = payslip.verificationUuid.replace(/-/g, "").toLowerCase().slice(0, 20);

  return (
    <div className="bulletin">
      {/* ═════════════ EN-TÊTE ═════════════ */}
      <header className="bul-header">
        {/* Bloc entreprise (gauche) */}
        <div className="bul-h-left">
          <div className="bul-logo-wrap">
            {payslip.tenant.logoUrl ? (
              <Image src={payslip.tenant.logoUrl} alt="" width={84} height={84} className="bul-logo" unoptimized />
            ) : (
              <div className="bul-logo-fb">{payslip.tenant.name.slice(0, 2).toUpperCase()}</div>
            )}
          </div>
          <div className="bul-h-company">
            <div className="bul-company-name">{payslip.tenant.name.toUpperCase()}</div>
            <div className="bul-company-tag">BTP — Génie civil — Construction — Prestation de services</div>
            <dl className="bul-company-meta">
              {payslip.tenant.contactAddress && (
                <CoordRow icon={<MapPin className="bul-i" />} label="Adresse" value={payslip.tenant.contactAddress} />
              )}
              {payslip.tenant.contactPhone && (
                <CoordRow icon={<Phone className="bul-i" />} label="Tél." value={payslip.tenant.contactPhone} />
              )}
              {payslip.tenant.contactEmail && (
                <CoordRow icon={<MailIcon className="bul-i" />} label="Email" value={payslip.tenant.contactEmail} />
              )}
              {payslip.tenant.websiteUrl && (
                <CoordRow icon={<Globe className="bul-i" />} label="Site web" value={payslip.tenant.websiteUrl} />
              )}
              {payslip.tenant.taxId && (
                <CoordRow label="N° Contribuable" value={payslip.tenant.taxId} bold />
              )}
              {payslip.tenant.cnpsId && (
                <CoordRow label="N° CNPS" value={payslip.tenant.cnpsId} bold />
              )}
            </dl>
          </div>
        </div>

        {/* Bloc titre (centre) */}
        <div className="bul-h-center">
          <h1 className="bul-title">BULLETIN DE PAIE</h1>
          <div className="bul-subtitle">{monthLabel}</div>
          <div className="bul-period-pill">
            Période du {formatDate(periodFrom, "dd/MM/yyyy")} au {formatDate(periodTo, "dd/MM/yyyy")}
          </div>
          <p className="bul-compliance">
            Document officiel conforme à la réglementation
            <br />
            CNPS - DGI Cameroun
          </p>
        </div>

        {/* Bloc méta + QR (droite) */}
        <div className="bul-h-right">
          <table className="bul-meta-table">
            <tbody>
              <tr><th>N° BULLETIN</th><td className="bul-mono">{payslip.bulletinNumber}</td></tr>
              <tr><th>DATE D&apos;ÉDITION</th><td>{formatDate(payslip.paymentDate, "dd/MM/yyyy")}</td></tr>
              <tr><th>MODE DE PAIEMENT</th><td>{paymentLabel(payslip.paymentMode)}</td></tr>
              {payslip.user.bankName && <tr><th>BANQUE</th><td>{payslip.user.bankName.toUpperCase()}</td></tr>}
              {payslip.user.rib && <tr><th>COMPTE BANCAIRE</th><td className="bul-mono">{payslip.user.rib}</td></tr>}
            </tbody>
          </table>
          <div className="bul-verif">
            <div className="bul-qr">
              <QrPattern />
            </div>
            <div className="bul-verif-txt">
              Vérification en ligne
              <br />
              <span className="bul-mono">@ {verifUrlShort}</span>
            </div>
            <div className="bul-verif-code">{verifCode}</div>
          </div>
        </div>
      </header>

      {/* ═════════════ EMPLOYÉ + RÉCAPITULATIF ═════════════ */}
      <section className="bul-employee">
        {/* Carte employé (gauche) */}
        <div className="bul-emp-card">
          <div className="bul-emp-photo">
            {photoUrl ? (
              <Image src={photoUrl} alt="" width={96} height={96} className="bul-emp-photo-img" unoptimized />
            ) : (
              <span className="bul-emp-photo-fb">
                {employeeName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            )}
          </div>
          <div className="bul-emp-info">
            <div className="bul-emp-name">{employeeName}</div>
            <dl className="bul-emp-grid">
              <EmpRow label="Matricule" value={payslip.user.matricule ?? payslip.user.employeeId} />
              <EmpRow label="Situation familiale" value={payslip.user.familyStatus} />
              <EmpRow label="Fonction" value={payslip.user.position} />
              <EmpRow label="N° CNPS" value={payslip.user.cnpsNumber} mono />
              <EmpRow label="Département" value={payslip.user.department} />
              <EmpRow label="N° Carte CNPS" value={payslip.user.cnpsCardNumber} mono />
              <EmpRow label="Date d'embauche" value={payslip.user.hireDate ? formatDate(payslip.user.hireDate, "dd/MM/yyyy") : null} />
              <EmpRow label="N° Contribuable" value={payslip.user.niu} mono />
              <EmpRow label="Statut" value={payslip.user.contractType === "CDI" ? "Permanent" : payslip.user.contractType} />
              <EmpRow
                label="Échelon / Classe"
                value={[payslip.user.echelon, payslip.user.classCategory].filter(Boolean).join(" / ") || null}
              />
              <EmpRow label="" value="" />
              <EmpRow
                label="Indice / Coefficient"
                value={
                  payslip.user.indiceSalarial !== null || payslip.user.coefficientSalarial !== null
                    ? `${payslip.user.indiceSalarial ?? "—"} / ${payslip.user.coefficientSalarial?.toFixed(2).replace(".", ",") ?? "—"}`
                    : null
                }
              />
            </dl>
          </div>
        </div>

        {/* Récapitulatif + KPIs (droite) */}
        <div className="bul-recap-wrap">
          <div className="bul-recap-band">RÉCAPITULATIF</div>
          <div className="bul-recap-body">
            <div className="bul-recap-rows">
              <RecapRow label="Salaire de base" value={fmtFCFA(baseSalary)} unit="FCFA" />
              <RecapRow label="Total gains" value={fmtFCFA(totalGains.toString())} unit="FCFA" />
              <RecapRow label="Total retenues" value={fmtFCFA(totalDeductions.toString())} unit="FCFA" negative />
              <RecapRow label="Net imposable" value={fmtFCFA(payslip.taxableGross)} unit="FCFA" />
            </div>
            <div className="bul-kpis">
              <KpiCard color="emerald" icon={<Wallet className="h-4 w-4" />} label="Net à payer" value={`${fmtFCFA(payslip.netAmount)} FCFA`} />
              <KpiCard color="violet" icon={<Users className="h-4 w-4" />} label="Charges patronales" value={`${fmtFCFA(totalEmployer.toString())} FCFA`} />
              <KpiCard color="amber" icon={<Coins className="h-4 w-4" />} label="Coût total employeur" value={`${fmtFCFA(totalCoutEmployeur.toString())} FCFA`} />
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ 4 COLONNES PRINCIPALES ═════════════ */}
      <section className="bul-cols">
        <Column band="violet" title="1. GAINS" totalLabel="TOTAL DES GAINS" totalValue={fmtFCFA(totalGains.toString())}>
          <ColHead />
          <Lines lines={gains} mode="plus" startIndex={0} />
        </Column>

        <Column band="rose" title="2. RETENUES SALARIALES" totalLabel="TOTAL DES RETENUES" totalValue={fmtFCFA(totalDeductions.toString())}>
          <ColHead />
          <SubHead color="rose">A. ORGANISMES SOCIAUX</SubHead>
          <Lines lines={dedSocial} mode="minus" startIndex={0} />
          <SubTotal label="Sous-total Organismes Sociaux" value={fmtFCFA(totalDedSocial.toString())} />
          <SubHead color="rose">B. PRÉLÈVEMENTS FISCAUX</SubHead>
          <Lines lines={dedFiscal} mode="minus" startIndex={0} />
          <SubTotal label="Sous-total Prélèvements Fiscaux" value={fmtFCFA(totalDedFiscal.toString())} />
          <SubHead color="rose">C. AUTRES RETENUES</SubHead>
          <Lines lines={dedOther} mode="minus" startIndex={0} />
          <SubTotal label="Sous-total Autres Retenues" value={fmtFCFA(totalDedOther.toString())} />
        </Column>

        <Column band="sky" title="3. CHARGES PATRONALES" totalLabel="TOTAL DES CHARGES PATRONALES" totalValue={fmtFCFA(totalEmployer.toString())}>
          <ColHead />
          <SubHead color="sky">A. ORGANISMES SOCIAUX</SubHead>
          <Lines lines={empSocial} mode="employer" startIndex={0} />
          <SubTotal label="Sous-total Organismes Sociaux" value={fmtFCFA(totalEmpSocial.toString())} />
          <SubHead color="sky">B. AUTRES CHARGES</SubHead>
          <Lines lines={empOther} mode="employer" startIndex={0} />
          <SubTotal label="Sous-total Autres Charges" value={fmtFCFA(totalEmpOther.toString())} />
        </Column>

        {/* Colonne 4 : SYNTHÈSE — sans tableau de header, juste des rows */}
        <div className="bul-col bul-col-synth">
          <div className="bul-col-band bul-band-amber">4. SYNTHÈSE</div>
          <div className="bul-synth-body">
            <div className="bul-synth-row">
              <span>Total des gains</span>
              <span className="bul-num">{fmtFCFA(totalGains.toString())}</span>
            </div>
            <div className="bul-synth-row">
              <span>Total des retenues</span>
              <span className="bul-num bul-neg">- {fmtFCFA(totalDeductions.toString())}</span>
            </div>
            <div className="bul-synth-row bul-synth-strong">
              <span>Net imposable</span>
              <span className="bul-num">{fmtFCFA(payslip.taxableGross)}</span>
            </div>
            <div className="bul-synth-row">
              <span>IRPP dû</span>
              <span className="bul-num bul-neg">- {fmtFCFA(payslip.irppAmount)}</span>
            </div>
          </div>
          <div className="bul-net-box">
            <div className="bul-net-lbl">NET À PAYER</div>
            <div className="bul-net-val">{fmtFCFA(payslip.netAmount)} FCFA</div>
          </div>
          <div className="bul-words-box">
            <div className="bul-words-lbl">EN TOUTES LETTRES</div>
            <div className="bul-words-txt">{payslip.netInWords}</div>
          </div>
        </div>
      </section>

      {/* ═════════════ PIED ═════════════ */}
      <footer className="bul-foot">
        {/* Cumuls annuels */}
        <div className="bul-foot-block bul-foot-cumul">
          <div className="bul-foot-title">
            CUMULS ANNUELS (DU 01/01/{period.getFullYear()} AU {formatDate(periodTo, "dd/MM/yyyy")})
          </div>
          <table className="bul-cumul-table">
            <thead>
              <tr>
                <th>ÉLÉMENTS</th>
                <th className="num">CUMUL IMPOSABLE</th>
                <th className="num">CUMUL RETENUES</th>
                <th className="num">CUMUL NET</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salaires</td>
                <td className="num">{fmtFCFA(payslip.cumul.salary)}</td>
                <td className="num">—</td>
                <td className="num">{fmtFCFA(payslip.cumul.salary)}</td>
              </tr>
              <tr>
                <td>Primes &amp; Indemnités</td>
                <td className="num">{fmtFCFA(payslip.cumul.bonuses)}</td>
                <td className="num">—</td>
                <td className="num">{fmtFCFA(payslip.cumul.bonuses)}</td>
              </tr>
              <tr>
                <td>Heures supplémentaires</td>
                <td className="num">{fmtFCFA(payslip.cumul.overtime)}</td>
                <td className="num">—</td>
                <td className="num">{fmtFCFA(payslip.cumul.overtime)}</td>
              </tr>
              <tr className="bul-cumul-total">
                <td>Total</td>
                <td className="num">{fmtFCFA(payslip.cumul.taxable)}</td>
                <td className="num bul-neg">- {fmtFCFA(payslip.cumul.deductions)}</td>
                <td className="num">{fmtFCFA(payslip.cumul.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bul-foot-block">
          <div className="bul-foot-title">CONGÉS PAYÉS</div>
          <dl className="bul-mini">
            <MiniRow label="Acquis" value={`${payslip.leave.acquired.toFixed(2).replace(".", ",")} jours`} />
            <MiniRow label="Pris" value={`${payslip.leave.taken.toFixed(2).replace(".", ",")} jours`} />
            <MiniRow label="Solde" value={`${payslip.leave.remaining.toFixed(2).replace(".", ",")} jours`} strong />
          </dl>
        </div>

        <div className="bul-foot-block">
          <div className="bul-foot-title">ABSENCES</div>
          <dl className="bul-mini">
            <MiniRow
              label="Absences injustifiées"
              value={`${payslip.leave.unjustifiedAbsenceDays.toFixed(2).replace(".", ",")} jour${payslip.leave.unjustifiedAbsenceDays > 1 ? "s" : ""}`}
            />
            <MiniRow label="Retards" value={`${payslip.leave.delayHours.toFixed(2).replace(".", ",")} heures`} />
          </dl>
        </div>

        <div className="bul-foot-block">
          <div className="bul-foot-title">INFORMATIONS COMPLÉMENTAIRES</div>
          <dl className="bul-mini">
            <MiniRow label="Salaire de base" value={`${fmtFCFA(baseSalary)} FCFA`} />
            <MiniRow label="Taux horaire" value={hourlyRate(baseSalary, payslip.reportedHours)} />
            <MiniRow label="Nombre d'heures travaillées" value={`${payslip.reportedHours.toFixed(0)} h`} />
            <MiniRow label="Nombre d'heures supplémentaires" value={`${overtimeHours.toFixed(0)} h`} />
          </dl>
        </div>

        <div className="bul-foot-block bul-foot-auth">
          <div className="bul-foot-title">AUTHENTIFICATION</div>
          <div className="bul-auth-meta">
            Bulletin généré le {payslip.issuedAt ? formatDate(payslip.issuedAt, "dd/MM/yyyy 'à' HH:mm") : formatDate(payslip.paymentDate, "dd/MM/yyyy")}
            <br />
            par Système T-ERP
            {payslip.generatedIp && <><br />IP : <span className="bul-mono">{payslip.generatedIp}</span></>}
            <br />
            Hash : <span className="bul-mono">{authHash}</span>
          </div>
          <div className="bul-sig-row">
            <div className="bul-sig">
              {payslip.tenant.signatureImageUrl ? (
                <Image src={payslip.tenant.signatureImageUrl} alt="" width={140} height={48} className="bul-sig-img" unoptimized />
              ) : (
                <div className="bul-sig-placeholder">— signature —</div>
              )}
              <div className="bul-sig-name">{payslip.tenant.drhSignatoryName ?? "Responsable Paie"}</div>
            </div>
            {payslip.tenant.stampImageUrl && (
              <Image src={payslip.tenant.stampImageUrl} alt="" width={88} height={88} className="bul-stamp" unoptimized />
            )}
          </div>
        </div>
      </footer>

      {/* ═════════════ Footer strip ═════════════ */}
      <div className="bul-strip">
        <span className="bul-strip-l">
          <Lock className="h-3 w-3" /> Document électronique sécurisé · Ce bulletin est authentifié et traçable ·
          Vérifiez l&apos;authenticité sur <span className="bul-mono">{verifUrlShort}</span>
        </span>
        <span className="bul-strip-r">T-ERP BTP &amp; SERVICES — Solution de gestion intégrée pour les entreprises du BTP</span>
      </div>
    </div>
  );
}

// ════════════ Sous-composants ════════════

function CoordRow({ icon, label, value, bold }: { icon?: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="bul-coord-row">
      {icon}
      <dt>{label} :</dt>
      <dd className={bold ? "bul-mono" : undefined}>{value}</dd>
    </div>
  );
}

function EmpRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="bul-emp-row">
      <dt>{label}</dt>
      <dd className={mono ? "bul-mono" : undefined}>
        {value === "" ? <span className="bul-emp-sep">:</span> : (
          <>
            <span className="bul-emp-sep">:</span> {value || (label ? "—" : "")}
          </>
        )}
      </dd>
    </div>
  );
}

function RecapRow({ label, value, unit, negative }: { label: string; value: string; unit?: string; negative?: boolean }) {
  return (
    <div className="bul-recap-row">
      <span className={negative ? "bul-recap-lbl bul-neg" : "bul-recap-lbl"}>{label}</span>
      <span className={negative ? "bul-recap-val bul-neg" : "bul-recap-val"}>
        {value !== "—" ? value : value} {unit && value !== "—" ? unit : ""}
      </span>
    </div>
  );
}

function KpiCard({ color, icon, label, value }: { color: "emerald" | "violet" | "amber"; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`bul-kpi bul-kpi-${color}`}>
      <span className="bul-kpi-icn">{icon}</span>
      <div className="bul-kpi-body">
        <div className="bul-kpi-lbl">{label}</div>
        <div className="bul-kpi-val">{value}</div>
      </div>
    </div>
  );
}

function Column({
  band, title, totalLabel, totalValue, children,
}: { band: "violet" | "rose" | "sky"; title: string; totalLabel: string; totalValue: string; children: React.ReactNode }) {
  return (
    <div className="bul-col">
      <div className={`bul-col-band bul-band-${band}`}>{title}</div>
      <div className="bul-col-content">{children}</div>
      <div className={`bul-col-total bul-total-${band}`}>
        <span>{totalLabel}</span>
        <span className="bul-num">{totalValue}</span>
      </div>
    </div>
  );
}

function ColHead() {
  return (
    <div className="bul-col-head">
      <span className="bul-c-code">CODE</span>
      <span className="bul-c-lbl">DÉSIGNATION</span>
      <span className="bul-c-base num">BASE</span>
      <span className="bul-c-rate num">TAUX</span>
      <span className="bul-c-amt num">MONTANT (FCFA)</span>
    </div>
  );
}

function Lines({ lines, mode, startIndex }: { lines: PayslipLine[]; mode: "plus" | "minus" | "employer"; startIndex: number }) {
  if (lines.length === 0) return <div className="bul-empty-line">— Aucune ligne —</div>;
  return (
    <>
      {lines.map((l, i) => {
        const amount =
          mode === "plus" ? l.amountPlus :
          mode === "minus" ? l.amountMinus :
          l.employerAmount;
        return (
          <div key={l.id} className="bul-line">
            <span className="bul-c-code bul-mono">{displayCode(l.category, startIndex + i + 1)}</span>
            <span className="bul-c-lbl">{l.label}</span>
            <span className="bul-c-base num">{fmtFCFA(l.base)}</span>
            <span className="bul-c-rate num">{fmtRate(l.rate)}</span>
            <span className="bul-c-amt num bul-line-amt">{fmtFCFA(amount)}</span>
          </div>
        );
      })}
    </>
  );
}

function SubHead({ color, children }: { color: "rose" | "sky"; children: React.ReactNode }) {
  return <div className={`bul-subhead bul-subhead-${color}`}>{children}</div>;
}

function SubTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="bul-subtotal">
      <span>{label}</span>
      <span className="bul-num">{value}</span>
    </div>
  );
}

function MiniRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bul-mini-row">
      <dt>{label}</dt>
      <dd className={strong ? "bul-mini-strong" : undefined}>{value}</dd>
    </div>
  );
}

function QrPattern() {
  // Pattern QR factice quand on n'a pas un QR de service ; reproduit la grille
  // noire/blanche visuelle de la maquette. Le vrai QR est servi par /api/.../pdf.
  return (
    <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden>
      <rect width="84" height="84" fill="#fff" />
      {/* Corners */}
      <rect x="4" y="4" width="20" height="20" fill="#000" />
      <rect x="8" y="8" width="12" height="12" fill="#fff" />
      <rect x="12" y="12" width="4" height="4" fill="#000" />
      <rect x="60" y="4" width="20" height="20" fill="#000" />
      <rect x="64" y="8" width="12" height="12" fill="#fff" />
      <rect x="68" y="12" width="4" height="4" fill="#000" />
      <rect x="4" y="60" width="20" height="20" fill="#000" />
      <rect x="8" y="64" width="12" height="12" fill="#fff" />
      <rect x="12" y="68" width="4" height="4" fill="#000" />
      {/* Random data pattern */}
      {Array.from({ length: 64 }).map((_, i) => {
        const x = 26 + (i % 8) * 4;
        const y = 26 + Math.floor(i / 8) * 4;
        const filled = (i * 31 + 7) % 5 < 3;
        if (!filled) return null;
        return <rect key={i} x={x} y={y} width="3.5" height="3.5" fill="#000" />;
      })}
    </svg>
  );
}

// ════════════ Helpers ════════════

function sumLines(lines: PayslipLine[], field: "amountPlus" | "amountMinus" | "employerAmount"): bigint {
  return lines.reduce<bigint>((sum, l) => {
    const v = l[field];
    if (!v) return sum;
    try { return sum + BigInt(v); } catch { return sum; }
  }, 0n);
}

function hourlyRate(baseSalary: string | null, reportedHours: number): string {
  if (!baseSalary || reportedHours === 0) return "—";
  const rate = Number(baseSalary) / reportedHours;
  return `${fmtFCFA(Math.round(rate))} FCFA`;
}
