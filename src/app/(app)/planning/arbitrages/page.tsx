"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArbitrationsTable } from "@/components/planning/ArbitrationsTable";

export default function ArbitragesPage() {
  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link
          href="/planning"
          className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour planning
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">Arbitrages DG</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Conflits ressources et décisions stratégiques nécessitant votre validation.
        </p>
      </header>

      <ArbitrationsTable />
    </>
  );
}
