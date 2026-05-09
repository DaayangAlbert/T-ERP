"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AgendaCalendar } from "@/components/profile/AgendaCalendar";

export default function AgendaPage() {
  return (
    <>
      <header className="mb-5 border-b border-line pb-4">
        <Link href="/profil" className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour profil
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink">Mon agenda</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          RDV, conseils, audits et échéances de validation programmées.
        </p>
      </header>

      <AgendaCalendar />
    </>
  );
}
