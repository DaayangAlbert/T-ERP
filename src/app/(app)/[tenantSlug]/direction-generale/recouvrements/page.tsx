"use client";

import { Receipt } from "lucide-react";
import { RecouvrementsReadOnlyView } from "@/components/daf/payment-circuits/RecouvrementsReadOnlyView";
import { PageHelp } from "@/components/help/PageHelp";
import { DgRecouvrementTutorial } from "@/components/help/tutorials/DgRecouvrementTutorial";

export default function DgRecouvrementsPage() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            <Receipt className="h-6 w-6 text-primary-600" /> Recouvrements en cours
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Supervision DG · vue lecture seule de tous les dossiers de recouvrement du groupe, avec
            le circuit administratif client et l&apos;avancement de chaque étape.
          </p>
        </div>
        <PageHelp title="Aide — Recouvrements DG"><DgRecouvrementTutorial /></PageHelp>
      </header>

      <RecouvrementsReadOnlyView readerLabel="Vue Direction Générale (supervision)" />
    </div>
  );
}
