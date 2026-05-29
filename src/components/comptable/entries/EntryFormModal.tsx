"use client";

import { useState } from "react";
import { Plus, Trash2, X, Paperclip, FileText, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useCreateEntry, type CptEntryLine } from "@/hooks/useCptEntries";
import { AccountPicker } from "@/components/comptable/entries/AccountPicker";

const MAX_ATTACHMENT_MB = 20;
const ALLOWED_EXT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx";

function fmtAttachmentSize(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} Mo`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} Ko`;
  return `${b} o`;
}
import {
  ENTRY_TEMPLATES,
  buildLinesFromTemplate,
  findTemplate,
  rebalanceSimple,
  rebalanceVte,
  VAT_RATE,
  type EntryTemplate,
  type TemplateKey,
} from "./entry-templates";

interface Props {
  open: boolean;
  onClose: () => void;
  journalCode: string;
  defaultSiteId?: string | null;
  isSiteAccountant: boolean;
  availableSites: Array<{ id: string; code: string; name: string }>;
}

const emptyLine = (): CptEntryLine => ({
  accountCode: "",
  description: "",
  debit: 0,
  credit: 0,
  siteId: null,
});

export function EntryFormModal({ open, onClose, journalCode, defaultSiteId, isSiteAccountant, availableSites }: Props) {
  // Le journal de la modale est celui du template sélectionné (sinon celui
  // initial passé par la page).
  const [templateKey, setTemplateKey] = useState<TemplateKey | "">("");
  const template = templateKey ? findTemplate(templateKey) : undefined;
  const activeJournal = template?.journalCode ?? journalCode;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState(defaultSiteId ?? "");
  const [lines, setLines] = useState<CptEntryLine[]>([emptyLine(), emptyLine()]);
  // Saisie centralisée pour les templates simples (équilibre auto)
  const [templateAmount, setTemplateAmount] = useState<number>(0);
  // Pièce jointe justificative (1 par écriture)
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const create = useCreateEntry();

  if (!open) return null;

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;
  // Champs obligatoires côté UI — évite l'erreur 400 du backend a posteriori.
  const filledLineCount = lines.filter((l) => l.accountCode.trim()).length;
  const missing: string[] = [];
  if (!reference.trim()) missing.push("Référence");
  if (!description.trim()) missing.push("Libellé");
  if (isSiteAccountant && !siteId) missing.push("Chantier");
  if (filledLineCount < 2) missing.push("au moins 2 lignes avec un compte");
  const canSubmit = balanced && missing.length === 0;

  const applyTemplate = (key: TemplateKey | "") => {
    setTemplateKey(key);
    setTemplateAmount(0);
    if (!key) {
      setLines([emptyLine(), emptyLine()]);
      setDescription("");
      return;
    }
    const t = findTemplate(key);
    if (!t) return;
    setLines(buildLinesFromTemplate(t, 0));
    if (t.description) setDescription(t.description);
  };

  const updateLine = (idx: number, patch: Partial<CptEntryLine>) => {
    setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const onTemplateAmountChange = (val: number) => {
    setTemplateAmount(val);
    if (!template) return;
    if (template.mode === "vte") {
      setLines(rebalanceVte(template, val));
    } else if (template.mode === "simple") {
      setLines(rebalanceSimple(template, lines, val));
    }
  };

  function onPickAttachment(file: File | null) {
    setAttachmentError(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1_000_000) {
      setAttachmentError(`Fichier trop volumineux (max ${MAX_ATTACHMENT_MB} Mo)`);
      return;
    }
    setAttachment(file);
  }

  async function submit(validate: boolean) {
    if (!balanced) return;
    try {
      await create.mutateAsync({
        journalCode: activeJournal,
        entryDate: new Date(date).toISOString(),
        reference,
        description,
        siteId: siteId || null,
        lines: lines.filter((l) => l.accountCode),
        validate,
        attachment,
      });
      onClose();
    } catch {
      // erreur gérée dans mutation.error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col rounded-t-xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line p-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Nouvelle écriture · {activeJournal}</h2>
            <p className="text-[11.5px] text-ink-3">
              {template ? template.hint : "Au moins 2 lignes, débit = crédit obligatoire."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-surface-alt">
            <X className="h-4 w-4 text-ink-3" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {/* Sélecteur de template */}
          <div className="mb-3">
            <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
              Type d&apos;opération
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ENTRY_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(templateKey === t.key ? "" : t.key)}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] transition",
                    templateKey === t.key
                      ? "border-primary-500 bg-primary-50 font-semibold text-primary-700"
                      : "border-line bg-white text-ink-2 hover:border-primary-300 hover:bg-surface-alt"
                  )}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Champ "Montant" centralisé quand un template avec saisie unique est actif */}
          {template && template.key !== "OD_LIBRE" && (
            <div className="mb-3 rounded-md border border-primary-200 bg-primary-50 p-3">
              <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-primary-700">
                {template.mode === "vte" ? "Montant HT (FCFA)" : "Montant (FCFA)"}
              </label>
              <input
                type="number"
                value={templateAmount || ""}
                onChange={(e) => onTemplateAmountChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="mt-1 h-10 w-full rounded-md border border-primary-200 bg-white px-2 text-[14px] font-mono tabular-nums outline-none focus:border-primary-500"
              />
              {template.mode === "vte" && templateAmount > 0 && (
                <div className="mt-1 text-[11.5px] text-primary-700">
                  TVA ({(VAT_RATE * 100).toFixed(2)} %) :{" "}
                  <strong>{Math.round(templateAmount * VAT_RATE).toLocaleString("fr-FR")} FCFA</strong> · TTC client :{" "}
                  <strong>
                    {(templateAmount + Math.round(templateAmount * VAT_RATE)).toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[12px] font-medium text-ink-2">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Référence
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="FA-2026-0042"
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Chantier (analytique)
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
                required={isSiteAccountant}
              >
                <option value="">{isSiteAccountant ? "— Obligatoire —" : "— Aucun (siège) —"}</option>
                {availableSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-[12px] font-medium text-ink-2">
            Libellé
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Facture PIWA n°FA-001 — ciment Pont Mfoundi"
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-primary-400"
            />
          </label>

          <div className="mt-3 space-y-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Lignes d&apos;écriture</h3>
            {/* Desktop */}
            <div className="hidden rounded-md border border-line md:block">
              <table className="w-full text-[12px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-2 py-1.5">Compte</th>
                    <th className="px-2 py-1.5">Libellé ligne</th>
                    <th className="px-2 py-1.5 text-right">Débit</th>
                    <th className="px-2 py-1.5 text-right">Crédit</th>
                    <th className="px-2 py-1.5">Chantier</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <LineRow
                      key={idx}
                      line={l}
                      template={template}
                      idx={idx}
                      availableSites={availableSites}
                      onChange={(patch) => updateLine(idx, patch)}
                      onRemove={
                        lines.length > 2
                          ? () => setLines((cur) => cur.filter((_, i) => i !== idx))
                          : undefined
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-2 md:hidden">
              {lines.map((l, idx) => (
                <LineCard
                  key={idx}
                  line={l}
                  template={template}
                  idx={idx}
                  availableSites={availableSites}
                  onChange={(patch) => updateLine(idx, patch)}
                />
              ))}
            </div>

            {!template && (
              <button
                type="button"
                onClick={() => setLines((cur) => [...cur, emptyLine()])}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink-3 hover:border-primary-300 hover:text-primary-700"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
              </button>
            )}
          </div>

          <div
            className={clsx(
              "mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-[12.5px] font-medium",
              balanced ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
            )}
          >
            <span>Total débit : {totalDebit.toLocaleString("fr-FR")} FCFA</span>
            <span>Total crédit : {totalCredit.toLocaleString("fr-FR")} FCFA</span>
            <span>{balanced ? "✓ Équilibré" : "✗ Non équilibré"}</span>
          </div>

          {/* Pièce jointe justificative — facture, reçu, photo, etc. */}
          <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/30 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-violet-700">
              <Paperclip className="h-3.5 w-3.5" /> Pièce justificative (recommandée)
            </div>
            {attachment ? (
              <div className="flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5">
                <FileText className="h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-ink">{attachment.name}</div>
                  <div className="text-[10.5px] text-ink-3">
                    {fmtAttachmentSize(attachment.size)} · {attachment.type || "type inconnu"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onPickAttachment(null)}
                  className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                  aria-label="Retirer le justificatif"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-white px-3 py-2 text-[12px] text-ink-3 hover:bg-surface-alt">
                <Paperclip className="h-4 w-4 text-violet-600" />
                <span className="flex-1">Joindre un justificatif (PDF, image, Word, Excel — max {MAX_ATTACHMENT_MB} Mo)</span>
                <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Choisir
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={ALLOWED_EXT}
                  onChange={(e) => onPickAttachment(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {attachmentError && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-700">
                <AlertTriangle className="h-3 w-3" /> {attachmentError}
              </div>
            )}
          </div>

          {!canSubmit && missing.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/5 p-2 text-[12px] text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Champs manquants : <strong>{missing.join(", ")}</strong></span>
            </div>
          )}
          {create.error && (
            <div className="mt-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-[12px] text-danger">
              {String((create.error as Error).message)}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-line p-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!canSubmit || create.isPending}
            title={!canSubmit && missing.length ? `Manque : ${missing.join(", ")}` : undefined}
            className="h-9 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 disabled:opacity-50"
          >
            Enregistrer en brouillard
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!canSubmit || create.isPending}
            title={!canSubmit && missing.length ? `Manque : ${missing.join(", ")}` : undefined}
            className="h-9 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Enregistrer et valider
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── Lignes ────────────────────────────────────────────────────────────

interface LineRowProps {
  line: CptEntryLine;
  template: EntryTemplate | undefined;
  idx: number;
  availableSites: Array<{ id: string; code: string; name: string }>;
  onChange: (patch: Partial<CptEntryLine>) => void;
  onRemove?: () => void;
}

function isLineLocked(template: EntryTemplate | undefined, idx: number): { account: boolean; amount: boolean } {
  if (!template || template.key === "OD_LIBRE") return { account: false, amount: false };
  // Template VTE : toutes les lignes sont calculées, on verrouille tout
  if (template.mode === "vte") return { account: true, amount: true };
  // Template simple : compte verrouillé, montant verrouillé sauf sur la ligne d'input (mais
  // la saisie passe par le champ central, donc on verrouille aussi pour éviter la confusion)
  return { account: true, amount: true };
}

function LineRow({ line, template, idx, availableSites, onChange, onRemove }: LineRowProps) {
  const locked = isLineLocked(template, idx);
  return (
    <tr className={clsx("border-b border-line", locked.account && "bg-primary-50/30")}>
      <td className="px-2 py-1">
        <AccountPicker
          value={line.accountCode}
          onChange={(code) => onChange({ accountCode: code })}
          disabled={locked.account}
          placeholder="601000"
          className="h-8 w-24 rounded border border-line px-1.5 text-[12px] outline-none focus:border-primary-400"
        />
      </td>
      <td className="px-2 py-1">
        <input
          value={line.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="h-8 w-full rounded border border-line px-1.5 text-[12px] outline-none focus:border-primary-400"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <input
          type="number"
          value={line.debit || ""}
          onChange={(e) => onChange({ debit: Number(e.target.value), credit: 0 })}
          disabled={locked.amount}
          className={clsx(
            "h-8 w-28 rounded border border-line px-1.5 text-right text-[12px] outline-none focus:border-primary-400",
            locked.amount && "bg-surface-alt text-ink-3"
          )}
        />
      </td>
      <td className="px-2 py-1 text-right">
        <input
          type="number"
          value={line.credit || ""}
          onChange={(e) => onChange({ credit: Number(e.target.value), debit: 0 })}
          disabled={locked.amount}
          className={clsx(
            "h-8 w-28 rounded border border-line px-1.5 text-right text-[12px] outline-none focus:border-primary-400",
            locked.amount && "bg-surface-alt text-ink-3"
          )}
        />
      </td>
      <td className="px-2 py-1">
        <select
          value={line.siteId ?? ""}
          onChange={(e) => onChange({ siteId: e.target.value || null })}
          className="h-8 w-32 rounded border border-line px-1 text-[12px] outline-none focus:border-primary-400"
        >
          <option value="">—</option>
          {availableSites.map((s) => (
            <option key={s.id} value={s.id}>{s.code}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1 text-right">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-ink-3 hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

function LineCard({ line, template, idx, availableSites, onChange }: LineRowProps) {
  const locked = isLineLocked(template, idx);
  return (
    <div className={clsx("rounded-md border border-line bg-white p-2", locked.account && "bg-primary-50/30")}>
      <div className="grid grid-cols-2 gap-1.5">
        <AccountPicker
          value={line.accountCode}
          onChange={(code) => onChange({ accountCode: code })}
          disabled={locked.account}
          placeholder="Compte"
          className="h-8 rounded border border-line px-1.5 text-[12px]"
        />
        <select
          value={line.siteId ?? ""}
          onChange={(e) => onChange({ siteId: e.target.value || null })}
          className="h-8 rounded border border-line px-1 text-[12px]"
        >
          <option value="">— Chantier —</option>
          {availableSites.map((s) => (
            <option key={s.id} value={s.id}>{s.code}</option>
          ))}
        </select>
        <input
          value={line.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Libellé"
          className="col-span-2 h-8 rounded border border-line px-1.5 text-[12px]"
        />
        <input
          type="number"
          value={line.debit || ""}
          onChange={(e) => onChange({ debit: Number(e.target.value), credit: 0 })}
          placeholder="Débit"
          disabled={locked.amount}
          className={clsx(
            "h-8 rounded border border-line px-1.5 text-right text-[12px]",
            locked.amount && "bg-surface-alt text-ink-3"
          )}
        />
        <input
          type="number"
          value={line.credit || ""}
          onChange={(e) => onChange({ credit: Number(e.target.value), debit: 0 })}
          placeholder="Crédit"
          disabled={locked.amount}
          className={clsx(
            "h-8 rounded border border-line px-1.5 text-right text-[12px]",
            locked.amount && "bg-surface-alt text-ink-3"
          )}
        />
      </div>
    </div>
  );
}
