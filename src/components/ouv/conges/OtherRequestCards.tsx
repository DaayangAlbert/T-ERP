"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Banknote, FileText } from "lucide-react";

interface Props {
  maxAdvanceXAF: number;
  hasOpenAdvance: boolean;
  hasOpenAttestation: boolean;
  onOpenAttestation: () => void;
}

// Section "Autres demandes" : 2 cards 72px côte-à-côte vertical : Avance + Attestation.
// La card avance pointe vers /ouv/paie (où vit le modal d'avance).
export function OtherRequestCards({ maxAdvanceXAF, hasOpenAdvance, hasOpenAttestation, onOpenAttestation }: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Autres demandes</h3>
      <div className="flex flex-col gap-2.5">
        <Link
          href={`/${tenantSlug}/ouv/paie`}
          className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 transition active:scale-[0.99]"
        >
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
            <Banknote className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold leading-tight text-slate-900">Demander une avance</p>
            <p className="truncate text-[12.5px] text-slate-500">
              {hasOpenAdvance
                ? "Une avance est déjà en cours"
                : maxAdvanceXAF > 0
                  ? `Max ${maxAdvanceXAF.toLocaleString("fr-FR")} FCFA disponible`
                  : "Plafond non calculé (aucun bulletin)"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={2} />
        </Link>

        <button
          type="button"
          onClick={onOpenAttestation}
          className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 text-left transition active:scale-[0.99]"
        >
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <FileText className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold leading-tight text-slate-900">Demander attestation</p>
            <p className="truncate text-[12.5px] text-slate-500">
              {hasOpenAttestation
                ? "Une attestation est en cours de préparation"
                : "Salaire, travail, présence, congé pris..."}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
