"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Wallet, FileText, Wrench, Globe } from "lucide-react";
import {
  type DocumentItem,
  documentEmoji,
  type DocumentType,
} from "@/hooks/useOuvDocuments";

interface Props {
  documents: DocumentItem[];
  countAttestations: number;
  countPayslips: number;
  preferredLanguage: string;
}

// Section "🛠 Outils et documents" : raccourcis vers EPI/outils, documents
// personnels, langue de l'app.
export function ProfileDocuments({ documents, countAttestations, countPayslips, preferredLanguage }: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const lang = preferredLanguage === "en-CM" ? "English" : "Français";

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">🛠 Outils et documents</h3>

      <Link
        href={`/${tenantSlug}/ouv/outils`}
        className="mb-2.5 flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 active:bg-purple-50/50"
      >
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
          <Wrench className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Mes EPI et outils</p>
          <p className="text-[12px] text-slate-500">5 EPI · outils sortis</p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </Link>

      <Link
        href={`/${tenantSlug}/ouv/paie`}
        className="mb-2.5 flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 active:bg-purple-50/50"
      >
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Mes bulletins de paie</p>
          <p className="text-[12px] text-slate-500">
            {countPayslips} bulletin{countPayslips > 1 ? "s" : ""} archivé{countPayslips > 1 ? "s" : ""}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </Link>

      <Link
        href={`/${tenantSlug}/ouv/conges`}
        className="mb-2.5 flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 active:bg-purple-50/50"
      >
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Mes attestations</p>
          <p className="text-[12px] text-slate-500">
            {countAttestations} disponible{countAttestations > 1 ? "s" : ""} · demande RH dans Mes congés
          </p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </Link>

      {documents.length > 0 && (
        <div className="mb-2.5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Documents officiels
          </div>
          {documents.slice(0, 5).map((d, idx) => (
            <a
              key={d.id}
              href={d.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-[56px] items-center gap-3 px-4 py-3 ${
                idx < documents.length - 1 && idx < 4 ? "border-b border-slate-100" : ""
              }`}
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-slate-100 text-[18px]">
                {documentEmoji(d.type as DocumentType)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-slate-900">{d.title}</p>
                <p className="truncate text-[11px] text-slate-500">{d.typeLabel}</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
            </a>
          ))}
        </div>
      )}

      <div className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Langue de l'app</p>
          <p className="text-[12px] text-slate-500">{lang}</p>
        </div>
      </div>
    </section>
  );
}
