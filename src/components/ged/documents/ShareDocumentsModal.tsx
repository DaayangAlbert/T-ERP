"use client";

import { useMemo, useState } from "react";
import { Send, Search, X, Check, FileText, Loader2, Users } from "lucide-react";
import { clsx } from "clsx";
import { useMessagingContacts } from "@/hooks/useMessaging";
import type { GedDocument } from "@/hooks/useGedDocuments";

interface Props {
  documents: GedDocument[];
  onClose: () => void;
  onShared: (info: { recipients: number; messagesCreated: number }) => void;
}

const ROLE_LABEL: Record<string, string> = {
  DG: "Directeur Général",
  DAF: "DAF",
  HR: "RH",
  TECH_DIRECTOR: "Directeur Technique",
  WORKS_DIRECTOR: "Directeur Travaux",
  WORKS_MANAGER: "Conducteur Travaux",
  SITE_MANAGER: "Chef de Chantier",
  ACCOUNTANT: "Comptable",
  LOGISTICS: "Logisticien",
  WAREHOUSE: "Magasinier",
  ARCHIVIST: "Archiviste",
  SECRETARY_GENERAL: "Secrétaire Général",
  QHSE_MANAGER: "Responsable QHSE",
  PURCHASING_OFFICER: "Achats",
  TENANT_ADMIN: "Administrateur IT",
  OWNER: "Propriétaire / PCA",
  EMPLOYEE: "Employé",
  WORKER: "Ouvrier",
};

export function ShareDocumentsModal({ documents, onClose, onShared }: Props) {
  const contactsQ = useMessagingContacts();
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const items = contactsQ.data?.items ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((c) => {
      const full = `${c.firstName} ${c.lastName}`.toLowerCase();
      const role = (ROLE_LABEL[c.role] ?? c.role).toLowerCase();
      return (
        full.includes(query) ||
        role.includes(query) ||
        (c.position?.toLowerCase().includes(query) ?? false) ||
        (c.department?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [contactsQ.data, q]);

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selectedRecipients.size === 0 || documents.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ged/documents/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          documentIds: documents.map((d) => d.id),
          recipientUserIds: Array.from(selectedRecipients),
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        recipients: number;
        messagesCreated: number;
        skippedRecipients?: number;
      };
      onShared({ recipients: data.recipients, messagesCreated: data.messagesCreated });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Échec du partage");
      setSubmitting(false);
    }
  }

  const canSubmit = selectedRecipients.size > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-violet-600" />
            <h2 className="text-[14px] font-bold text-ink">
              Partager via la messagerie
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          {/* Colonne docs sélectionnés */}
          <section className="flex min-h-0 flex-col rounded-lg border border-line bg-surface-alt/40">
            <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {documents.length} document{documents.length > 1 ? "s" : ""} à partager
            </div>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto px-3 py-2 text-[12.5px]">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <span className="min-w-0 truncate text-ink" title={d.name}>
                    {d.internalReference ? (
                      <span className="font-mono text-[10.5px] text-violet-700">
                        {d.internalReference}{" "}
                      </span>
                    ) : null}
                    {d.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Colonne destinataires sélectionnés (lecture rapide) */}
          <section className="flex min-h-0 flex-col rounded-lg border border-line bg-surface-alt/40">
            <div className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {selectedRecipients.size} destinataire{selectedRecipients.size > 1 ? "s" : ""}
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto px-3 py-2 text-[12.5px]">
              {selectedRecipients.size === 0 && (
                <li className="text-ink-3">Sélectionnez au moins une personne ci-dessous.</li>
              )}
              {Array.from(selectedRecipients).map((id) => {
                const c = contactsQ.data?.items.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <li key={id} className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                    <span className="min-w-0 truncate text-ink">
                      {c.firstName} {c.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRecipient(id)}
                      className="ml-auto text-ink-3 hover:text-rose-600"
                      aria-label={`Retirer ${c.firstName}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Recherche + liste contacts */}
        <div className="border-t border-line px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un contact (nom, rôle, fonction…)"
              className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line">
            {contactsQ.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-[12.5px] text-ink-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des contacts…
              </div>
            ) : filteredContacts.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">
                Aucun contact ne correspond à votre recherche.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {filteredContacts.map((c) => {
                  const checked = selectedRecipients.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleRecipient(c.id)}
                        className={clsx(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition",
                          checked ? "bg-violet-50 hover:bg-violet-100" : "hover:bg-surface-alt",
                        )}
                      >
                        <span
                          className={clsx(
                            "grid h-5 w-5 shrink-0 place-items-center rounded border",
                            checked
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-line bg-white",
                          )}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-ink">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="truncate text-[11px] text-ink-3">
                            {ROLE_LABEL[c.role] ?? c.role}
                            {c.position ? ` · ${c.position}` : ""}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Message optionnel */}
        <div className="border-t border-line px-4 py-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Message d&apos;accompagnement (optionnel)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Ex : Documents pour la réunion COMEX de demain."
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-violet-400"
            />
          </label>
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {error}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-alt/30 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Envoyer
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
