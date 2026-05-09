"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SuccessionOrgChart } from "@/components/hr/SuccessionOrgChart";

export default function SuccessionPage() {
  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link
          href="/rh"
          className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour RH
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">Plan de succession</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Organigramme stratégique des postes clés et de leurs successeurs identifiés.
        </p>
      </header>

      <SuccessionOrgChart />
    </>
  );
}
