"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { useCreateSiteDecision, useSiteDecisions } from "@/hooks/useSites";
import { formatDate } from "@/lib/format";

interface Props {
  siteId: string;
}

export function DgDecisionForm({ siteId }: Props) {
  const { data, isLoading } = useSiteDecisions(siteId);
  const create = useCreateSiteDecision(siteId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3 || body.trim().length < 5) {
      setError("Titre (3 car. min) et description (5 car. min) requis.");
      return;
    }
    try {
      await create.mutateAsync({ title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
          Saisir une décision DG
        </h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre court (ex: Renforcer l'équipe coffrage)"
          className="mb-2 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Contexte, action attendue, échéance, qui fait quoi…"
          className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-300 focus:outline-none"
        />
        {error && <p className="mt-2 text-[12.5px] text-rose-700">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[12.5px] text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Décision enregistrée
            </span>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {create.isPending ? "Enregistrement…" : "Enregistrer la décision"}
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Historique des décisions
        </h3>
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-surface-alt" />
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center text-[12.5px] text-ink-3">
            Aucune décision DG enregistrée pour ce chantier.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.items.map((d) => (
              <li key={d.id} className="rounded-lg border border-line bg-white p-3 shadow-card">
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink">{d.title}</span>
                      <span className="text-[10.5px] text-ink-3">{formatDate(d.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-2">{d.body}</p>
                    <div className="mt-1 text-[10.5px] text-ink-3">
                      {d.author.name} {d.author.role && <span className="ml-1">({d.author.role})</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
