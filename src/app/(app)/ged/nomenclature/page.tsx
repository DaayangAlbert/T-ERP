"use client";

import { useState } from "react";
import { Tags, Download, Plus, X, Save, Shield, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";
import {
  useGedClassifications,
  useCreateClassification,
  type ClassificationCategoryCode,
  type ClassificationRow,
  type ClassificationConfidentiality,
} from "@/hooks/useGedClassifications";
import { ClassificationDetailDrawer } from "@/components/ged/nomenclature/ClassificationDetailDrawer";

type Tab = "ALL" | ClassificationCategoryCode;

const TABS: { code: Tab; label: string }[] = [
  { code: "ALL", label: "Tous" },
  { code: "MARKETS", label: "Marchés" },
  { code: "TECHNICAL", label: "Techniques" },
  { code: "HR", label: "RH" },
  { code: "ACCOUNTING", label: "Comptables" },
  { code: "LEGAL", label: "Juridiques" },
  { code: "QSE", label: "QSE" },
];

const CONF_COLOR: Record<ClassificationConfidentiality, string> = {
  PUBLIC: "bg-emerald-100 text-emerald-800",
  INTERNAL: "bg-blue-100 text-blue-800",
  RESTRICTED: "bg-amber-100 text-amber-800",
  CONFIDENTIAL: "bg-rose-100 text-rose-800",
};

const CONF_LABEL: Record<ClassificationConfidentiality, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  RESTRICTED: "Restreint",
  CONFIDENTIAL: "Confidentiel",
};

export default function GedNomenclaturePage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ARCHIVIST" || user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";

  const [tab, setTab] = useState<Tab>("ALL");
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useGedClassifications(tab);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-3">
        <div className="h-20 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-12 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const groupedByCategory = data.items.reduce<Record<string, ClassificationRow[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Nomenclature documentaire</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data.totals.all} types · 6 catégories · politique de rétention SYSCOHADA + droit camerounais
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <a
            href="/api/ged/classifications/export"
            className="inline-flex h-11 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
          >
            <Download className="h-3.5 w-3.5" /> Exporter taxonomie
          </a>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="inline-flex h-11 items-center gap-1 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600"
            >
              <Plus className="h-3.5 w-3.5" /> Nouveau type
            </button>
          )}
        </div>
      </header>

      {/* Onglets — scroll horizontal mobile */}
      <div className="-mx-3 overflow-x-auto px-3">
        <div className="flex gap-1.5 whitespace-nowrap">
          {TABS.map((t) => {
            const count = t.code === "ALL" ? data.totals.all : data.totals.byCategory[t.code] ?? 0;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setTab(t.code)}
                className={clsx(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold",
                  tab === t.code ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line bg-white text-ink-3 hover:bg-surface-alt",
                )}
              >
                {t.label}
                <span className="rounded-full bg-white/60 px-1.5 text-[10.5px] font-bold text-ink">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tables par catégorie */}
      {Object.entries(groupedByCategory).map(([cat, rows]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            {data.categoryLabels[cat] ?? cat} ({rows.length})
          </h2>

          {/* Table desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left">Préfixe</th>
                  <th className="px-3 py-2 text-left">Type de document</th>
                  <th className="px-3 py-2 text-left">DUA</th>
                  <th className="px-3 py-2 text-left">Confidentialité</th>
                  <th className="px-3 py-2 text-left">Workflow</th>
                  <th className="px-3 py-2 text-right">Docs liés</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-surface-alt/40"
                    onClick={() => setOpenId(r.id)}
                  >
                    <td className="px-3 py-2 font-mono text-[12px] font-bold text-primary-700">{r.prefix}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{r.name}</div>
                      <div className="text-[10.5px] font-mono text-ink-3">{r.code}</div>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink">{r.dua}</td>
                    <td className="px-3 py-2">
                      <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", CONF_COLOR[r.confidentiality])}>
                        {CONF_LABEL[r.confidentiality]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11.5px] font-mono text-ink-3">{r.workflowCode ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-[12px] text-ink">{r.documentsCount}</td>
                    <td className="px-3 py-2 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-ink-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="w-full rounded-xl border border-line bg-white p-3 text-left hover:bg-surface-alt/40"
                >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-bold text-primary-700">{r.prefix}</div>
                    <div className="text-[13px] font-semibold text-ink">{r.name}</div>
                    <div className="text-[10.5px] font-mono text-ink-3">{r.code}</div>
                  </div>
                  <span className={clsx("flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", CONF_COLOR[r.confidentiality])}>
                    {CONF_LABEL[r.confidentiality]}
                  </span>
                </header>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-3">DUA</div>
                    <div className="font-semibold text-ink">{r.dua}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-3">Workflow</div>
                    <div className="font-mono text-ink">{r.workflowCode ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-3">
                  <Tags className="h-3 w-3" /> {r.documentsCount} documents liés
                </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Politique rappel */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
          <div className="text-[12px] text-blue-900">
            <strong>Politique de rétention (DUA)</strong> · combinée SYSCOHADA (10 ans pièces comptables), Code du travail (5 ans bulletins, +5 après départ), CNPS (30 ans cotisations), Fiscal DGI (10 ans déclarations), BTP (10 ans DOE, 30 ans ouvrages d&apos;art décennale).
          </div>
        </div>
      </section>

      {showNew && <NewClassificationDialog onClose={() => setShowNew(false)} />}

      <ClassificationDetailDrawer
        classificationId={openId}
        readOnly={!canEdit}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function NewClassificationDialog({ onClose }: { onClose: () => void }) {
  const [prefix, setPrefix] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClassificationCategoryCode>("TECHNICAL");
  const [dua, setDua] = useState("10 ans");
  const [duaYears, setDuaYears] = useState(10);
  const [confidentiality, setConfidentiality] = useState<ClassificationConfidentiality>("INTERNAL");
  const create = useCreateClassification();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Nouveau type documentaire</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-2.5">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Préfixe (3 lettres)</div>
            <input
              type="text"
              maxLength={3}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 font-mono text-[16px] uppercase"
              placeholder="PVE"
            />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Libellé</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
              placeholder="PV essai écobéton"
            />
          </label>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Catégorie</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ClassificationCategoryCode)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
            >
              <option value="MARKETS">Marchés</option>
              <option value="TECHNICAL">Techniques</option>
              <option value="HR">RH</option>
              <option value="ACCOUNTING">Comptables</option>
              <option value="LEGAL">Juridiques</option>
              <option value="QSE">QSE</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">DUA libellé</div>
              <input
                type="text"
                value={dua}
                onChange={(e) => setDua(e.target.value)}
                className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
              />
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Années</div>
              <input
                type="number"
                value={duaYears}
                onChange={(e) => setDuaYears(Number(e.target.value) || 0)}
                className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 font-mono text-[16px]"
              />
            </label>
          </div>
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Confidentialité</div>
            <select
              value={confidentiality}
              onChange={(e) => setConfidentiality(e.target.value as ClassificationConfidentiality)}
              className="mt-1 h-12 w-full rounded-md border border-line bg-white px-3 text-[14px]"
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Interne</option>
              <option value="RESTRICTED">Restreint</option>
              <option value="CONFIDENTIAL">Confidentiel</option>
            </select>
          </label>
          {create.isError && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {(create.error as Error).message}
            </div>
          )}
          <button
            type="button"
            disabled={create.isPending || !prefix.trim() || !name.trim()}
            onClick={() =>
              create.mutate(
                {
                  prefix: prefix.trim(),
                  code: name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
                  name: name.trim(),
                  category,
                  dua,
                  duaYears,
                  confidentiality,
                },
                { onSuccess: onClose },
              )
            }
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-[14px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {create.isPending ? "Création..." : "Ajouter à la nomenclature"}
          </button>
        </div>
      </div>
    </div>
  );
}
