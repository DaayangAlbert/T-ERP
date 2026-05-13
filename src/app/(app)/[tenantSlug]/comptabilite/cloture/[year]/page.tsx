"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnnualClosureWizard } from "@/components/accounting/AnnualClosureWizard";

interface Props {
  params: { year: string };
}

export default function ClotureAnnualPage({ params }: Props) {
  const year = parseInt(params.year, 10);

  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link
          href="/comptabilite"
          className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour comptabilité
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Clôture annuelle — Exercice {year}
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Validation des comptes annuels avant Assemblée Générale et transmission DGI.
        </p>
      </header>

      <AnnualClosureWizard year={year} />
    </>
  );
}
