"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, Check, Search, Users, X } from "lucide-react";
import type { Role } from "@prisma/client";
import {
  useMessagingContacts,
  useCreateConversation,
  type MessagingContact,
} from "@/hooks/useMessaging";

type Step = "pick-mode" | "pick-members" | "name-group";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
  /** If true, "Nouveau groupe" button is shown (cadres only — RBAC phase 2). */
  canCreateGroup?: boolean;
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
  DG: "Directeur Général",
  DAF: "Directeur Admin. & Financier",
  HR: "Responsable RH",
  SECRETARY_GENERAL: "Secrétaire Général",
  TECH_DIRECTOR: "Directeur Technique",
  WORKS_DIRECTOR: "Directeur Travaux",
  WORKS_MANAGER: "Conducteur Travaux",
  SITE_MANAGER: "Chef Chantier",
  ACCOUNTANT: "Comptable",
  LOGISTICS: "Logistique",
  WAREHOUSE: "Magasinier",
  ARCHIVIST: "Archiviste",
  EMPLOYEE: "Employé",
  WORKER: "Ouvrier",
  TENANT_ADMIN: "Administrateur",
};

const TONES = ["#2A1B3D", "#0F766E", "#9F580A", "#7C3AED", "#7C2D12", "#9333EA"];
function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return TONES[Math.abs(hash) % TONES.length];
}

export function NewChatModal({ open, onClose, onCreated, canCreateGroup = true }: Props) {
  const [step, setStep] = useState<Step>("pick-mode");
  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useMessagingContacts();
  const create = useCreateConversation();

  useEffect(() => {
    if (!open) {
      setStep("pick-mode");
      setMode("dm");
      setSearch("");
      setSelected(new Set());
      setGroupName("");
      setError(null);
    }
  }, [open]);

  const contacts = data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const full = `${c.firstName} ${c.lastName}`.toLowerCase();
      const reverse = `${c.lastName} ${c.firstName}`.toLowerCase();
      return (
        full.includes(q) ||
        reverse.includes(q) ||
        (c.position?.toLowerCase().includes(q) ?? false) ||
        (c.department?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [contacts, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "dm") {
        next.clear();
        next.add(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const handlePickMode = (m: "dm" | "group") => {
    setMode(m);
    setSelected(new Set());
    setStep("pick-members");
  };

  const handleNext = () => {
    if (selected.size === 0) {
      setError("Sélectionnez au moins une personne.");
      return;
    }
    setError(null);
    if (mode === "group") {
      if (selected.size < 2) {
        setError("Un groupe nécessite au moins 2 autres membres.");
        return;
      }
      setStep("name-group");
    } else {
      submit();
    }
  };

  const submit = async () => {
    setError(null);
    try {
      if (mode === "group" && groupName.trim().length < 2) {
        setError("Le nom du groupe est requis (2 caractères minimum).");
        return;
      }
      const res = await create.mutateAsync({
        isGroup: mode === "group",
        name: mode === "group" ? groupName.trim() : undefined,
        participantIds: Array.from(selected),
      });
      onCreated(res.id);
      onClose();
    } catch (e) {
      // Cas spécial 401 : message clair + suggestion de rechargement
      const raw = e instanceof Error ? e.message : "Création échouée";
      const status = (e as { status?: number })?.status;
      if (status === 401 || /non authentifi/i.test(raw)) {
        setError(
          "Votre session a expiré. Rechargez la page (Ctrl+R) pour vous reconnecter."
        );
      } else {
        setError(raw);
      }
    }
  };

  if (!open) return null;

  const selectedContacts = contacts.filter((c) => selected.has(c.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[640px] max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center gap-3 bg-primary-500 px-4 py-3 text-white">
          {step !== "pick-mode" ? (
            <button
              onClick={() =>
                setStep(step === "name-group" ? "pick-members" : "pick-mode")
              }
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-8 w-8" />
          )}
          <h2 className="flex-1 text-[15px] font-semibold">
            {step === "pick-mode" && "Nouvelle discussion"}
            {step === "pick-members" &&
              (mode === "group" ? "Ajouter des membres" : "Nouvelle discussion")}
            {step === "name-group" && "Détails du groupe"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {step === "pick-mode" && (
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => handlePickMode("dm")}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-surface-alt"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-600">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-ink">Nouvelle discussion</div>
                <div className="text-[12px] text-ink-3">
                  Échanger en privé avec un collaborateur
                </div>
              </div>
            </button>

            {canCreateGroup && (
              <button
                onClick={() => handlePickMode("group")}
                className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-surface-alt"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-ink">Nouveau groupe</div>
                  <div className="text-[12px] text-ink-3">
                    Créer un espace partagé avec plusieurs membres
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {step === "pick-members" && (
          <>
            <div className="border-b border-line p-3">
              <div className="flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3">
                <Search className="h-4 w-4 text-ink-3" />
                <input
                  autoFocus
                  type="search"
                  placeholder="Rechercher un contact…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
                />
              </div>
              {mode === "group" && selectedContacts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedContacts.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                    >
                      {c.firstName} {c.lastName}
                      <button
                        onClick={() => toggle(c.id)}
                        className="grid h-4 w-4 place-items-center rounded-full hover:bg-primary-100"
                        aria-label={`Retirer ${c.firstName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <ul className="divide-y divide-line">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-3">
                      <div className="h-9 w-9 animate-pulse rounded-full bg-surface-alt" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-alt" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-alt" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && filtered.length === 0 && (
                <p className="px-4 py-12 text-center text-sm text-ink-3">
                  Aucun contact trouvé.
                </p>
              )}
              <ul className="divide-y divide-line">
                {filtered.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    selected={selected.has(c.id)}
                    onToggle={() => toggle(c.id)}
                    multi={mode === "group"}
                  />
                ))}
              </ul>
            </div>

            {error && (
              <div className="border-t border-line bg-danger/5 px-4 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}
            <footer className="flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2.5">
              <span className="text-[12px] text-ink-3">
                {mode === "group"
                  ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
                  : "Cliquez sur un contact pour démarrer"}
              </span>
              <button
                onClick={handleNext}
                disabled={selected.size === 0 || create.isPending}
                className="rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === "group" ? "Suivant" : create.isPending ? "…" : "Démarrer"}
              </button>
            </footer>
          </>
        )}

        {step === "name-group" && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <label className="block text-[12px] font-medium text-ink-2">
                Nom du groupe
              </label>
              <input
                autoFocus
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex : Chantier Yaoundé Nord"
                maxLength={120}
                className="mt-1 w-full rounded-md border border-line bg-surface-alt px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-primary-400 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-ink-3">
                {groupName.length}/120 caractères
              </p>

              <div className="mt-4">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  Membres ({selectedContacts.length + 1})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2 text-[12.5px] text-ink">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                      M
                    </span>
                    Vous (créateur)
                  </li>
                  {selectedContacts.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                      <span
                        className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: avatarColor(c.id) }}
                      >
                        {c.firstName.charAt(0)}
                        {c.lastName.charAt(0)}
                      </span>
                      {c.firstName} {c.lastName}
                      <span className="text-[10.5px] text-ink-3">
                        {ROLE_LABELS[c.role] ?? c.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {error && (
              <div className="border-t border-line bg-danger/5 px-4 py-2 text-[12px] text-danger">
                {error}
              </div>
            )}
            <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-3 py-2.5">
              <button
                onClick={() => setStep("pick-members")}
                className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-alt"
              >
                Retour
              </button>
              <button
                onClick={submit}
                disabled={groupName.trim().length < 2 || create.isPending}
                className="rounded-md bg-primary-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {create.isPending ? "Création…" : "Créer le groupe"}
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  selected,
  onToggle,
  multi,
}: {
  contact: MessagingContact;
  selected: boolean;
  onToggle: () => void;
  multi: boolean;
}) {
  const tone = avatarColor(contact.id);
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
  const subtitle =
    contact.position ||
    ROLE_LABELS[contact.role] ||
    contact.role.toLowerCase().replace(/_/g, " ");

  return (
    <li>
      <button
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
          selected ? "bg-primary-50" : "hover:bg-surface-alt"
        )}
      >
        <div className="relative">
          <div
            className="grid h-10 w-10 place-items-center rounded-full text-[11.5px] font-semibold text-white"
            style={{ background: tone }}
          >
            {initials}
          </div>
          {multi && selected && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary-600 ring-2 ring-white">
              <Check className="h-2.5 w-2.5 text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
            {contact.firstName} {contact.lastName}
          </div>
          <div className="truncate text-[11.5px] text-ink-3">{subtitle}</div>
        </div>
        {!multi && contact.teamLeader && (
          <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary-700">
            Chef
          </span>
        )}
      </button>
    </li>
  );
}
